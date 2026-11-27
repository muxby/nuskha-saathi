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


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_limiter_blocks_after_the_limit():
    clock = FakeClock()
    limiter = RateLimiter(3, 60, clock=clock)
    assert [limiter.check("a")[0] for _ in range(3)] == [True, True, True]
    allowed, retry_after = limiter.check("a")
    assert allowed is False
    assert 1 <= retry_after <= 60


def test_limiter_keys_are_independent():
    limiter = RateLimiter(1, 60, clock=FakeClock())
    assert limiter.check("a")[0] is True
    assert limiter.check("b")[0] is True
    assert limiter.check("a")[0] is False


def test_limiter_window_slides():
    clock = FakeClock()
    limiter = RateLimiter(1, 60, clock=clock)
    assert limiter.check("a")[0] is True
    clock.now += 59
    assert limiter.check("a")[0] is False
    clock.now += 2
    assert limiter.check("a")[0] is True


def test_zero_limit_disables_the_limiter():
    limiter = RateLimiter(0)
    assert limiter.enabled is False
    assert all(limiter.check("a")[0] for _ in range(100))


def test_prune_drops_idle_clients():
    clock = FakeClock()
    limiter = RateLimiter(5, 60, clock=clock)
    limiter.check("a")
    clock.now += 30
    limiter.check("b")
    clock.now += 31
    assert limiter.prune() == 1


def test_client_key_uses_first_forwarded_address():
    assert client_key("203.0.113.9, 10.0.0.1", "10.0.0.2") == "203.0.113.9"


def test_client_key_falls_back_to_peer():
    assert client_key(None, "198.51.100.4") == "198.51.100.4"
    assert client_key("  ", None) == "unknown"


def test_client_key_is_length_bounded():
    assert len(client_key("x" * 500, None)) == 64


def test_scan_rate_limit_reads_env(monkeypatch):
    monkeypatch.setenv("SCAN_RATE_LIMIT_PER_MINUTE", "5")
    assert scan_rate_limit() == 5
    monkeypatch.setenv("SCAN_RATE_LIMIT_PER_MINUTE", "not-a-number")
    assert scan_rate_limit() == 30
    monkeypatch.setenv("SCAN_RATE_LIMIT_PER_MINUTE", "-4")
    assert scan_rate_limit() == 0


def test_scan_route_returns_429_when_limited(tmp_path, monkeypatch):
    monkeypatch.setenv("SCAN_RATE_LIMIT_PER_MINUTE", "2")
    limited = TestClient(create_app(store=LocalStore(tmp_path / "limited.db")))
    statuses = [limited.post("/api/v1/scan-parchi").status_code for _ in range(3)]
    assert statuses[:2] == [422, 422]
    assert statuses[2] == 429
    response = limited.post("/api/v1/scan-parchi")
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) >= 1
    body = response.json()
    assert body["error"] == "HTTP_429"
    assert body["urdu_message"]


def test_read_routes_are_not_rate_limited(tmp_path, monkeypatch):
    monkeypatch.setenv("SCAN_RATE_LIMIT_PER_MINUTE", "1")
    limited = TestClient(create_app(store=LocalStore(tmp_path / "reads.db")))
    assert all(limited.get("/health").status_code == 200 for _ in range(5))
