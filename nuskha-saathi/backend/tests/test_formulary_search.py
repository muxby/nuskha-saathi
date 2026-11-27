"""Tests for the read-only formulary lookup used by the cabinet form."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import create_app
from services.formulary_resolver import FormularyResolver
from services.formulary_search import MAX_LIMIT, search_formulary
from services.local_store import LocalStore


@pytest.fixture(scope="module")
def entries():
    return FormularyResolver.load().entries


def test_prefix_search_returns_brand_first(entries):
    results = search_formulary(entries, "leflo")
    assert results
    assert results[0]["brand_name"] == "Leflox"
    assert results[0]["generic_salts"] == ["levofloxacin"]


def test_search_is_case_and_whitespace_insensitive(entries):
    assert search_formulary(entries, "  AUGMEN ")[0]["brand_name"] == "Augmentin"


def test_exact_match_ranks_first(entries):
    results = search_formulary(entries, "brufen")
    assert results[0]["brand_name"] == "Brufen"


def test_salt_name_finds_its_brands(entries):
    brands = {row["brand_name"] for row in search_formulary(entries, "warfarin", limit=20)}
    assert brands, "warfarin should resolve to at least one listed brand"


def test_short_query_returns_nothing(entries):
    assert search_formulary(entries, "a") == []
    assert search_formulary(entries, "   ") == []


def test_unknown_name_returns_nothing(entries):
    assert search_formulary(entries, "zzzzqqq") == []


def test_limit_is_clamped(entries):
    assert len(search_formulary(entries, "pa", limit=1000)) <= MAX_LIMIT
    assert len(search_formulary(entries, "pa", limit=0)) == 1


def test_results_expose_antibiotic_tier(entries):
    row = search_formulary(entries, "leflox")[0]
    assert row["is_antibiotic"] is True
    assert row["who_aware_tier"] == "WATCH"
    assert 500 in row["common_strengths_mg"]


