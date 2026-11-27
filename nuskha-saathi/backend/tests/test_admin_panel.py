"""Tests for the private panel: password policy, self-tests and assets."""

from __future__ import annotations

from fastapi.testclient import TestClient

from main import create_app
from services.local_store import LocalStore
from services.selftest import LIVE, QUICK
from services.vision_extractor import GeminiVisionExtractor

PASSWORD = "twelve-chars"  # exactly the minimum length; test-only value


def _client(monkeypatch, tmp_path, password: str | None = PASSWORD, **kwargs) -> TestClient:
    if password is None:
        monkeypatch.delenv("ADMIN_MONITOR_PASSWORD", raising=False)
    else:
        monkeypatch.setenv("ADMIN_MONITOR_PASSWORD", password)
    return TestClient(create_app(store=LocalStore(tmp_path / "panel.db"), **kwargs))


def _signin(client: TestClient, password: str = PASSWORD):
    return client.post("/admin/login", data={"password": password}, follow_redirects=False)


def test_twelve_character_password_signs_in(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    assert _signin(client).status_code == 303
    assert client.get("/admin/api/status").status_code == 200


def test_shorter_password_keeps_the_panel_closed(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path, password="elevenchars")
    assert _signin(client, "elevenchars").status_code == 503
    assert client.get("/admin/api/status").status_code == 401


def test_wrong_password_is_rejected(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    assert _signin(client, "not-the-password").status_code == 401


def test_selftest_requires_login(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    assert client.post("/admin/api/selftest").status_code == 401


def test_selftest_rejects_cross_origin_requests(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    _signin(client)
    response = client.post("/admin/api/selftest", headers={"Origin": "https://evil.example"})
    assert response.status_code == 403


def test_quick_selftest_passes(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    _signin(client)
    body = client.post("/admin/api/selftest").json()
    assert body["ok"] is True
    assert body["live"] is False
    assert body["passed"] == body["total"] == len(QUICK)
    assert [check["name"] for check in body["checks"]] == [name for name, _, _ in QUICK]
    assert all(check["ms"] >= 0 and check["detail"] for check in body["checks"])


def test_selftest_leaves_no_rows_behind(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    _signin(client)
    before = client.get("/health").json()["store"]["active_cabinet_items"]
    client.post("/admin/api/selftest")
    assert client.get("/health").json()["store"]["active_cabinet_items"] == before


