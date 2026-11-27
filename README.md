# Nuskha Saathi — نسخہ ساتھی

A bilingual prescription companion for patients in Pakistan. Photograph a
handwritten prescription and the app shows what was read, flags dangerous
combinations with the source wording, lays out when to take each medicine,
and reads the instructions aloud in Urdu.

**The vision model only reads. A deterministic safety engine decides.**
Unclear handwriting, unknown brands and doses above the listed ceiling are
refused, never guessed.

## What it does

- **Reads the parchi.** Each line is matched to a curated Pakistani formulary
  (327 brands). Low-confidence lines are cropped and sent back for a pharmacist.
- **Checks interactions** against openFDA drug labels, with 73 cached pairs for
  when the network is down, including medicines from earlier doctors.
- **Shows the day.** A morning / afternoon / night plan built only from
  verified lines, plus per-medicine dose cards that can be printed.
- **Speaks Urdu.** Fixed Urdu sentences, replayable from a QR code.
- **Checks the strip.** Compares the medicine in hand with the prescription.
- **Works offline.** Five demo cases and saved prescriptions open with no network.

