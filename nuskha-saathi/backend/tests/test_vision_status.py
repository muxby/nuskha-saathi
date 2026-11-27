"""Tests that a reader outage is never presented as unclear handwriting."""

from __future__ import annotations

import asyncio
from io import BytesIO

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import create_app
from schemas.vision import VisionExtraction
from services.local_store import LocalStore
from services.vision_extractor import FALLBACK_MODELS, GeminiVisionExtractor, VisionExtractError


def _jpeg() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (120, 80), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def _client(tmp_path, extractor) -> TestClient:
    return TestClient(create_app(extractor=extractor, store=LocalStore(tmp_path / "store.db")))


def _scan(client: TestClient) -> dict:
    response = client.post("/api/v1/scan-parchi", files={"file": ("p.jpg", _jpeg(), "image/jpeg")})
    assert response.status_code == 200
    return response.json()


def test_missing_key_reports_not_configured(tmp_path, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    body = _scan(_client(tmp_path, GeminiVisionExtractor(api_key="")))
    assert body["vision_status"] == "NOT_CONFIGURED"
    assert body["overall_status"] == "REFUSED"
    assert all(med["schedule"] is None for med in body["medications"])


