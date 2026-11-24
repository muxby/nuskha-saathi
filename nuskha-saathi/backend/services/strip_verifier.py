"""Compare a printed strip to one verified parchi line. No model decision."""

from __future__ import annotations

from dataclasses import dataclass

from services.formulary_resolver import FormularyResolver, ResolveHit
from services.urdu_formatter import (
    UNREADABLE_STRIP_URDU,
    exact_strip_urdu,
    generic_match_urdu,
    strength_mismatch_urdu,
    wrong_medicine_urdu,
)


@dataclass(frozen=True)
class StripVerdict:
    status: str
    expected_brand: str | None
    expected_salts: list[str]
    expected_strength: float | None
    detected_brand: str | None
    detected_salts: list[str]
    detected_strength: float | None
    urdu_verdict: str


def _salts(hit: ResolveHit | None, fallback: list[str]) -> tuple[str, ...]:
    if hit is not None:
        return tuple(salt.casefold() for salt in hit.generic_salts)
    return tuple(salt.casefold() for salt in fallback if salt)


def _same_strength(left: float | None, right: float | None) -> bool:
    if left is None or right is None:
        return False
    return abs(float(left) - float(right)) < 0.01


def _same_row(left: ResolveHit | None, right: ResolveHit | None, expected_brand: str, detected_brand: str) -> bool:
    if left is not None and right is not None:
        return left.brand_name == right.brand_name
    return expected_brand.casefold().strip() == detected_brand.casefold().strip()


def compare_strip(
    *,
    expected_brand: str,
    expected_salts: list[str],
    expected_strength: float | None,
    detected_brand: str,
    detected_salts: list[str],
    detected_strength: float | None,
    detected_confidence: float,
    resolver: FormularyResolver,
    schedule_phrase: str | None = None,
) -> StripVerdict:
    expected_hit = resolver.resolve(expected_brand)
    shown_expected = expected_hit.brand_name if expected_hit else expected_brand
    if detected_confidence < 0.85 or not (detected_brand or "").strip():
        return StripVerdict(
            status="UNREADABLE_STRIP",
            expected_brand=shown_expected,
            expected_salts=list(expected_salts),
            expected_strength=expected_strength,
            detected_brand=detected_brand or None,
            detected_salts=list(detected_salts),
            detected_strength=detected_strength,
            urdu_verdict=UNREADABLE_STRIP_URDU,
        )

    detected_hit = resolver.resolve(detected_brand)
    if detected_hit is None:
        return StripVerdict(
            status="UNREADABLE_STRIP",
            expected_brand=shown_expected,
            expected_salts=list(expected_salts),
            expected_strength=expected_strength,
            detected_brand=detected_brand,
            detected_salts=list(detected_salts),
            detected_strength=detected_strength,
            urdu_verdict=UNREADABLE_STRIP_URDU,
        )

    shown_detected = detected_hit.brand_name
    salts_expected = _salts(expected_hit, expected_salts)
    salts_detected = _salts(detected_hit, detected_salts)
    same_drug = _same_row(expected_hit, detected_hit, expected_brand, detected_brand) or (
        salts_expected and salts_expected == salts_detected
    )
    same_strength = _same_strength(expected_strength, detected_strength)

    if same_drug and not same_strength:
        brand_for_voice = shown_expected or shown_detected
        return StripVerdict(
            status="STRENGTH_MISMATCH",
            expected_brand=shown_expected,
            expected_salts=list(expected_hit.generic_salts if expected_hit else expected_salts),
            expected_strength=expected_strength,
            detected_brand=shown_detected,
            detected_salts=list(detected_hit.generic_salts),
            detected_strength=detected_strength,
            urdu_verdict=strength_mismatch_urdu(brand_for_voice, expected_strength, detected_strength),
        )

    if _same_row(expected_hit, detected_hit, expected_brand, detected_brand) and same_strength:
        return StripVerdict(
            status="EXACT_MATCH",
            expected_brand=shown_expected,
            expected_salts=list(expected_hit.generic_salts if expected_hit else expected_salts),
            expected_strength=expected_strength,
            detected_brand=shown_detected,
            detected_salts=list(detected_hit.generic_salts),
            detected_strength=detected_strength,
            urdu_verdict=exact_strip_urdu(shown_detected, detected_strength, schedule_phrase),
        )

    if salts_expected and salts_expected == salts_detected and same_strength:
        return StripVerdict(
            status="GENERIC_EQUIVALENT_MATCH",
            expected_brand=shown_expected,
            expected_salts=list(expected_hit.generic_salts if expected_hit else expected_salts),
            expected_strength=expected_strength,
            detected_brand=shown_detected,
            detected_salts=list(detected_hit.generic_salts),
            detected_strength=detected_strength,
            urdu_verdict=generic_match_urdu(shown_detected, shown_expected, detected_strength),
        )

    return StripVerdict(
        status="WRONG_MEDICINE",
        expected_brand=shown_expected,
        expected_salts=list(expected_hit.generic_salts if expected_hit else expected_salts),
        expected_strength=expected_strength,
        detected_brand=shown_detected,
        detected_salts=list(detected_hit.generic_salts),
        detected_strength=detected_strength,
        urdu_verdict=wrong_medicine_urdu(shown_expected, shown_detected),
    )
