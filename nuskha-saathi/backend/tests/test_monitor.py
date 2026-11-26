"""Private monitoring boundary and redaction, including handled clinical failures."""
import asyncio
from io import BytesIO
import json

import httpx
from fastapi.testclient import TestClient
from PIL import Image

from main import create_app
from services.local_store import LocalStore
from services.monitoring import stage
from services.vision_extractor import VisionExtractError

PASSWORD = 'test-only-monitor-password-2026'


def setup(monkeypatch, tmp_path, **kwargs):
    monkeypatch.setenv('ADMIN_MONITOR_PASSWORD', PASSWORD)
    app = create_app(store=LocalStore(tmp_path / 'monitor.sqlite'), strip_dir=tmp_path / 'strips', **kwargs)
    return app, TestClient(app)


def signin(client):
    return client.post('/admin/login', data={'password': PASSWORD}, follow_redirects=False)


def test_closed_without_password_and_unauthorized(monkeypatch, tmp_path):
    app, client = setup(monkeypatch, tmp_path)
    monkeypatch.delenv('ADMIN_MONITOR_PASSWORD')
    assert client.get('/admin/api/status').status_code == 401
    assert signin(client).status_code == 503
    assert 'Sign in' in client.get('/admin').text
    assert client.get('/admin/assets/panel.js').status_code == 200
    assert client.get('/admin/assets/secret').status_code == 404


def test_login_cookie_rotation_logout_and_origin(monkeypatch, tmp_path):
    app, client = setup(monkeypatch, tmp_path)
    assert client.post('/admin/login', data={'password': PASSWORD}, headers={'Origin': 'https://evil.example'}).status_code == 403
    assert client.get('/admin').headers['referrer-policy'] == 'same-origin'
    assert client.post('/admin/login', data={'password': PASSWORD}, headers={'Origin': 'null'}).status_code == 403
    response = client.post('/admin/login', data={'password': PASSWORD}, headers={'Origin': 'http://testserver'}, follow_redirects=False)
    assert response.status_code == 303
    cookie = response.headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'samesite=strict' in cookie and 'path=/admin' in cookie
    assert client.get('/admin/api/status').status_code == 200
    assert 'no-store' in client.get('/admin/api/status').headers['cache-control']
    assert 'Backend monitor' in client.get('/admin').text
    monkeypatch.setenv('ADMIN_MONITOR_PASSWORD', PASSWORD + '-rotated')
    assert client.get('/admin/api/status').status_code == 401
    monkeypatch.setenv('ADMIN_MONITOR_PASSWORD', PASSWORD)
    client.post('/admin/logout')
    assert client.get('/admin/api/status').status_code == 401
    https = TestClient(app, base_url='https://testserver')
    assert 'Secure' in signin(https).headers['set-cookie']


def test_rate_limit(monkeypatch, tmp_path):
    _, client = setup(monkeypatch, tmp_path)
    for _ in range(5):
        assert client.post('/admin/login', data={'password': 'wrong'}).status_code == 401
    assert signin(client).status_code == 429


def test_route_redaction_bounds_and_poll_exclusion(monkeypatch, tmp_path):
    app, client = setup(monkeypatch, tmp_path)
    signin(client)
    for _ in range(105):
        client.get('/api/v1/audio/private-patient-123?key=super-secret')
    client.get('/health')
    data = client.get('/admin/api/status').json()
    assert data['requests'] == 105
    assert data['http_failures'] == 105
    assert len(data['recent']) == 100
    serialized = json.dumps(data)
    assert 'private-patient' not in serialized and 'super-secret' not in serialized
    assert data['recent'][0]['route'] == '/api/v1/audio/{scan_id}'
    assert client.get('/admin/api/status').json()['requests'] == 105


def test_handled_vision_failure_visible_without_payload(monkeypatch, tmp_path):
    class BrokenVision:
        counts_as_live = False
        async def extract(self, *args):
            response = httpx.Response(403, request=httpx.Request('POST', 'https://provider.test/?key=secret'))
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise VisionExtractError('private patient text and key=secret') from exc
    app, client = setup(monkeypatch, tmp_path, extractor=BrokenVision())
    import routers.scan
    async def no_audio(_):
        return None
    monkeypatch.setattr(routers.scan, 'synthesize_urdu', no_audio)
    image = BytesIO()
    Image.new('RGB', (100, 100), 'white').save(image, 'JPEG')
    response = client.post('/api/v1/scan-parchi', files={'file': ('patient.jpg', image.getvalue(), 'image/jpeg')}, data={'patient_id': 'private-patient'})
    assert response.status_code == 200
    assert response.headers['x-request-id']
    signin(client)
    data = client.get('/admin/api/status').json()
    stages = data['recent'][0]['stages']
    assert any(s['name'] == 'gemini_extraction' and s['status'] == 'failed' and s['error'] == 'HTTP_403' for s in stages)
    assert any(s['name'] == 'clinical_outcome' and s['status'] == 'refused' for s in stages)
    serialized = json.dumps(data)
    assert 'private-patient' not in serialized and 'key=secret' not in serialized
    assert 'private patient text' not in serialized


def test_concurrent_stage_isolation_and_unhandled_failure(monkeypatch, tmp_path):
    app, _ = setup(monkeypatch, tmp_path)
    @app.get('/api/test/{kind}')
    async def route(kind: str):
        with stage('test_' + kind):
            await asyncio.sleep(.01)
            if kind == 'fail':
                raise ValueError('sensitive error')
        return {'ok': True}
    async def run():
        transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
        async with httpx.AsyncClient(transport=transport, base_url='http://testserver') as client:
            responses = await asyncio.gather(client.get('/api/test/pass'), client.get('/api/test/fail'))
            assert [r.status_code for r in responses] == [200, 500]
            assert all(r.headers.get('x-request-id') for r in responses)
    asyncio.run(run())
    traces = list(app.state.monitor.recent)
    assert len({r['id'] for r in traces}) == 2
    for trace in traces:
        names = [s['name'] for s in trace['stages']]
        assert not ('test_pass' in names and 'test_fail' in names)
    assert not app.state.monitor.active
    assert 'sensitive error' not in json.dumps(traces)


def test_openfda_handled_provider_failure_is_visible(monkeypatch, tmp_path):
    from services.openfda_client import OpenFdaClient
    from services.formulary_resolver import FormularyResolver
    async def denied(url):
        response = httpx.Response(403, request=httpx.Request('GET', url))
        response.raise_for_status()
    fda = OpenFdaClient.from_resolver(FormularyResolver.load(), fetcher=denied)
    app, client = setup(monkeypatch, tmp_path, fda=fda)
    @app.get('/api/test/fda')
    async def route():
        assert await fda._get_json('https://provider.test/?key=secret') is None
        return {'fallback': True}
    assert client.get('/api/test/fda').status_code == 200
    trace = app.state.monitor.recent[-1]
    assert trace['stages'][0]['status'] == 'failed'
    assert trace['stages'][0]['error'] == 'HTTP_403'
    assert 'secret' not in json.dumps(trace)
