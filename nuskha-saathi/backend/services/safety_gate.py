"""Deterministic refusal locks. This module does not call a model."""

from __future__ import annotations

from dataclasses import dataclass

from schemas.vision import ExtractedLine
from services.formulary_resolver import FormularyResolver, ResolveHit
from services.urdu_formatter import BLURRY_URDU, DOSAGE_URDU, UNKNOWN_URDU

BLUR_THRESHOLD = 0.85
FUZZY_THRESHOLD = 82

_MEAL = {
    "before_food": "before_food",
    "after_food": "after_food",
    "any": "any",
    "pc": "after_food",
    "ac": "before_food",
    "with_food": "after_food",
}


@dataclass(frozen=True)
class LineDecision:
    status: str
    resolved: ResolveHit | None
    fuzzy_score: float | None
    refusal_reason_urdu: str | None
    meal_timing: str
    daily_mg: float | None


def normalize_meal(value: str | None) -> str:
    if not value:
        return "any"
    return _MEAL.get(value.strip().casefold(), "any")


def compute_daily_mg(line: ExtractedLine, strength_mg: float) -> float | None:
    quantities = (line.morning_qty, line.afternoon_qty, line.night_qty)
    if all(qty is None for qty in quantities):
        return None
    if any(qty is not None and qty < 0 for qty in quantities):
        return None
    total_qty = sum(qty or 0 for qty in quantities)
    if total_qty <= 0:
        return None
    return strength_mg * total_qty


def evaluate_line(line: ExtractedLine, resolver: FormularyResolver) -> LineDecision:
    meal = normalize_meal(line.meal_timing)
    confidence = line.ocr_confidence
    if confidence < BLUR_THRESHOLD or confidence > 1:
        return LineDecision("REFUSED_BLURRY", None, None, BLURRY_URDU, meal, None)

    resolved = resolver.resolve(line.brand_or_salt_guess or line.raw_text)
    if resolved is None or resolved.fuzzy_score < FUZZY_THRESHOLD:
        return LineDecision("REFUSED_UNKNOWN_DRUG", None, None if resolved is None else resolved.fuzzy_score, UNKNOWN_URDU, meal, None)

    strength = line.strength_mg
    if strength is None or strength <= 0:
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)
    if any(qty is not None and qty < 0 for qty in (line.morning_qty, line.afternoon_qty, line.night_qty)):
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)

    daily = compute_daily_mg(line, strength)
    entry = resolved.entry
    if strength > entry.max_single_dose_mg or (daily is not None and daily > entry.max_daily_dose_mg):
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, daily)

    return LineDecision("VERIFIED", resolved, resolved.fuzzy_score, None, meal, daily)
