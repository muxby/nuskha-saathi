"""Deterministic scan, strip-check, and telemetry response contracts."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


VerificationStatus = Literal[
    "EXACT_MATCH",
    "GENERIC_EQUIVALENT_MATCH",
    "STRENGTH_MISMATCH",
    "WRONG_MEDICINE",
    "UNREADABLE_STRIP",
]

LineStatus = Literal[
    "VERIFIED",
    "REFUSED_BLURRY",
    "REFUSED_UNKNOWN_DRUG",
    "REFUSED_DOSAGE_ANOMALY",
]


class DoseSchedule(BaseModel):
    morning: float
    afternoon: float
    night: float
    meal_timing: Literal["before_food", "after_food", "any"]
    duration_days: int | None = None


class MedicationOut(BaseModel):
    line_id: str
    status: LineStatus
    brand_matched: str | None = None
    fuzzy_score: float | None = None
    generic_salts: list[str] | None = None
    strength_mg: float | None = None
    schedule: DoseSchedule | None = None
    who_aware_tier: str | None = None
    requires_day3_checkin: bool | None = None
    drap_shortage_alert: str | None = None
    strip_verified: bool | None = None
    strip_thumbnail_url: str | None = None
    raw_text: str | None = None
    ocr_confidence: float | None = None
    cropped_handwriting_b64: str | None = None
    refusal_reason_urdu: str | None = None


class InteractionOut(BaseModel):
    severity: Literal["HIGH", "MODERATE"]
    drug_a: str
    drug_b: str
    source: str
    fda_verbatim_excerpt: str
    urdu_warning: str
    raw_fda_json: dict | None = None


class TelemetryOut(BaseModel):
    vision_ms: int
    resolver_ms: int
    openfda_ms: int
    tts_ms: int
    total_ms: int
    estimated_cost_usd: float
    estimated_cost_pkr: float


class ScanResponse(BaseModel):
    scan_id: str
    patient_id: str
    overall_status: Literal["VERIFIED", "ACTION_REQUIRED", "REFUSED"]
    medications: list[MedicationOut]
    interactions: list[InteractionOut]
    audio_urdu_url: str | None = None
    audio_qr_payload: str | None = None
    urdu_script: str
    whatsapp_scheduled: bool = False
    telemetry: TelemetryOut


class StripSide(BaseModel):
    brand: str | None = None
    generic_salts: list[str] = Field(default_factory=list)
    strength_mg: float | None = None


class StripResponse(BaseModel):
    scan_id: str
    matched_line_id: str
    verification_status: VerificationStatus
    expected: StripSide
    detected_on_strip: StripSide
    strip_thumbnail_url: str | None = None
    urdu_verdict: str
    audio_urdu_url: str | None = None


class CabinetMedIn(BaseModel):
    brand_name: str
    generic_salts: list[str] = Field(default_factory=list)
    strength_mg: float | None = None
    source_label: str = "Active Cabinet"
