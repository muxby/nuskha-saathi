# Nuskha Saathi — Dawa-Guard (Phase 1 and Phase 2)

Patient comprehension and clinical safety flags for a Pakistani prescription photo.
This repository slice is the deterministic engine. The vision model only reads the photo.

The model does not decide whether a line is safe. `safety_gate.py` does.

## What is implemented

- `backend/data/pk_formulary.json` — Pakistani brands, salts, dose ceilings, WHO AWaRe tier.
- `backend/data/pk_interactions_fallback.json` — critical salt pairs with verbatim openFDA excerpts.
- Brand resolver (`RapidFuzz`, phonetic normalization, score below 82 refuses).
- openFDA client that accepts generic salts only, with the local file as fallback.
- Gemini Vision extractor (`temperature=0`, JSON schema, one retry, then `REFUSED_BLURRY`).
- `POST /api/v1/scan-parchi` and `POST /api/v1/verify-strip`.

Dose ceilings block impossible OCR numbers such as 5000 mg levofloxacin. They are not a personal dose.

## APIs, models, and libraries

| Name | Role |
| :--- | :--- |
| Google Gemini Vision (`GEMINI_MODEL`, default `gemini-2.5-flash`) | Structured perception of the *parchi* or strip |
| openFDA Drug Label API | `drug_interactions`, `boxed_warning`, `contraindications` for a resolved salt |
| `pk_formulary.json` | Team-curated brand, salt, ceiling, and AWaRe table |
| `pk_interactions_fallback.json` | Cached verbatim openFDA excerpts used when the live API is down |
| FastAPI, Pydantic v2, Pillow, RapidFuzz, httpx | Service, schemas, crops, fuzzy match, HTTP |
| Uvicorn | Local server |

Uplift, Azure, WhatsApp, and Supabase are not in this slice.

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\uvicorn main:app --reload
```

Copy `.env.example` to `.env` for `OPENFDA_API_KEY` and `GEMINI_API_KEY`. The safety tests pass with no keys. A missing Gemini key fails closed to `REFUSED_BLURRY`.

`GET /health` returns the loaded brand and interaction counts.

## Clinical boundary

Nuskha Saathi does not diagnose, prescribe, or tell a patient to switch brands. A DRAP shortage note, when present, only names alternatives to ask a pharmacist about. Cabinet medicines on a scan are opt-in data supplied by the caller. This phase does not store them.
