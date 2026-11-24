"""Gemini structured extraction contract. Perception only. No safety decision."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ExtractedLine(BaseModel):
    raw_text: str
    brand_or_salt_guess: str = ""
    strength_mg: float | None = None
    dosage_form: str = "tablet"
    morning_qty: float | None = None
    afternoon_qty: float | None = None
    night_qty: float | None = None
    meal_timing: str = "any"
    duration_days: int | None = None
    ocr_confidence: float = Field(ge=0)
    bbox_1000: list[float] | None = None


class VisionExtraction(BaseModel):
    extracted_lines: list[ExtractedLine] = Field(default_factory=list)
    image_quality_warning: bool = False
