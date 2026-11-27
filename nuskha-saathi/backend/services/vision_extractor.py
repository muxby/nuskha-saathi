"""Gemini Vision extraction. temperature 0, strict JSON. One retry, then refuse."""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re

import httpx

from schemas.vision import VisionExtraction

DEFAULT_MODEL = "gemini-2.5-flash"
# Tried in order when the configured model id is retired or unknown (HTTP 404).
FALLBACK_MODELS: tuple[str, ...] = ("gemini-flash-latest", "gemini-2.5-flash-lite")

_PARCHI_PROMPT = (
    "You extract handwritten or printed prescription lines from this photo. "
    "Return only the JSON schema. Do not decide whether a medicine is safe. "
    "Copy the text you can see. Put an honest ocr_confidence between 0 and 1. "
    "Use bbox_1000 as [ymin, xmin, ymax, xmax] on a 0 to 1000 grid. "
    "strength_mg is the milligram number written, or null if it is not readable. "
    "meal_timing is before_food, after_food, or any."
)

_STRIP_PROMPT = (
    "You read one physical medicine strip or box. Return one extracted line with the "
    "printed brand, the strength in milligrams, and an honest ocr_confidence. "
    "Do not decide whether it matches a prescription. "
    "bbox_1000 is [ymin, xmin, ymax, xmax] on a 0 to 1000 grid."
)

_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "extracted_lines": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "raw_text": {"type": "STRING"},
                    "brand_or_salt_guess": {"type": "STRING"},
                    "strength_mg": {"type": "NUMBER"},
                    "dosage_form": {"type": "STRING"},
                    "morning_qty": {"type": "NUMBER"},
                    "afternoon_qty": {"type": "NUMBER"},
                    "night_qty": {"type": "NUMBER"},
                    "meal_timing": {"type": "STRING"},
                    "duration_days": {"type": "INTEGER"},
                    "ocr_confidence": {"type": "NUMBER"},
                    "bbox_1000": {"type": "ARRAY", "items": {"type": "NUMBER"}},
                },
                "required": ["raw_text", "brand_or_salt_guess", "ocr_confidence"],
            },
        },
        "image_quality_warning": {"type": "BOOLEAN"},
    },
    "required": ["extracted_lines", "image_quality_warning"],
}


class VisionExtractError(Exception):
    """The photo could not be turned into the extraction schema.

    ``code`` separates a photo problem from a service problem so the patient
    is never told their handwriting is unclear when the reader is simply down:

    - ``BAD_OUTPUT``: the model answered but not in the schema (photo-level).
    - ``NOT_CONFIGURED``: no API key on the server.
    - ``UPSTREAM_REJECTED``: the provider refused the request (key, model, quota).
    - ``UPSTREAM_UNAVAILABLE``: timeout, network failure or provider 5xx.
    """

    def __init__(self, message: str = "", code: str = "BAD_OUTPUT"):
        super().__init__(message)
        self.code = code


SERVICE_ERROR_CODES = frozenset({"NOT_CONFIGURED", "UPSTREAM_REJECTED", "UPSTREAM_UNAVAILABLE"})


def _strip_fence(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def _text_from_gemini(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise VisionExtractError("Gemini returned no candidates")
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = "\n".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    if not text:
        raise VisionExtractError("Gemini returned no text")
    return _strip_fence(text)


_NON_RETRYABLE_STATUSES = frozenset({400, 401, 403, 404})


def _normalize_mime(mime: str | None) -> str:
    clean = (mime or "image/jpeg").split(";")[0].strip().lower()
    if clean == "image/jpg":
        return "image/jpeg"
    return clean or "image/jpeg"


class GeminiVisionExtractor:
    counts_as_live = True

    def __init__(self, api_key: str | None = None, model: str | None = None, http_post=None, backoff_seconds: float = 0.4):
        self.api_key = api_key if api_key is not None else os.environ.get("GEMINI_API_KEY")
        self.model = model or os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL
        self.http_post = http_post
        self.backoff_seconds = backoff_seconds
        self.active_model = self.model

    async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
        if not image_bytes:
            raise VisionExtractError("empty image")
        if not self.api_key and self.http_post is None:
            raise VisionExtractError("GEMINI_API_KEY is not set", code="NOT_CONFIGURED")
        prompt = _STRIP_PROMPT if mode == "strip" else _PARCHI_PROMPT
        body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": _normalize_mime(mime),
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
                "responseSchema": _RESPONSE_SCHEMA,
            },
        }
        models = [self.model, *[m for m in FALLBACK_MODELS if m != self.model]]
        for index, model in enumerate(models):
            try:
                extraction = await self._extract_with_model(model, body)
            except VisionExtractError as exc:
                retired = getattr(exc, "http_status", None) == 404
                if retired and index < len(models) - 1 and self.http_post is None:
                    continue
                raise
            self.active_model = model
            return extraction
        raise VisionExtractError("vision extraction failed", code="UPSTREAM_REJECTED")

    async def _extract_with_model(self, model: str, body: dict) -> VisionExtraction:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        last_error: Exception | None = None
        last_code = "BAD_OUTPUT"
        for attempt in range(2):
            try:
                payload = await self._post(url, body)
                parsed = json.loads(_text_from_gemini(payload))
                if isinstance(parsed, list):
                    parsed = {"extracted_lines": parsed, "image_quality_warning": False}
                if not isinstance(parsed, dict):
                    raise VisionExtractError("Gemini JSON root must be an object")
                return VisionExtraction.model_validate(parsed)
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code if exc.response is not None else 0
                if status in _NON_RETRYABLE_STATUSES:
                    error = VisionExtractError(
                        f"Gemini API rejected request with HTTP {status}", code="UPSTREAM_REJECTED"
                    )
                    error.http_status = status
                    raise error from exc
                last_error = exc
                last_code = "UPSTREAM_REJECTED" if status == 429 else "UPSTREAM_UNAVAILABLE"
                if attempt == 0:
                    await asyncio.sleep(self.backoff_seconds)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                last_code = "UPSTREAM_UNAVAILABLE"
                if attempt == 0:
                    await asyncio.sleep(self.backoff_seconds)
            except Exception as exc:  # noqa: BLE001 — fail closed after the single retry
                last_error = exc
                last_code = "BAD_OUTPUT"
                if attempt == 0:
                    await asyncio.sleep(self.backoff_seconds)
        raise VisionExtractError(str(last_error or "vision extraction failed"), code=last_code) from last_error

    async def _post(self, url: str, body: dict) -> dict:
        if self.http_post is not None:
            return await self.http_post(url, body)
        # The key travels in a header so it can never appear in a logged URL.
        headers = {"x-goog-api-key": self.api_key or ""}
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0)) as client:
            response = await client.post(url, json=body, headers=headers)
            response.raise_for_status()
            return response.json()
