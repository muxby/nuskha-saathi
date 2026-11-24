"""Deterministic safety-gate cases required before the vision model is trusted."""

import asyncio
import time

import pytest

from schemas.vision import ExtractedLine
from services.formulary_resolver import FormularyResolver
from services.openfda_client import OpenFdaClient, build_label_url
from services.safety_gate import evaluate_line
from services.strip_verifier import compare_strip

resolver = FormularyResolver.load()
fda = OpenFdaClient.from_resolver(resolver, live=False)


def line(**overrides) -> ExtractedLine:
    payload = {
        "raw_text": "Tab Leflox 500mg 1xOD",
        "brand_or_salt_guess": "Leflox",
        "strength_mg": 500,
        "dosage_form": "tablet",
        "morning_qty": 1,
        "afternoon_qty": 0,
        "night_qty": 0,
        "meal_timing": "after_food",
        "duration_days": 5,
        "ocr_confidence": 0.95,
        "bbox_1000": [10, 10, 200, 800],
    }
    payload.update(overrides)
    return ExtractedLine(**payload)


def test_formulary_has_200_brands_and_pitch_drugs():
    brands = {entry.brand_name for entry in resolver.entries}
    assert len(brands) >= 200
    for name in ("Augmentin", "Risek", "Panadol", "Glucophage", "Concor", "Leflox", "Flagyl", "Brufen", "Disprin", "Arinac"):
        assert name in brands
    leflox = next(entry for entry in resolver.entries if entry.brand_name == "Leflox")
    assert leflox.generic_salts == ("levofloxacin",)
    assert leflox.max_single_dose_mg == 750
    assert leflox.max_daily_dose_mg == 750
    assert leflox.who_aware_tier == "WATCH"
    assert leflox.is_antibiotic is True
    assert {"Cravit", "Tavanic", "Bactoflox"} <= set(leflox.bioequivalent_pk_brands)
    assert {"leflx", "leflo", "lefloxacine", "levofloxacin"} <= {alias.casefold() for alias in leflox.aliases}


def test_interaction_file_covers_the_five_eval_pairs():
    assert len(fda.fallback) >= 60
    required = [
        ("ibuprofen", "warfarin"),
        ("ciprofloxacin", "tizanidine"),
        ("metronidazole", "warfarin"),
        ("sildenafil", "nitroglycerin"),
        ("clarithromycin", "simvastatin"),
    ]
    formulary_salts = resolver.salts
    for left, right in required:
        hit = fda.fallback.get(tuple(sorted((left, right))))
        assert hit is not None, (left, right)
        assert hit.severity == "HIGH"
        assert len(hit.fda_verbatim_excerpt) > 40
        assert hit.urdu_warning
        assert left in formulary_salts and right in formulary_salts


def test_every_brand_resolves_to_itself_quickly():
    started = time.perf_counter()
    for entry in resolver.entries:
        hit = resolver.resolve(entry.brand_name)
        assert hit is not None
        assert hit.brand_name == entry.brand_name
        assert hit.fuzzy_score >= 82
    mean_seconds = (time.perf_counter() - started) / len(resolver.entries)
    assert mean_seconds < 0.005


def test_augmntin_resolves_to_coamoxiclav():
    hit = resolver.resolve("Augmntin")
    assert hit is not None
    assert hit.fuzzy_score >= 82
    assert hit.generic_salts == ["amoxicillin", "clavulanate"]


def test_unknown_spelling_returns_no_salt():
    assert resolver.resolve("zzzznotadrugqq") is None
    decision = evaluate_line(line(brand_or_salt_guess="zzzznotadrugqq", raw_text="zzzznotadrugqq"), resolver)
    assert decision.status == "REFUSED_UNKNOWN_DRUG"


def test_confidence_boundary_locks():
    refused = evaluate_line(line(ocr_confidence=0.84), resolver)
    assert refused.status == "REFUSED_BLURRY"
    passed = evaluate_line(line(ocr_confidence=0.85), resolver)
    assert passed.status == "VERIFIED"
    assert passed.resolved is not None
    assert passed.resolved.generic_salts == ["levofloxacin"]


def test_overdose_ceiling_blocks_5000mg_levofloxacin():
    decision = evaluate_line(line(strength_mg=5000, raw_text="Tab Leflox 5000mg"), resolver)
    assert decision.status == "REFUSED_DOSAGE_ANOMALY"


def test_openfda_rejects_brand_names_and_urls_use_the_salt():
    url = build_label_url("levofloxacin", api_key=None)
    assert "levofloxacin" in url
    assert "leflox" not in url.casefold()
    with pytest.raises(ValueError):
        fda.assert_salt("Leflox")


def test_ibuprofen_warfarin_uses_cached_fda_excerpt_when_live_is_off():
    hit = asyncio.run(fda.lookup_pair("ibuprofen", "warfarin"))
    assert hit is not None
    assert hit.severity == "HIGH"
    assert hit.source.startswith("openFDA")
    assert "Warfarin" in hit.urdu_warning or "warfarin" in hit.urdu_warning.casefold()
    assert len(hit.fda_verbatim_excerpt) > 40


def test_strip_strength_mismatch_250_vs_500():
    verdict = compare_strip(
        expected_brand="Leflox",
        expected_salts=["levofloxacin"],
        expected_strength=500,
        detected_brand="Leflox",
        detected_salts=["levofloxacin"],
        detected_strength=250,
        detected_confidence=0.96,
        resolver=resolver,
    )
    assert verdict.status == "STRENGTH_MISMATCH"
    assert "RUK JAIYE" in verdict.urdu_verdict
    assert "500 mg" in verdict.urdu_verdict
    assert "250 mg" in verdict.urdu_verdict


def test_strip_exact_and_generic_equivalent():
    exact = compare_strip(
        expected_brand="Leflox",
        expected_salts=["levofloxacin"],
        expected_strength=500,
        detected_brand="Leflox",
        detected_salts=["levofloxacin"],
        detected_strength=500,
        detected_confidence=0.99,
        resolver=resolver,
        schedule_phrase="Subah khane ke baad leni hai.",
    )
    assert exact.status == "EXACT_MATCH"
    assert "Bilkul theek dawai hai" in exact.urdu_verdict
    generic = compare_strip(
        expected_brand="Leflox",
        expected_salts=["levofloxacin"],
        expected_strength=500,
        detected_brand="Cravit",
        detected_salts=["levofloxacin"],
        detected_strength=500,
        detected_confidence=0.99,
        resolver=resolver,
    )
    assert generic.status == "GENERIC_EQUIVALENT_MATCH"
    wrong = compare_strip(
        expected_brand="Leflox",
        expected_salts=["levofloxacin"],
        expected_strength=500,
        detected_brand="Brufen",
        detected_salts=["ibuprofen"],
        detected_strength=400,
        detected_confidence=0.99,
        resolver=resolver,
    )
    assert wrong.status == "WRONG_MEDICINE"
