"""Password-protected operational panel; no external monitoring credentials."""
import hashlib
import hmac
import os
from pathlib import Path
import secrets
from time import monotonic, perf_counter

from fastapi import Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from services.monitoring import Monitor, MonitoringMiddleware

ASSETS = Path(__file__).resolve().parents[1] / 'admin_assets'
COOKIE = 'nuskha_admin'
# The password lives only in the ADMIN_MONITOR_PASSWORD environment variable.
MIN_PASSWORD_LENGTH = 12


def install_monitor(app, health):
    monitor = Monitor()
    app.state.monitor = monitor
    app.add_middleware(MonitoringMiddleware, monitor=monitor)
    sessions, failures = {}, {}

    def config():
        password = os.getenv('ADMIN_MONITOR_PASSWORD', '')
        return password if len(password) >= MIN_PASSWORD_LENGTH else None

    def fingerprint(password):
        return hashlib.sha256(password.encode()).digest()

    def valid(request):
        password = config()
        session = sessions.get(request.cookies.get(COOKIE))
        return bool(password and session and session[0] > monotonic()
                    and hmac.compare_digest(session[1], fingerprint(password)))

    def secure(response):
        response.headers.update({'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
            'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"})
        return response

    def same_origin(request):
        origin = request.headers.get('origin')
        # Render's TLS proxy supplies the original host; only compare explicit browser Origin.
        return not origin or origin.rstrip('/') == str(request.base_url).rstrip('/')

    @app.get('/admin', include_in_schema=False)
    def panel(request: Request):
        return secure(FileResponse(ASSETS / ('panel.html' if valid(request) else 'login.html')))

    @app.get('/admin/assets/{name}', include_in_schema=False)
    def asset(name: str):
        if name not in {'panel.js', 'panel.css'}:
            return secure(JSONResponse({'error': 'Not found'}, status_code=404))
        return secure(FileResponse(ASSETS / name))

    @app.post('/admin/login', include_in_schema=False)
    async def login(request: Request):
        if not same_origin(request):
            return secure(JSONResponse({'error': 'Invalid origin'}, status_code=403))
        password = config()
        if not password:
            return secure(JSONResponse({'error': f'Set ADMIN_MONITOR_PASSWORD on the server to at least {MIN_PASSWORD_LENGTH} characters.'}, status_code=503))
        now = monotonic()
        for key, value in list(failures.items()):
            if value[1] <= now:
                failures.pop(key)
        # Hash client identifiers; never include them in diagnostics.
        client = hashlib.sha256((request.client.host if request.client else 'unknown').encode()).hexdigest()
        if failures.get(client, (0, 0))[0] >= 5 or len(failures) >= 1000:
            return secure(JSONResponse({'error': 'Too many attempts. Try again in 5 minutes.'}, status_code=429))
        body = b''
        async for chunk in request.stream():
            body += chunk
            if len(body) > 4096:
                return secure(JSONResponse({'error': 'Invalid login'}, status_code=400))
        from urllib.parse import parse_qs
        supplied = parse_qs(body.decode('utf-8', errors='replace')).get('password', [''])[0]
        if not hmac.compare_digest(fingerprint(supplied), fingerprint(password)):
            count, expires = failures.get(client, (0, now + 300))
            failures[client] = (count + 1, expires)
            return secure(JSONResponse({'error': 'Incorrect password'}, status_code=401))
        failures.pop(client, None)
        for key, value in list(sessions.items()):
            if value[0] <= now:
                sessions.pop(key)
        if len(sessions) >= 100:
            sessions.pop(next(iter(sessions)))
        session_id = secrets.token_urlsafe(32)
        sessions[session_id] = (now + 8 * 3600, fingerprint(password))
        response = RedirectResponse('/admin', status_code=303)
        response.set_cookie(COOKIE, session_id, max_age=8 * 3600, httponly=True,
                            secure=request.url.scheme == 'https', samesite='strict', path='/admin')
        return secure(response)

    @app.post('/admin/logout', include_in_schema=False)
    def logout(request: Request):
        if not same_origin(request):
            return secure(JSONResponse({'error': 'Invalid origin'}, status_code=403))
        sessions.pop(request.cookies.get(COOKIE), None)
        response = RedirectResponse('/admin', status_code=303)
        response.delete_cookie(COOKIE, path='/admin')
        return secure(response)

    @app.get('/admin/api/status', include_in_schema=False)
    async def status(request: Request):
        if not valid(request):
            return secure(JSONResponse({'error': 'Login required'}, status_code=401))
        # Only application-level health and allowlisted deployment metadata are exposed.
        try:
            result = health()
        except Exception:
            result = {'status': 'degraded', 'error': 'Health check failed'}
        return secure(JSONResponse({'health': result, 'version': app.version,
            'commit': os.getenv('RENDER_GIT_COMMIT', 'local / unknown'),
            'started_at': monitor.started_at, 'uptime_seconds': round(perf_counter() - monitor.started),
            'requests': monitor.total, 'http_failures': monitor.http_failures,
            'active': list(monitor.active.values()), 'recent': list(reversed(monitor.recent)),
            'render_logs': 'https://dashboard.render.com/web/srv-dc386ss0916s73824470/logs'}))
