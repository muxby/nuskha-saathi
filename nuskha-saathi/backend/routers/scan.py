"""POST /api/v1/scan-parchi, POST /api/v1/verify-strip, and GET /api/v1/audio/{scan_id}."""

from __future__ import annotations

import json
import math
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from routers.cabinet import finalize_scan_response
from services.image_ops import safe_slug
from services.scan_service import scan_parchi, verify_strip
from services.tts_stt_service import synthesize_urdu
from services.urdu_formatter import dose_phrase

router = APIRouter()

MAX_BYTES = 8 * 1024 * 1024
_READ_CHUNK_BYTES = 64 * 1024
_ALLOWED_IMAGE_MIMES = frozenset(
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/tiff",
        "image/heic",
        "image/heif",
    }
)


async def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    raw_mime = (file.content_type or "image/jpeg").split(";")[0].strip().lower()
    if raw_mime == "image/jpg":
        raw_mime = "image/jpeg"
    if raw_mime and raw_mime != "application/octet-stream" and raw_mime not in _ALLOWED_IMAGE_MIMES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{raw_mime}'. Please upload a JPEG, PNG, or WEBP prescription image.",
        )

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_READ_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_BYTES:
            raise HTTPException(status_code=413, detail="Image is larger than 8 MB.")
        chunks.append(chunk)
    return b"".join(chunks), raw_mime or "image/jpeg"


def _parse_cabinet(raw: str, resolver) -> list[dict]:
    if not raw or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="active_cabinet must be a JSON list.") from exc
    if not isinstance(parsed, list):
        raise HTTPException(status_code=400, detail="active_cabinet must be a JSON list.")
    cabinet = []
    for item in parsed:
        if not isinstance(item, dict) or not item.get("brand_name"):
            raise HTTPException(status_code=400, detail="Each cabinet medicine needs a brand_name.")
        salts = item.get("generic_salts") or []
        if isinstance(salts, str):
            salts = [part.strip() for part in salts.split(",") if part.strip()]
        if not salts:
            resolved = resolver.resolve(str(item["brand_name"]))
            if resolved is not None:
                salts = list(resolved.generic_salts)
        cabinet.append(
            {
                "brand_name": str(item["brand_name"]),
                "generic_salts": [str(salt) for salt in salts],
                "strength_mg": item.get("strength_mg"),
                "source_label": str(item.get("source_label") or "Active Cabinet"),
            }
        )
    return cabinet


def _merge_patient_cabinet(inline_cabinet: list[dict], patient_id: str, store) -> list[dict]:
    if store is None or not patient_id.strip() or patient_id.strip().lower() == "anonymous":
        return inline_cabinet
    saved = store.list_cabinet(patient_id.strip())
    if not saved:
        return inline_cabinet
    merged = list(inline_cabinet)
    seen = {
        (item["brand_name"].casefold().strip(), tuple(sorted(s.casefold() for s in item.get("generic_salts") or [])))
        for item in merged
    }
    for row in saved:
        key = (row["brand_name"].casefold().strip(), tuple(sorted(s.casefold() for s in row.get("generic_salts") or [])))
        if key not in seen:
            seen.add(key)
            merged.append(
                {
                    "brand_name": row["brand_name"],
                    "generic_salts": list(row.get("generic_salts") or []),
                    "strength_mg": row.get("strength_mg"),
                    "source_label": row.get("source_label") or "Active Cabinet",
                }
            )
    return merged


@router.post("/api/v1/scan-parchi")
async def scan_parchi_route(
    request: Request,
    file: UploadFile = File(...),
    patient_id: str = Form("anonymous"),
    active_cabinet: str = Form("[]"),
):
    image_bytes, mime = await _read_upload(file)
    inline_cabinet = _parse_cabinet(active_cabinet, request.app.state.resolver)
    store = getattr(request.app.state, "store", None)
    cabinet = _merge_patient_cabinet(inline_cabinet, patient_id, store)

    result = await scan_parchi(
        image_bytes=image_bytes,
        mime=mime,
        patient_id=patient_id,
        cabinet=cabinet,
        extractor=request.app.state.extractor,
        resolver=request.app.state.resolver,
        fda=request.app.state.fda,
    )
    return await finalize_scan_response(request, result, speech_fn=synthesize_urdu)


@router.get("/api/v1/audio/{scan_id}")
async def audio_metadata(request: Request, scan_id: str):
    if not re.fullmatch(r"scan_[0-9a-f]{24}", scan_id):
        raise HTTPException(status_code=404, detail="Audio not found.")
    metadata = Path(request.app.state.audio_dir) / f"{scan_id}.json"
    if metadata.is_file():
        return json.loads(metadata.read_text(encoding="utf-8"))
    store = getattr(request.app.state, "store", None)
    if store is not None:
        saved = store.get_scan(scan_id)
        if saved is not None:
            return {
                "scan_id": saved["scan_id"],
                "patient_id": saved.get("patient_id", "anonymous"),
                "urdu_script": saved["urdu_script"],
                "audio_urdu_url": saved.get("audio_urdu_url"),
            }
    raise HTTPException(status_code=404, detail="Audio not found.")


@router.post("/api/v1/verify-strip")
async def verify_strip_route(
    request: Request,
    file: UploadFile = File(...),
    scan_id: str = Form(...),
    matched_line_id: str = Form(...),
    expected_brand: str = Form(...),
    expected_strength_mg: float = Form(...),
    expected_salts: str = Form(""),
    morning_qty: float = Form(0),
    afternoon_qty: float = Form(0),
    night_qty: float = Form(0),
    meal_timing: str = Form("any"),
):
    if not expected_brand.strip():
        raise HTTPException(status_code=400, detail="expected_brand is required.")
    if not math.isfinite(expected_strength_mg) or expected_strength_mg <= 0:
        raise HTTPException(status_code=400, detail="expected_strength_mg must be a positive number.")
    for label, qty in (("morning_qty", morning_qty), ("afternoon_qty", afternoon_qty), ("night_qty", night_qty)):
        if not math.isfinite(qty) or qty < 0:
            raise HTTPException(status_code=400, detail=f"{label} must be a non-negative number.")

    image_bytes, mime = await _read_upload(file)
    salts = [part.strip() for part in expected_salts.split(",") if part.strip()]
    schedule = None
    if morning_qty or afternoon_qty or night_qty:
        schedule = dose_phrase(expected_brand, expected_strength_mg, morning_qty, afternoon_qty, night_qty, meal_timing)

    result = await verify_strip(
        image_bytes=image_bytes,
        mime=mime,
        scan_id=scan_id,
        matched_line_id=matched_line_id,
        expected_brand=expected_brand,
        expected_salts=salts,
        expected_strength=expected_strength_mg,
        schedule_phrase=schedule,
        extractor=request.app.state.extractor,
        resolver=request.app.state.resolver,
        strip_dir=request.app.state.strip_dir,
    )

    audio = await synthesize_urdu(result.urdu_verdict)
    if audio:
        audio_dir = Path(request.app.state.audio_dir)
        audio_dir.mkdir(parents=True, exist_ok=True)
        audio_name = f"verify_{safe_slug(scan_id, 'scan')}_{safe_slug(matched_line_id, 'med')}_{uuid.uuid4().hex[:8]}.mp3"
        (audio_dir / audio_name).write_bytes(audio)
        result.audio_urdu_url = f"/static/audio/{audio_name}"
    return result
