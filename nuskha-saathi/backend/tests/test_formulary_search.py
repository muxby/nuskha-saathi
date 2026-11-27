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


