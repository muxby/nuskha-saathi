"""POST /api/v1/scan-parchi and POST /api/v1/verify-strip."""

from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from services.scan_service import scan_parchi, verify_strip
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
    return result


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
