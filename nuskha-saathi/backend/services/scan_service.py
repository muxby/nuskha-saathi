"""Wire a photo through extraction, the safety gate, the formulary, and openFDA."""

from __future__ import annotations

import uuid
from pathlib import Path
from time import perf_counter

from schemas.responses import (
    DoseSchedule,
    InteractionOut,
    MedicationOut,
    ScanResponse,
    StripResponse,
    StripSide,
    TelemetryOut,
)
from schemas.vision import ExtractedLine, VisionExtraction
from services.formulary_resolver import FormularyResolver
from services.image_ops import crop_bbox_jpeg_b64, save_jpeg
from services.openfda_client import OpenFdaClient
from services.safety_gate import evaluate_line
from services.strip_verifier import compare_strip
from services.urdu_formatter import BLURRY_URDU, dose_phrase, join_script, shortage_urdu
from services.vision_extractor import VisionExtractError

USD_TO_PKR = 280
GEMINI_USD_PER_SCAN = 0.0035


def new_scan_id() -> str:
    return "scan_" + uuid.uuid4().hex[:8]


def _qty(value: float | None) -> float:
    return float(value or 0)


def _drug_label(brand: str, salts: list[str], origin: str, source_label: str | None) -> str:
    salt_text = ", ".join(salts) if salts else brand
    if origin == "cabinet":
        where = source_label or "Active Cabinet"
        return f"{salt_text} ({brand} — {where})"
    return f"{salt_text} ({brand} — current parchi)"


async def scan_parchi(
    *,
    image_bytes: bytes,
    mime: str,
    patient_id: str,
    cabinet: list[dict],
    extractor,
    resolver: FormularyResolver,
    fda: OpenFdaClient,
) -> ScanResponse:
    started = perf_counter()
    vision_started = perf_counter()
    extraction: VisionExtraction | None = None
    vision_error = False
    if not image_bytes:
        vision_error = True
    else:
        try:
            extraction = await extractor.extract(image_bytes, mime, "parchi")
        except VisionExtractError:
            vision_error = True
    vision_ms = int(round((perf_counter() - vision_started) * 1000))

    medications: list[MedicationOut] = []
    verified_for_pairs: list[dict] = []
    script_parts: list[str] = []
    resolver_started = perf_counter()

    lines: list[ExtractedLine] = []
    if extraction is not None and not vision_error:
        lines = list(extraction.extracted_lines)

    if not lines:
        medications.append(
            MedicationOut(
                line_id="med_1",
                status="REFUSED_BLURRY",
                raw_text="",
                ocr_confidence=0.0,
                refusal_reason_urdu=BLURRY_URDU,
            )
        )
        script_parts.append(BLURRY_URDU)
    else:
        for index, line in enumerate(lines, start=1):
            decision = evaluate_line(line, resolver)
            line_id = f"med_{index}"
            if decision.status != "VERIFIED" or decision.resolved is None:
                crop = crop_bbox_jpeg_b64(image_bytes, line.bbox_1000)
                medications.append(
                    MedicationOut(
                        line_id=line_id,
                        status=decision.status,  # type: ignore[arg-type]
                        raw_text=line.raw_text,
                        ocr_confidence=line.ocr_confidence,
                        cropped_handwriting_b64=crop,
                        refusal_reason_urdu=decision.refusal_reason_urdu,
                        fuzzy_score=decision.fuzzy_score,
                    )
                )
                script_parts.append(decision.refusal_reason_urdu or BLURRY_URDU)
                continue

            entry = decision.resolved.entry
            salts = list(entry.generic_salts)
            schedule = DoseSchedule(
                morning=_qty(line.morning_qty),
                afternoon=_qty(line.afternoon_qty),
                night=_qty(line.night_qty),
                meal_timing=decision.meal_timing,  # type: ignore[arg-type]
                duration_days=line.duration_days,
            )
            shortage = None
            if entry.drap_shortage_flagged:
                shortage = shortage_urdu(entry.brand_name, list(entry.bioequivalent_pk_brands))
            medications.append(
                MedicationOut(
                    line_id=line_id,
                    status="VERIFIED",
                    brand_matched=entry.brand_name,
                    fuzzy_score=decision.fuzzy_score,
                    generic_salts=salts,
                    strength_mg=line.strength_mg,
                    schedule=schedule,
                    who_aware_tier=entry.who_aware_tier,
                    requires_day3_checkin=entry.is_antibiotic,
                    drap_shortage_alert=shortage,
                    strip_verified=False,
                    strip_thumbnail_url=None,
                )
            )
            spoken = dose_phrase(
                entry.brand_name,
                line.strength_mg,
                line.morning_qty,
                line.afternoon_qty,
                line.night_qty,
                decision.meal_timing,
            )
            if entry.is_antibiotic and entry.urdu_category_note:
                spoken = f"{spoken} {entry.urdu_category_note}"
            script_parts.append(spoken)
            verified_for_pairs.append(
                {
                    "line_id": line_id,
                    "brand_name": entry.brand_name,
                    "generic_salts": salts,
                    "source_label": "current parchi",
                }
            )

    resolver_ms = int(round((perf_counter() - resolver_started) * 1000))
    fda_started = perf_counter()
    hits = await fda.check_medications(verified_for_pairs, cabinet) if verified_for_pairs else []
    openfda_ms = int(round((perf_counter() - fda_started) * 1000))

    interactions: list[InteractionOut] = []
    for hit in hits:
        # Attach the patient-facing labels from the meds that produced the salts.
        drug_a, drug_b = _label_hit(hit.salt_a, hit.salt_b, verified_for_pairs, cabinet)
        interactions.append(
            InteractionOut(
                severity=hit.severity if hit.severity in {"HIGH", "MODERATE"} else "HIGH",  # type: ignore[arg-type]
                drug_a=drug_a,
                drug_b=drug_b,
                source=hit.source,
                fda_verbatim_excerpt=hit.fda_verbatim_excerpt,
                urdu_warning=hit.urdu_warning,
            )
        )
        script_parts.append(hit.urdu_warning)

    refused = any(med.status != "VERIFIED" for med in medications)
    if not medications:
        overall = "REFUSED"
    elif all(med.status != "VERIFIED" for med in medications) and not interactions:
        overall = "REFUSED"
    elif refused or interactions:
        overall = "ACTION_REQUIRED"
    else:
        overall = "VERIFIED"

    live_cost = GEMINI_USD_PER_SCAN if getattr(extractor, "counts_as_live", False) and not vision_error else 0.0
    total_ms = int(round((perf_counter() - started) * 1000))
    return ScanResponse(
        scan_id=new_scan_id(),
        patient_id=patient_id or "anonymous",
        overall_status=overall,  # type: ignore[arg-type]
        medications=medications,
        interactions=interactions,
        audio_urdu_url=None,
        audio_qr_payload=None,
        urdu_script=join_script(script_parts),
        whatsapp_scheduled=False,
        telemetry=TelemetryOut(
            vision_ms=vision_ms,
            resolver_ms=resolver_ms,
            openfda_ms=openfda_ms,
            tts_ms=0,
            total_ms=total_ms,
            estimated_cost_usd=round(live_cost, 5),
            estimated_cost_pkr=round(live_cost * USD_TO_PKR, 2),
        ),
    )


