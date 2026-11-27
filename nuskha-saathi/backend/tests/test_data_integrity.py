"""Integrity checks for the curated clinical datasets.

The safety gate trusts these files. A malformed row could silently weaken a
dose ceiling, so shape and bounds are enforced in CI.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

DATA = Path(__file__).resolve().parents[1] / "data"
FORMULARY = json.loads((DATA / "pk_formulary.json").read_text(encoding="utf-8"))
INTERACTIONS = json.loads((DATA / "pk_interactions_fallback.json").read_text(encoding="utf-8"))

REQUIRED_FORMULARY_FIELDS = {
    "brand_name",
    "aliases",
    "generic_salts",
    "common_strengths_mg",
    "max_single_dose_mg",
    "max_daily_dose_mg",
    "is_antibiotic",
    "who_aware_tier",
    "drap_shortage_flagged",
    "bioequivalent_pk_brands",
    "urdu_category_note",
}


def test_formulary_rows_have_required_fields():
    for row in FORMULARY:
        missing = REQUIRED_FORMULARY_FIELDS - row.keys()
        assert not missing, f"{row.get('brand_name')} is missing {sorted(missing)}"


def test_formulary_meets_the_planned_size():
    assert len(FORMULARY) >= 200


def test_brand_names_are_unique():
    names = [row["brand_name"].casefold() for row in FORMULARY]
    duplicates = {name for name in names if names.count(name) > 1}
    assert not duplicates


def test_every_brand_has_a_salt_and_an_alias():
    for row in FORMULARY:
        assert row["brand_name"].strip()
        assert row["generic_salts"], row["brand_name"]
        assert all(salt == salt.strip().lower() for salt in row["generic_salts"]), row["brand_name"]
        assert row["aliases"], row["brand_name"]


def test_dose_ceilings_are_positive():
    for row in FORMULARY:
        assert row["max_single_dose_mg"] > 0, row["brand_name"]
        assert row["max_daily_dose_mg"] > 0, row["brand_name"]


def test_daily_ceiling_is_not_below_single_ceiling():
    for row in FORMULARY:
        assert row["max_daily_dose_mg"] >= row["max_single_dose_mg"], row["brand_name"]


def test_common_strengths_never_exceed_the_single_dose_ceiling():
    for row in FORMULARY:
        for strength in row["common_strengths_mg"]:
            assert 0 < strength <= row["max_single_dose_mg"], (row["brand_name"], strength)


def test_aware_tiers_are_valid():
    for row in FORMULARY:
        assert row["who_aware_tier"] in {"ACCESS", "WATCH", "RESERVE", "NONE"}, row["brand_name"]


def test_non_antibiotics_have_no_aware_tier():
    for row in FORMULARY:
        if not row["is_antibiotic"]:
            assert row["who_aware_tier"] == "NONE", row["brand_name"]


@pytest.mark.parametrize(
    "brand",
    ["Augmentin", "Risek", "Panadol", "Glucophage", "Concor", "Leflox", "Flagyl", "Brufen", "Disprin", "Arinac"],
)
def test_pitch_brands_are_listed(brand):
    assert any(row["brand_name"] == brand for row in FORMULARY)


def test_warfarin_is_resolvable():
    assert any("warfarin" in row["generic_salts"] for row in FORMULARY)


def test_interaction_rows_are_complete():
    for row in INTERACTIONS:
        for field in ("salt_a", "salt_b", "severity", "source", "fda_verbatim_excerpt", "urdu_warning"):
            assert str(row.get(field, "")).strip(), (row.get("salt_a"), row.get("salt_b"), field)
        assert row["severity"] in {"HIGH", "MODERATE"}
        assert row["salt_a"] != row["salt_b"]


def test_interaction_file_meets_the_planned_size():
    assert len(INTERACTIONS) >= 60


def test_interaction_pairs_are_unique():
    pairs = [frozenset((row["salt_a"], row["salt_b"])) for row in INTERACTIONS]
    assert len(pairs) == len(set(pairs))


def _has_pair(a: str, b: str) -> bool:
    return any(
        (a in row["salt_a"] and b in row["salt_b"]) or (a in row["salt_b"] and b in row["salt_a"])
        for row in INTERACTIONS
    )


@pytest.mark.parametrize(
    ("salt_a", "salt_b"),
    [
        ("ibuprofen", "warfarin"),
        ("ciprofloxacin", "tizanidine"),
        ("metronidazole", "warfarin"),
        ("sildenafil", "nitr"),
        ("clarithromycin", "simvastatin"),
    ],
)
def test_eval_pairs_are_cached_offline(salt_a, salt_b):
    assert _has_pair(salt_a, salt_b)


def test_eval_pairs_are_high_severity():
    row = next(r for r in INTERACTIONS if {r["salt_a"], r["salt_b"]} == {"ibuprofen", "warfarin"})
    assert row["severity"] == "HIGH"
