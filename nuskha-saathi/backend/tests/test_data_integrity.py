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


