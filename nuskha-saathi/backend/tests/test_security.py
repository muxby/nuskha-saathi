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


