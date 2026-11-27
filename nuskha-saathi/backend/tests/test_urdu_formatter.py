"""Tests for the fixed Roman Urdu lines handed to the voice vendors."""

from __future__ import annotations

from services.urdu_formatter import (
    BLURRY_URDU,
    DOSAGE_URDU,
    UNKNOWN_URDU,
    dose_phrase,
    exact_strip_urdu,
    format_mg,
    generic_match_urdu,
    join_script,
    shortage_urdu,
    strength_mismatch_urdu,
    wrong_medicine_urdu,
)


def test_dose_phrase_lists_morning_and_night():
    assert dose_phrase("Brufen", 400, 1, 0, 1, "after_food") == "Brufen 400 mg subah aur raat khane ke baad leni hai."


def test_dose_phrase_without_slots_defers_to_the_doctor():
    phrase = dose_phrase("Panadol", 500, 0, 0, 0, "any")
    assert "doctor ke bataye waqt" in phrase


def test_dose_phrase_handles_unknown_strength():
    assert dose_phrase("Risek", None, 1, None, None, "before_food") == "Risek subah khane se pehle leni hai."


def test_format_mg_uses_western_digits():
    assert format_mg(500) == "500 mg"
    assert format_mg(500.0) == "500 mg"
    assert format_mg(2.5) == "2.5 mg"
    assert format_mg(None) == ""


def test_fixed_lines_are_ascii_safe_for_tts():
    for line in (BLURRY_URDU, UNKNOWN_URDU, DOSAGE_URDU):
        assert line.replace("—", "-").isascii()


def test_refusals_never_contain_a_dose():
    for line in (BLURRY_URDU, UNKNOWN_URDU, DOSAGE_URDU):
        assert " mg" not in line
        assert "pharmacist" in line


