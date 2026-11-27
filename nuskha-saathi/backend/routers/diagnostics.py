"""Deployment diagnostics.

``/health`` only says whether a key is present. This route proves the reader
actually works end to end by sending one generated test image through it. It
returns a status code and timing only: never the key, the provider's error
text, or any patient data.
"""

from __future__ import annotations

from io import BytesIO
from time import perf_counter

from fastapi import APIRouter, Request
from PIL import Image, ImageDraw

from services.vision_extractor import VisionExtractError

router = APIRouter()


def _test_image() -> bytes:
    image = Image.new("RGB", (640, 220), "white")
    draw = ImageDraw.Draw(image)
    draw.text((40, 60), "Tab Panadol 500mg", fill="black")
    draw.text((40, 110), "1 + 0 + 1  x 3 days", fill="black")
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


@router.get("/api/v1/diagnostics/vision")
async def vision_selftest(request: Request):
    extractor = request.app.state.extractor
    started = perf_counter()
    status = "OK"
    lines = 0
    try:
        extraction = await extractor.extract(_test_image(), "image/jpeg", "parchi")
        lines = len(extraction.extracted_lines)
    except VisionExtractError as exc:
        status = getattr(exc, "code", "BAD_OUTPUT")
    return {
        "ok": status == "OK",
        "status": status,
        "model": getattr(extractor, "active_model", None),
        "lines_read": lines,
        "latency_ms": int(round((perf_counter() - started) * 1000)),
        "hint": _HINTS.get(status, ""),
    }


_HINTS = {
    "OK": "The reader answered. Scans will be analysed.",
    "NOT_CONFIGURED": "Set GEMINI_API_KEY in the backend environment and redeploy.",
    "UPSTREAM_REJECTED": (
        "The provider refused the request. Check that GEMINI_API_KEY is valid, has quota, "
        "and that GEMINI_MODEL names a model available to that key."
    ),
    "UPSTREAM_UNAVAILABLE": "The provider timed out or was unreachable. Check outbound network access and retry.",
    "BAD_OUTPUT": "The reader answered outside the expected schema. Retry; if it persists, check GEMINI_MODEL.",
}
