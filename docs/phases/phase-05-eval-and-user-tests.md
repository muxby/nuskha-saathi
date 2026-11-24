# Phase 5 — Evaluation Benchmark and User Tests

**Day:** Wednesday 25 Nov 2026

**Depends on:** The live loop from Phases 1–4. Offline mode is already a fallback, not a substitute for these numbers.

**Goal:** Measured proof on real handwriting, then a hard feature freeze.

## Deliverables

- [ ] 30 real handwritten *parchis* from peers or medical students. No clean synthetic fonts.
- [ ] `backend/tests/run_eval_30.py` writes a results table the README and Dev Proof drawer can show.
- [ ] Top failures fixed only when they are safety or accuracy bugs inside the frozen contracts.
- [ ] Two short user clips: one pharmacist, one elderly relative or caregiver.
- [ ] **Feature freeze at 11:00 PM PKT.**

## Benchmark sets

| Subset | Count | Target | What a pass looks like |
| :--- | :---: | :--- | :--- |
| Standard Pakistani *parchis* | 15 | ≥ 90% brand-to-salt resolution | Brands such as Augmentin, Risek, Panadol, Glucophage, Concor, Leflox, Flagyl, Brufen, Disprin, Arinac resolve to the formulary salts |
| Deliberate illegible scribbles | 5 | 100% safe refusal | `REFUSED_BLURRY` (or unknown-drug if the gate fires first) and an amber crop. Zero invented medicine names |
| High-risk conflicts | 5 | 100% interaction recall | Warfarin+ibuprofen, ciprofloxacin+tizanidine, metronidazole+warfarin, sildenafil+nitrates, clarithromycin+simvastatin |
| Physical strip mismatches | 5 | 100% mismatch detection | Wrong milligram or wrong salt returns `STRENGTH_MISMATCH` or `WRONG_MEDICINE` |

Also record p50 `total_ms` and the estimated PKR per scan (target band about PKR 1–2, consistent with the ~USD 0.004 example in the spec).

Re-run `pytest backend/tests/test_safety_gate.py` after any gate or formulary edit. The boundary cases from Phase 2 stay green.

## Fix policy after the first full run

Fix, in order:

1. A scribble that produced a medicine name.
2. A high-risk pair that did not fire.
3. A strip mismatch that returned green.
4. Alias gaps that drop standard-set resolution under 90%.

Do not start a new feature. Pashto/Sindhi, extra charts, and account systems stay out.

## User clips

Each clip is one real person using the deployed URL on a phone:

- Pharmacist: shown a mismatch or an interaction banner and asked if the warning is clear.
- Relative of an older patient: shown the Sun/Moon card and the speaker, without a coaching script.

Keep the quotes for the pitch. Get consent on camera before filming.

## 2-hour cut

If collecting all 30 photos stalls, lock the set you have into the four buckets, run the harness, and label the table with the real count. Do not backfill with synthetic images to make the number 30. Missing cells are listed as not yet collected, and collection continues only until 11:00 PM.

## Done when

- `run_eval_30.py` output is saved in the repo (JSON or Markdown table).
- Refusal, interaction recall, and strip mismatch are at the targets above, or the misses are written down with the line id and the fix that did not land before freeze.
- No new routes or screens after 11:00 PM PKT.
