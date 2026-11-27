"""Deterministic refusal locks. This module does not call a model."""

from __future__ import annotations

import math
import re
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


_MED_FORM_PREFIX_RE = re.compile(
    r"^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|susp(?:ension)?|drop(?:s)?|oint(?:ment)?|cream|gel|spray|inhaler|sachet|powder|lotion|sol(?:ution)?|t|c|s)\b\.?",
    re.IGNORECASE,
)
_NON_MED_EXACT = frozenset({
    "rx", "r/x", "r/", "adv", "advice", "diagnosis", "dx", "c/o", "h/o", "k/c/o", "o/e",
    "vitals", "vital", "diet", "walk", "exercise", "rest", "follow up", "followup",
    "review", "signature", "sign", "date", "opd", "notes", "plan", "investigations", "tests",
})
_NON_MED_LINE_RE = re.compile(
    r"^(?:"
    r"(?:patient\s*)?(?:name|pt\.?\s*name|age|sex|gender|wt|weight|ht|height|mr\s*#?|uhid|opd\s*#?|reg(?:\.|istration)?|date|address|phone|mob(?:ile)?|dr\.?|doctor|clinic|hospital)\b|"
    r"(?:b\.?p\.?|bp|spo2|sp02|sao2|temp(?:erature)?|pulse|p/?r|hr|rr|rbs|fbs|ppbs|hb|bmi)\b[:\s/-]*[\d.%/-]*|"
    r"\d{2,3}\s*/\s*\d{2,3}\s*(?:mmhg)?$|"
    r"\d{2,3}\s*%$|"
    r"#[0-9a-f]{4,}$|"
    r"(?:follow\s*(?:up|for|after)?|review\s*(?:after|in|for)?|revisit|visit\s*(?:after|in)?|sos)\b|"
    r"(?:diet|walk(?:ing)?|exercise|workout|oxorgize|rest|avoid|drink\s+water|fluids?|lifestyle)\b|"
    r"(?:c/o|h/o|k/c/o|o/e|dx|diagnosis|complaints?|symptoms?|history|allerg(?:y|ies))\b"
    r")",
    re.IGNORECASE,
)
_STANDALONE_COMPLAINT_WORDS = frozenset({
    "anxiety", "amity", "gastritis", "gantric", "hypertension", "htn", "diabetes",
    "dm", "fever", "cough", "cold", "pain", "headache", "depression", "insomnia",
    "vertigo", "infection", "acidity", "gerd", "weakness", "dizziness",
})


def is_non_medication_line(line: ExtractedLine, resolver: FormularyResolver) -> bool:
    """Return True when an extracted line is clearly prescription metadata, vitals, advice, or header text."""
    raw = " ".join((line.raw_text or "").strip().split())
    guess = " ".join((line.brand_or_salt_guess or "").strip().split())
    if "?" in raw or "?" in guess:
        return False

    clean_raw = re.sub(r"^[\-\*\u2022:\s]+", "", raw).strip()
    if not clean_raw and not guess:
        return True

    # Never drop anything that strongly matches a real formulary medication (unless pure header like Rx/BP/SpO2).
    folded = re.sub(r"[^a-z0-9/\s]+", " ", clean_raw.lower()).strip()
    if folded in _NON_MED_EXACT or _NON_MED_LINE_RE.match(clean_raw):
        return True
    if re.search(r"\b(?:age|sex|gender|b\.?p\.?|spo2|sp02)\b", clean_raw.lower()) and not _MED_FORM_PREFIX_RE.match(clean_raw):
        return True

    resolved = resolver.resolve(guess) if guess else None
    if (resolved is None or resolved.fuzzy_score < FUZZY_THRESHOLD) and clean_raw:
        resolved = resolver.resolve(clean_raw)
    if resolved is not None and math.isfinite(resolved.fuzzy_score) and resolved.fuzzy_score >= FUZZY_THRESHOLD:
        return False

    if _MED_FORM_PREFIX_RE.match(clean_raw):
        return False

    tokens = [tok for tok in re.split(r"[/,\s]+", folded) if tok]
    if (
        tokens
        and line.strength_mg is None
        and line.morning_qty is None
        and line.afternoon_qty is None
        and line.night_qty is None
        and all(tok in _STANDALONE_COMPLAINT_WORDS for tok in tokens)
    ):
        return True

    return False


def evaluate_resolved_line(line: ExtractedLine, resolved: ResolveHit | None) -> LineDecision:
    """Apply deterministic safety locks to a line with a pre-resolved formulary hit."""
    meal = normalize_meal(line.meal_timing)
    confidence = line.ocr_confidence
    if not math.isfinite(confidence) or confidence < BLUR_THRESHOLD or confidence > 1.0:
        return LineDecision("REFUSED_BLURRY", None, None, BLURRY_URDU, meal, None)

    if resolved is None or not math.isfinite(resolved.fuzzy_score) or resolved.fuzzy_score < FUZZY_THRESHOLD:
        score = None if (resolved is None or not math.isfinite(resolved.fuzzy_score)) else resolved.fuzzy_score
        return LineDecision("REFUSED_UNKNOWN_DRUG", None, score, UNKNOWN_URDU, meal, None)

    for qty in (line.morning_qty, line.afternoon_qty, line.night_qty):
        if qty is not None and (not math.isfinite(qty) or qty < 0 or qty > 24):
            return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)

    if resolved.entry.is_topical and "?" not in (line.raw_text or ""):
        return LineDecision("VERIFIED", resolved, resolved.fuzzy_score, None, meal, None)

    strength = line.strength_mg
    if strength is None:
        if "?" not in (line.raw_text or ""):
            if len(resolved.entry.common_strengths_mg) == 1:
                single_strength = resolved.entry.common_strengths_mg[0]
                daily = compute_daily_mg(line, single_strength)
                entry = resolved.entry
                if single_strength > entry.max_single_dose_mg or (daily is not None and daily > entry.max_daily_dose_mg):
                    return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, daily)
                return LineDecision("VERIFIED", resolved, resolved.fuzzy_score, None, meal, daily)
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)
    if not math.isfinite(strength) or strength <= 0:
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, None)

    daily = compute_daily_mg(line, strength)
    entry = resolved.entry
    if strength > entry.max_single_dose_mg or (daily is not None and daily > entry.max_daily_dose_mg):
        return LineDecision("REFUSED_DOSAGE_ANOMALY", resolved, resolved.fuzzy_score, DOSAGE_URDU, meal, daily)

    return LineDecision("VERIFIED", resolved, resolved.fuzzy_score, None, meal, daily)


def evaluate_line(line: ExtractedLine, resolver: FormularyResolver) -> LineDecision:
    meal = normalize_meal(line.meal_timing)
    confidence = line.ocr_confidence
    if not math.isfinite(confidence) or confidence < BLUR_THRESHOLD or confidence > 1.0:
        return LineDecision("REFUSED_BLURRY", None, None, BLURRY_URDU, meal, None)

    resolved = resolver.resolve(line.brand_or_salt_guess) if line.brand_or_salt_guess else None
    if resolved is None and line.raw_text:
        resolved = resolver.resolve(line.raw_text)

    return evaluate_resolved_line(line, resolved)
