# Phase 2 — Vision and Safety Gates

**Day:** Sunday 22 Nov 2026

**Depends on:** Phase 1 formulary, ceilings, and interaction client.

**Goal:** A photo becomes a deterministic scan response. The model extracts. The gate decides.

## Deliverables

- [ ] `backend/services/vision_extractor.py` — Gemini JSON extraction and Pillow `bbox_1000` crop.
- [ ] `backend/schemas/vision.py` — Pydantic contract for extraction.
- [ ] `backend/schemas/responses.py` — scan, strip, and telemetry contracts.
- [ ] `backend/services/safety_gate.py` — three locks, no LLM calls inside this module.
- [ ] `backend/routers/scan.py` — `POST /api/v1/scan-parchi` and `POST /api/v1/verify-strip`.
- [ ] `backend/services/urdu_formatter.py` — fixed Urdu strings (ASCII brands, Western digits).
- [ ] `backend/tests/test_safety_gate.py`.
- [ ] `backend/Dockerfile` from `python:3.11-slim` with `ffmpeg` installed (needed from this day so Phase 4 does not discover it late).
- [ ] `backend/main.py` — FastAPI app, CORS, static audio and strip mounts.

## Vision request rules

- Model: Gemini 2.5 / 3.1 Flash Vision.
- `response_mime_type = "application/json"`.
- `temperature = 0.0`.
- Strict `response_schema`.
- One retry on malformed output. Second failure → `REFUSED_BLURRY` for the image. Do not parse prose.

Extraction object:

```json
{
  "extracted_lines": [
    {
      "raw_text": "Tab Leflox 500mg 1xOD x 5 days PC",
      "brand_or_salt_guess": "Leflox",
      "strength_mg": 500,
      "dosage_form": "tablet",
      "morning_qty": 1,
      "afternoon_qty": 0,
      "night_qty": 0,
      "meal_timing": "after_food",
      "duration_days": 5,
      "ocr_confidence": 0.94,
      "bbox_1000": [210, 120, 295, 840]
    }
  ],
  "image_quality_warning": false
}
```

`bbox_1000` is `[ymin, xmin, ymax, xmax]` on a 0–1000 grid. Pillow crops that region for every refusal.

## Safety locks

| Condition | Status |
| :--- | :--- |
| `ocr_confidence < 0.85` | `REFUSED_BLURRY` |
| RapidFuzz score `< 82` | `REFUSED_UNKNOWN_DRUG` |
| `strength_mg > max_single_dose_mg` or daily total `> max_daily_dose_mg` | `REFUSED_DOSAGE_ANOMALY` |

Refused lines return the crop and Urdu refusal text. They do not return a dosing schedule or dosing audio.

## Scan response (shape the frontend will bind to)

Top-level fields: `scan_id`, `patient_id`, `overall_status`, `medications`, `interactions`, `audio_urdu_url`, `audio_qr_payload`, `whatsapp_scheduled`, `telemetry`.

Verified medication fields: `line_id`, `status=VERIFIED`, `brand_matched`, `fuzzy_score`, `generic_salts`, `strength_mg`, `schedule` (`morning`, `afternoon`, `night`, `meal_timing`, `duration_days`), `who_aware_tier`, `requires_day3_checkin`, `drap_shortage_alert`, `strip_verified`, `strip_thumbnail_url`.

Interaction fields: `severity`, `drug_a`, `drug_b`, `source`, `fda_verbatim_excerpt`, `urdu_warning`.

Telemetry fields: `vision_ms`, `resolver_ms`, `openfda_ms`, `tts_ms`, `total_ms`, `estimated_cost_usd`, `estimated_cost_pkr`. Record each stage with `time.perf_counter()`. TTS milliseconds may be 0 until Phase 3.

`overall_status = ACTION_REQUIRED` when any line is refused or any interaction is `HIGH`.

## Strip response

`verification_status` is one of `EXACT_MATCH`, `GENERIC_EQUIVALENT_MATCH`, `STRENGTH_MISMATCH`, `WRONG_MEDICINE`, `UNREADABLE_STRIP`.

Body includes `scan_id`, `matched_line_id`, `expected`, `detected_on_strip`, `strip_thumbnail_url`, `urdu_verdict`, `audio_urdu_url`.

Wrong-strength Urdu (fixed): *"RUK JAIYE! Doctor ne Leflox 500 mg likhi thi, lekin aap ke haath mein 250 mg strip hai. Pharmacist ko wapas dikhayein."* Substitute the actual brand and strengths from the verified line and the strip read.

A line that is not `VERIFIED` cannot become a match.

## Pytest cases that must pass today

- Confidence `0.84` refuses. `0.85` passes the blur lock.
- Levofloxacin `5000 mg` returns `REFUSED_DOSAGE_ANOMALY`.
- `Augmntin` resolves to `amoxicillin + clavulanate`.
- Cabinet or same-parchi pair ibuprofen + warfarin returns the FDA excerpt from the live client or the fallback file.
- Strip 250 mg vs parchi 500 mg returns `STRENGTH_MISMATCH`.

## 2-hour cut

If Gemini schema work stalls past two hours, freeze the Pydantic models to the JSON above and stop adding fields. Bad formatting retries once, then refuses. Do not add a free-text recovery parser.

Strip verification can return `UNREADABLE_STRIP` for every strip until the extractor is stable, as long as the mismatch unit test is fed structured inputs and passes.

## Done when

- `pytest backend/tests/test_safety_gate.py` is green.
- A sample image with one clear line and one scribble returns one `VERIFIED` line and one `REFUSED_BLURRY` line with a crop.
- No code path queries `openFDA` with a brand name.
