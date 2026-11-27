"""Tests for HTTP hardening: headers, CORS origins and the scan rate limit."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import create_app
from services.local_store import LocalStore
from services.security import (
    RateLimiter,
    allowed_origins,
    client_key,
    headers_for,
    scan_rate_limit,
)


@pytest.fixture()
def client(tmp_path):
    return TestClient(create_app(store=LocalStore(tmp_path / "store.db")))


def test_health_response_has_security_headers(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_api_responses_are_no_store(client):
    response = client.get("/api/v1/cabinet/patient-a")
    assert response.headers["cache-control"] == "no-store"


def test_health_is_not_forced_no_store():
    assert "Cache-Control" not in headers_for("/health")
    assert headers_for("/api/v1/scan-parchi")["Cache-Control"] == "no-store"


def test_error_responses_also_carry_headers(client):
    response = client.get("/api/v1/cabinet/%20")
    assert response.status_code == 400
    assert response.headers["x-content-type-options"] == "nosniff"


def test_allowed_origins_default_is_open(monkeypatch):
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    assert allowed_origins() == ["*"]


def test_allowed_origins_parses_a_comma_list(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", " https://a.example/ , https://b.example ,, ")
    assert allowed_origins() == ["https://a.example", "https://b.example"]


def test_blank_allowed_origins_falls_back_to_open(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", " , ")
    assert allowed_origins() == ["*"]


