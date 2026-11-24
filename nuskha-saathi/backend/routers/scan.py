"""POST /api/v1/scan-parchi and POST /api/v1/verify-strip."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from time import perf_counter

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from services.scan_service import scan_parchi, verify_strip
from services.tts_stt_service import synthesize_urdu
from services.urdu_formatter import dose_phrase

router = APIRouter()

MAX_BYTES = 8 * 1024 * 1024


async def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 8 MB.")
    mime = file.content_type or "image/jpeg"
    return data, mime


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


@router.post("/api/v1/scan-parchi")
async def scan_parchi_route(
    request: Request,
    file: UploadFile = File(...),
    patient_id: str = Form("anonymous"),
    active_cabinet: str = Form("[]"),
):
    image_bytes, mime = await _read_upload(file)
    cabinet = _parse_cabinet(active_cabinet, request.app.state.resolver)
    result = await scan_parchi(
        image_bytes=image_bytes,
        mime=mime,
        patient_id=patient_id,
        cabinet=cabinet,
        extractor=request.app.state.extractor,
        resolver=request.app.state.resolver,
        fda=request.app.state.fda,
    )
    speech_started = perf_counter()
    audio = await synthesize_urdu(result.urdu_script)
    result.telemetry.tts_ms = int(round((perf_counter() - speech_started) * 1000))
    result.telemetry.total_ms += result.telemetry.tts_ms
    audio_dir = Path(request.app.state.audio_dir)
    if audio:
        (audio_dir / f"{result.scan_id}.mp3").write_bytes(audio)
        result.audio_urdu_url = f"/static/audio/{result.scan_id}.mp3"
    (audio_dir / f"{result.scan_id}.json").write_text(
        json.dumps({"scan_id": result.scan_id, "urdu_script": result.urdu_script, "audio_urdu_url": result.audio_urdu_url}),
        encoding="utf-8",
    )
    base_url = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
    result.audio_qr_payload = f"{base_url}/audio/{result.scan_id}" if base_url else f"/audio/{result.scan_id}"
    return result


@router.get("/api/v1/audio/{scan_id}")
async def audio_metadata(request: Request, scan_id: str):
    if not re.fullmatch(r"scan_[0-9a-f]{24}", scan_id):
        raise HTTPException(status_code=404, detail="Audio not found.")
    metadata = Path(request.app.state.audio_dir) / f"{scan_id}.json"
    if not metadata.is_file():
        raise HTTPException(status_code=404, detail="Audio not found.")
    return json.loads(metadata.read_text(encoding="utf-8"))


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
    image_bytes, mime = await _read_upload(file)
    salts = [part.strip() for part in expected_salts.split(",") if part.strip()]
    schedule = None
    if morning_qty or afternoon_qty or night_qty:
        schedule = dose_phrase(expected_brand, expected_strength_mg, morning_qty, afternoon_qty, night_qty, meal_timing)
    return await verify_strip(
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
