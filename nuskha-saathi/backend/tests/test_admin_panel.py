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


