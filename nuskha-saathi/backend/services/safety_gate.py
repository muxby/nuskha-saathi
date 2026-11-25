"""Deterministic refusal locks. This module does not call a model."""

from __future__ import annotations

import math
from dataclasses import dataclass

from schemas.vision import ExtractedLine
from services.formulary_resolver import FormularyResolver, ResolveHit
from services.urdu_formatter import BLURRY_URDU, DOSAGE_URDU, UNKNOWN_URDU

BLUR_THRESHOLD = 0.85
FUZZY_THRESHOLD = 82

_MEAL = {
    "before_food": "before_food",
    "before food": "before_food",
    "before_meals": "before_food",
    "before meals": "before_food",
    "empty_stomach": "before_food",
    "empty stomach": "before_food",
    "after_food": "after_food",
    "after food": "after_food",
    "after_meals": "after_food",
    "after meals": "after_food",
    "any": "any",
    "pc": "after_food",
    "ac": "before_food",
    "with_food": "after_food",
    "with food": "after_food",
    "with_meals": "after_food",
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
    if not math.isfinite(strength_mg) or strength_mg <= 0:
        return None
    quantities = (line.morning_qty, line.afternoon_qty, line.night_qty)
    if all(qty is None for qty in quantities):
        return None
    for qty in quantities:
        if qty is not None and (not math.isfinite(qty) or qty < 0):
            return None
    total_qty = sum(qty or 0 for qty in quantities)
    if total_qty <= 0 or not math.isfinite(total_qty):
        return None
    daily = strength_mg * total_qty
    return daily if math.isfinite(daily) else None


def evaluate_line(line: ExtractedLine, resolver: FormularyResolver) -> LineDecision:
    meal = normalize_meal(line.meal_timing)
    confidence = line.ocr_confidence
    if not math.isfinite(confidence) or confidence < BLUR_THRESHOLD or confidence > 1.0:
        return LineDecision("REFUSED_BLURRY", None, None, BLURRY_URDU, meal, None)

    resolved = resolver.resolve(line.brand_or_salt_guess) if line.brand_or_salt_guess else None
    if resolved is None and line.raw_text:
        resolved = resolver.resolve(line.raw_text)

    if resolved is None or not math.isfinite(resolved.fuzzy_score) or resolved.fuzzy_score < FUZZY_THRESHOLD:
        score = None if (resolved is None or not math.isfinite(resolved.fuzzy_score)) else resolved.fuzzy_score
        return LineDecision("REFUSED_UNKNOWN_DRUG", None, score, UNKNOWN_URDU, meal, None)

    strength = line.strength_mg
    if strength is None or not math.isfinite(strength) or strength <= 0:
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)
    for qty in (line.morning_qty, line.afternoon_qty, line.night_qty):
        if qty is not None and (not math.isfinite(qty) or qty < 0 or qty > 24):
            return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)

    daily = compute_daily_mg(line, strength)
    entry = resolved.entry
    if strength > entry.max_single_dose_mg or (daily is not None and daily > entry.max_daily_dose_mg):
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, daily)

    return LineDecision("VERIFIED", resolved, resolved.fuzzy_score, None, meal, daily)