def _label_hit(salt_a: str, salt_b: str, current: list[dict], cabinet: list[dict]) -> tuple[str, str]:
    def find(salt: str, prefer: str) -> str:
        pools = [("parchi", current), ("cabinet", cabinet)] if prefer == "parchi" else [("cabinet", cabinet), ("parchi", current)]
        for origin, meds in pools:
            for med in meds:
                salts = [item.casefold() for item in med.get("generic_salts") or []]
                if salt.casefold() in salts:
                    return _drug_label(med["brand_name"], med.get("generic_salts") or [salt], origin, med.get("source_label"))
        return salt

    # Prefer showing one current-parchi drug and one cabinet drug when both exist.
    label_a_parchi = find(salt_a, "parchi")
    label_b_cabinet = find(salt_b, "cabinet")
    return label_a_parchi, label_b_cabinet


async def verify_strip(
    *,
    image_bytes: bytes,
    mime: str,
    scan_id: str,
    matched_line_id: str,
    expected_brand: str,
    expected_salts: list[str],
    expected_strength: float | None,
    schedule_phrase: str | None,
    extractor,
    resolver: FormularyResolver,
    strip_dir: Path,
) -> StripResponse:
    detected_brand = ""
    detected_salts: list[str] = []
    detected_strength = None
    confidence = 0.0
    if image_bytes:
        try:
            extraction = await extractor.extract(image_bytes, mime, "strip")
        except VisionExtractError:
            extraction = None
        if extraction is not None and extraction.extracted_lines:
            line = extraction.extracted_lines[0]
            detected_brand = line.brand_or_salt_guess or ""
            detected_strength = line.strength_mg
            confidence = line.ocr_confidence
            resolved = resolver.resolve(detected_brand)
            detected_salts = list(resolved.generic_salts) if resolved else []

    verdict = compare_strip(
        expected_brand=expected_brand,
        expected_salts=expected_salts,
        expected_strength=expected_strength,
        detected_brand=detected_brand,
        detected_salts=detected_salts,
        detected_strength=detected_strength,
        detected_confidence=confidence,
        resolver=resolver,
        schedule_phrase=schedule_phrase,
    )
    thumb_name = save_jpeg(image_bytes, strip_dir, f"strip_{scan_id}_{matched_line_id}.jpg") if image_bytes else None
    thumb_url = f"/static/strips/{thumb_name}" if thumb_name else None
    return StripResponse(
        scan_id=scan_id,
        matched_line_id=matched_line_id,
        verification_status=verdict.status,  # type: ignore[arg-type]
        expected=StripSide(
            brand=verdict.expected_brand,
            generic_salts=verdict.expected_salts,
            strength_mg=verdict.expected_strength,
        ),
        detected_on_strip=StripSide(
            brand=verdict.detected_brand,
            generic_salts=verdict.detected_salts,
            strength_mg=verdict.detected_strength,
        ),
        strip_thumbnail_url=thumb_url,
        urdu_verdict=verdict.urdu_verdict,
        audio_urdu_url=None,
    )
