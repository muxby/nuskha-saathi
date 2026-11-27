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


