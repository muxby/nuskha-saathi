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


def _extractor_raising(status: int) -> GeminiVisionExtractor:
    async def http_post(url, body):
        request = httpx.Request("POST", url)
        raise httpx.HTTPStatusError("rejected", request=request, response=httpx.Response(status, request=request))

    return GeminiVisionExtractor(api_key="k", http_post=http_post, backoff_seconds=0)


@pytest.mark.parametrize("status", [401, 403, 429, 500, 503])
def test_provider_errors_report_service_unavailable(tmp_path, status):
    body = _scan(_client(tmp_path, _extractor_raising(status)))
    assert body["vision_status"] == "SERVICE_UNAVAILABLE"
    assert body["overall_status"] == "REFUSED"


def test_timeouts_report_service_unavailable(tmp_path):
    async def http_post(url, body):
        raise httpx.ReadTimeout("slow")

    extractor = GeminiVisionExtractor(api_key="k", http_post=http_post, backoff_seconds=0)
    assert _scan(_client(tmp_path, extractor))["vision_status"] == "SERVICE_UNAVAILABLE"


def test_malformed_model_output_is_unreadable(tmp_path):
    async def http_post(url, body):
        return {"candidates": [{"content": {"parts": [{"text": "not json"}]}}]}

    extractor = GeminiVisionExtractor(api_key="k", http_post=http_post, backoff_seconds=0)
    assert _scan(_client(tmp_path, extractor))["vision_status"] == "UNREADABLE"


def test_corrupt_upload_is_invalid_image(tmp_path):
    client = _client(tmp_path, GeminiVisionExtractor(api_key="k"))
    response = client.post("/api/v1/scan-parchi", files={"file": ("p.jpg", b"not an image", "image/jpeg")})
    assert response.json()["vision_status"] == "INVALID_IMAGE"


def test_successful_read_reports_ok(tmp_path):
    async def http_post(url, body):
        text = '{"extracted_lines":[{"raw_text":"Tab Panadol 500mg","brand_or_salt_guess":"Panadol","strength_mg":500,"morning_qty":1,"ocr_confidence":0.95}],"image_quality_warning":false}'
        return {"candidates": [{"content": {"parts": [{"text": text}]}}]}

    extractor = GeminiVisionExtractor(api_key="k", http_post=http_post, backoff_seconds=0)
    body = _scan(_client(tmp_path, extractor))
    assert body["vision_status"] == "OK"
    assert body["medications"][0]["status"] == "VERIFIED"


def test_retired_model_falls_back(tmp_path):
    seen: list[str] = []

    async def http_post(url, body):
        seen.append(url)
        if "retired-model" in url:
            request = httpx.Request("POST", url)
            raise httpx.HTTPStatusError("gone", request=request, response=httpx.Response(404, request=request))
        return {"candidates": [{"content": {"parts": [{"text": '{"extracted_lines":[],"image_quality_warning":false}'}]}}]}

    extractor = GeminiVisionExtractor(api_key="k", model="retired-model", http_post=http_post, backoff_seconds=0)
    result = asyncio.run(extractor.extract(_jpeg(), "image/jpeg"))
    assert isinstance(result, VisionExtraction)
    assert extractor.active_model == FALLBACK_MODELS[0]
    assert len(seen) == 2


def test_all_models_retired_raises_rejected():
    async def http_post(url, body):
        request = httpx.Request("POST", url)
        raise httpx.HTTPStatusError("gone", request=request, response=httpx.Response(404, request=request))

    extractor = GeminiVisionExtractor(api_key="k", http_post=http_post, backoff_seconds=0)
    with pytest.raises(VisionExtractError) as excinfo:
        asyncio.run(extractor.extract(_jpeg(), "image/jpeg"))
    assert excinfo.value.code == "UPSTREAM_REJECTED"


def test_key_is_not_placed_in_the_url():
    urls: list[str] = []

    async def http_post(url, body):
        urls.append(url)
        return {"candidates": [{"content": {"parts": [{"text": '{"extracted_lines":[],"image_quality_warning":false}'}]}}]}

    extractor = GeminiVisionExtractor(api_key="super-secret-key", http_post=http_post, backoff_seconds=0)
    asyncio.run(extractor.extract(_jpeg(), "image/jpeg"))
    assert urls and all("super-secret-key" not in url and "key=" not in url for url in urls)


