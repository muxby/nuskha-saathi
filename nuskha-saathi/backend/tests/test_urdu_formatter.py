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


def test_strength_mismatch_names_both_strengths():
    line = strength_mismatch_urdu("Leflox", 500, 250)
    assert line.startswith("RUK JAIYE!")
    assert "Leflox 500 mg" in line and "250 mg strip" in line


def test_wrong_medicine_handles_unreadable_detected_brand():
    assert "koi aur dawai" in wrong_medicine_urdu("Leflox", "")
    assert "Cravit" in wrong_medicine_urdu("Leflox", "Cravit")


def test_exact_match_can_append_the_schedule():
    assert exact_strip_urdu("Leflox", 500) == "Bilkul theek dawai hai — yeh Leflox 500 mg hai."
    assert exact_strip_urdu("Leflox", 500, "Subah leni hai.").endswith("Subah leni hai.")


def test_generic_match_asks_for_pharmacist_confirmation():
    line = generic_match_urdu("Cravit", "Leflox", 500)
    assert "Pharmacist se brand ki tasdeeq" in line


def test_shortage_line_never_tells_the_patient_to_switch():
    line = shortage_urdu("Leflox", ["Cravit", "Tavanic"])
    assert "Cravit, Tavanic" in line
    assert "Khud se dawai na badlein." in line
    assert "pharmacist ke pas maujood generic" in shortage_urdu("Leflox", [])


def test_join_script_drops_blank_parts():
    assert join_script(["  a ", "", "   ", "b"]) == "a b"
