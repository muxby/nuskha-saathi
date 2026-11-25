"""Gemini structured extraction contract. Perception only. No safety decision."""

from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, Field, field_validator


def _finite_or_none(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return num if math.isfinite(num) else None


class ExtractedLine(BaseModel):
    raw_text: str = ""
    brand_or_salt_guess: str = ""
    strength_mg: float | None = None
    dosage_form: str = "tablet"
    morning_qty: float | None = None
    afternoon_qty: float | None = None
    night_qty: float | None = None
    meal_timing: str = "any"
    duration_days: int | None = None
    ocr_confidence: float = Field(default=0.0, ge=0.0)
    bbox_1000: list[float] | None = None

    @field_validator("raw_text", "brand_or_salt_guess", mode="before")
    @classmethod
    def _coerce_text(cls, value: Any) -> str:
        return "" if value is None else str(value).strip()

    @field_validator("dosage_form", mode="before")
    @classmethod
    def _coerce_form(cls, value: Any) -> str:
        cleaned = "" if value is None else str(value).strip()
        return cleaned or "tablet"

    @field_validator("meal_timing", mode="before")
    @classmethod
    def _coerce_meal(cls, value: Any) -> str:
        cleaned = "" if value is None else str(value).strip()
        return cleaned or "any"

    @field_validator("strength_mg", mode="before")
    @classmethod
    def _coerce_positive_strength(cls, value: Any) -> float | None:
        num = _finite_or_none(value)
        return num if (num is not None and num > 0) else None

    @field_validator("morning_qty", "afternoon_qty", "night_qty", mode="before")
    @classmethod
    def _coerce_nonneg_qty(cls, value: Any) -> float | None:
        num = _finite_or_none(value)
        if num is None:
            return None
        return 0.0 if num < 0 else num

    @field_validator("duration_days", mode="before")
    @classmethod
    def _coerce_positive_days(cls, value: Any) -> int | None:
        num = _finite_or_none(value)
        if num is None or num <= 0:
            return None
        days = int(round(num))
        return days if 1 <= days <= 365 else None

    @field_validator("ocr_confidence", mode="before")
    @classmethod
    def _coerce_confidence(cls, value: Any) -> float:
        num = _finite_or_none(value)
        if num is None or num < 0:
            return 0.0
        return num

    @field_validator("bbox_1000", mode="before")
    @classmethod
    def _coerce_bbox(cls, value: Any) -> list[float] | None:
        if not isinstance(value, (list, tuple)) or len(value) != 4:
            return None
        coords: list[float] = []
        for item in value:
            num = _finite_or_none(item)
            if num is None:
                return None
            coords.append(max(0.0, min(1000.0, num)))
        return coords


class VisionExtraction(BaseModel):
    extracted_lines: list[ExtractedLine] = Field(default_factory=list)
    image_quality_warning: bool = False

    @field_validator("extracted_lines", mode="before")
    @classmethod
    def _coerce_lines(cls, value: Any) -> list[Any]:
        return value if isinstance(value, list) else []

    @field_validator("image_quality_warning", mode="before")
    @classmethod
    def _coerce_warning(cls, value: Any) -> bool:
        return bool(value)
