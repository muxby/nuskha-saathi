# Nuskha Saathi — Dawa-Guard

Patient comprehension and clinical safety flags for a Pakistani prescription photo.
The vision model only reads the photo. The safety engine makes the clinical decisions.

The model does not decide whether a line is safe. `safety_gate.py` does.

## What is implemented

- `backend/data/pk_formulary.json` — Pakistani brands, salts, dose ceilings, WHO AWaRe tier.
- `backend/data/pk_interactions_fallback.json` — critical salt pairs with verbatim openFDA excerpts.
- Brand resolver (`RapidFuzz`, phonetic normalization, score below 82 refuses).
- openFDA client that accepts generic salts only, with the local file as fallback.
- Gemini Vision extractor (`temperature=0`, JSON schema, one retry, then `REFUSED_BLURRY`).
- `POST /api/v1/scan-parchi` and `POST /api/v1/verify-strip`.
- Responsive Urdu RTL PWA with camera upload, safety and dose cards, strip verification, QR audio replay, and Dev Proof.
- Urdu speech via Uplift Orator, Azure, Google, then browser speech when server audio is unavailable.

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

WhatsApp and Supabase are planned for a later phase. Regional audio is queued pending native clinical validation.

## Run

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
.venv/bin/uvicorn main:app --reload
```

On Windows, use `.venv\Scripts\` instead of `.venv/bin/`. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Add `UPLIFT_API_KEY` and `UPLIFT_VOICE_ID` for Pakistani Urdu MP3; Azure and Google keys are optional fallbacks. The safety tests pass without keys. A missing Gemini key fails closed to `REFUSED_BLURRY`.

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The backend runs at `http://localhost:8000`. For deployment, set `NEXT_PUBLIC_API_BASE_URL` in the frontend to the public backend HTTPS origin and `FRONTEND_BASE_URL` in the backend to the public PWA origin. Deploy `frontend/` as the Vercel project root and run the backend container on a persistent host. The QR replay endpoint currently stores audio and script on local disk, so production hosting needs persistent storage or a single persistent backend instance for replay to survive restarts.

`GET /health` returns the loaded brand and interaction counts.

## Clinical boundary

Nuskha Saathi does not diagnose, prescribe, or tell a patient to switch brands. A DRAP shortage note, when present, only names alternatives to ask a pharmacist about. Cabinet medicines on a scan are opt-in data supplied by the caller. This phase does not store them.
