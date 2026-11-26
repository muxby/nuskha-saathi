"""Persistent Active Medicine Cabinet CRUD and offline demo-case endpoints."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from time import perf_counter

from fastapi import APIRouter, HTTPException, Request

from services.monitoring import event, stage
from schemas.responses import CabinetMedIn, ScanResponse
from services.demo_fixtures import list_demo_cases, run_demo_case
from services.tts_stt_service import synthesize_urdu

router = APIRouter()


def _clean_patient_id(patient_id: str) -> str:
    clean = " ".join(patient_id.strip().split())
    if not clean or "/" in clean or "\\" in clean or len(clean) > 80:
        raise HTTPException(status_code=400, detail="Invalid patient_id.")
    return clean


async def finalize_scan_response(
    request: Request,
    result: ScanResponse,
    *,
    speech_fn=synthesize_urdu,
) -> ScanResponse:
    """Run TTS, save audio metadata files, attach QR payload, and log to SQLite."""
    event("clinical_outcome", result.overall_status.lower())
    speech_started = perf_counter()
    with stage("urdu_audio"):
        audio = await speech_fn(result.urdu_script)
    if not audio:
        event("urdu_audio_result", "unavailable")
    result.telemetry.tts_ms = int(round((perf_counter() - speech_started) * 1000))
    result.telemetry.total_ms += result.telemetry.tts_ms

    with stage("persistence"):
        audio_dir = Path(request.app.state.audio_dir)
        audio_dir.mkdir(parents=True, exist_ok=True)
        if audio:
            (audio_dir / f"{result.scan_id}.mp3").write_bytes(audio)
            result.audio_urdu_url = f"/static/audio/{result.scan_id}.mp3"

        base_url = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
        result.audio_qr_payload = f"{base_url}/audio/{result.scan_id}" if base_url else f"/audio/{result.scan_id}"

        (audio_dir / f"{result.scan_id}.json").write_text(
            json.dumps(
                {
                    "scan_id": result.scan_id,
                    "patient_id": result.patient_id,
                    "urdu_script": result.urdu_script,
                    "audio_urdu_url": result.audio_urdu_url,
                }
            ),
            encoding="utf-8",
        )

        store = getattr(request.app.state, "store", None)
        if store is not None:
            store.record_scan(result)
    return result


@router.get("/api/v1/cabinet/{patient_id}")
async def get_cabinet(request: Request, patient_id: str):
    pid = _clean_patient_id(patient_id)
    meds = request.app.state.store.list_cabinet(pid)
    return {"patient_id": pid, "medications": meds}


@router.post("/api/v1/cabinet/{patient_id}", status_code=201)
async def add_cabinet_medicine(request: Request, patient_id: str, body: CabinetMedIn):
    pid = _clean_patient_id(patient_id)
    brand = " ".join(body.brand_name.strip().split())
    if not brand:
        raise HTTPException(status_code=400, detail="brand_name is required.")
    if body.strength_mg is not None and (not math.isfinite(body.strength_mg) or body.strength_mg <= 0):
        raise HTTPException(status_code=400, detail="strength_mg must be a positive finite number.")

    salts = [salt.strip().lower() for salt in body.generic_salts if salt.strip()]
    if not salts:
        resolved = request.app.state.resolver.resolve(brand)
        if resolved is not None:
            salts = list(resolved.generic_salts)

    item = request.app.state.store.add_cabinet_item(
        pid,
        brand_name=brand,
        generic_salts=salts,
        strength_mg=body.strength_mg,
        source_label=body.source_label,
    )
    meds = request.app.state.store.list_cabinet(pid)
    return {"patient_id": pid, "item": item, "medications": meds}


@router.delete("/api/v1/cabinet/{patient_id}/{item_id}")
async def remove_cabinet_medicine(request: Request, patient_id: str, item_id: str):
    pid = _clean_patient_id(patient_id)
    deleted = request.app.state.store.delete_cabinet_item(pid, item_id.strip())
    if not deleted:
        raise HTTPException(status_code=404, detail="Cabinet medicine not found.")
    meds = request.app.state.store.list_cabinet(pid)
    return {"deleted": True, "item_id": item_id, "medications": meds}


@router.get("/api/v1/patients/{patient_id}/scans")
async def list_patient_history(request: Request, patient_id: str):
    pid = _clean_patient_id(patient_id)
    scans = request.app.state.store.list_patient_scans(pid)
    return {"patient_id": pid, "scans": scans}


@router.get("/api/v1/demo-cases")
async def demo_cases_index():
    return {"cases": list_demo_cases()}


@router.post("/api/v1/demo-cases/{case_id}")
async def execute_demo_case(request: Request, case_id: str):
    try:
        result = await run_demo_case(
            case_id,
            resolver=request.app.state.resolver,
            fda=request.app.state.fda,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown demo case '{case_id}'.") from exc
    return await finalize_scan_response(request, result)
