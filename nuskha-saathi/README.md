# Nuskha Saathi (نسخہ ساتھی)

A bilingual prescription companion for Pakistani patients. Photograph a handwritten prescription, compare the source with the extracted information, check medicine identity, and replay Urdu instructions.

Vision reads the photograph. The deterministic safety engine resolves medicines and checks instructions. Uncertain names and doses require professional confirmation.

## Architecture & Experience

- **Pill-Portal Hero & Optical Filter:** Opening capsule aperture built with a hardware-accelerated WebGL glass refraction filter (`OpticalPrismFilter`), Midnight Navy (`#131D38`), Powder Blue (`#ADC7E9`), Warm Porcelain / High-Contrast Light & Midnight themes, and Rx Shield icons (`/icon.svg`, `/apple-icon.png`).
- **Pakistani Urdu Readability:** Full English (`LTR`) and Pakistani Urdu (`RTL`) interfaces using `Noto Naskh Arabic` alongside `Noto Nastaliq Urdu` fallbacks with generous line-height (`2.15–2.35`), clean zero-overlap spacing, and 48px primary touch targets across desktop and mobile (`390px+`).
- **Prescription Camera & Refusal Pipeline:** Live camera, capture/retake/review, gallery upload, camera permission handling, optional device torch, JPEG/PNG/WebP checks up to 8 MB, and EXIF-safe cropping on unreadable lines (`REFUSED_BLURRY`, `REFUSED_UNKNOWN_DRUG`, `REFUSED_DOSAGE_ANOMALY`).
- **Cross-Doctor Active Cabinet Sync:** Manage active ongoing medicines in **My medicines** (including 1-click *Seed Marevan 5mg* for the Amma Zubaida cross-doctor scenario), stored locally and synced with backend `/api/v1/cabinet/{patient_id}` so new scans check interactions against prior clinics automatically.
- **5-Case Clinical Demo & Offline Stage Suite:** Sample Pakistani clinical test cases covering cross-doctor Ibuprofen+Warfarin bleed risk, Sildenafil+Ismo nitrate emergency, 5000mg Leflox overdose refusal, unknown brand refusal, and all-clear typo resolution (`Augmntin` -> `Augmentin`), with automatic offline fallback when `?demo=offline` is set.
- **Visual Dosage Cards & Medicine Strip Verifier:** Distinguishes confirmed doses, explicit zeros (`0`), and unknown doses (`?`), individual printing, QR audio replay (`/audio/[scanId]`), WhatsApp composer share, Day-3 antibiotic WhatsApp preview & webhook simulation modal, and all 5 strip verification outcomes with explicit generic substitution caution.
- **Opt-In Developer Proof & Safety Benchmark:** Opt-in Settings toggle revealing returned latency timings, estimated request cost (USD/PKR), RapidFuzz scores, raw openFDA excerpts, and the live **30-Case Safety Benchmark** report from `/api/v1/benchmark`.

### Screenshots

These are actual screenshots of the production build. Homepages contain no fabricated patient records.

| English desktop | Urdu desktop |
| --- | --- |
| ![English desktop homepage](../docs/ui-redesign/screenshots/home-en-desktop.png) | ![Urdu desktop homepage](../docs/ui-redesign/screenshots/home-ur-desktop.png) |

| English mobile | Urdu mobile |
| --- | --- |
| ![English mobile homepage](../docs/ui-redesign/screenshots/home-en-mobile.png) | ![Urdu mobile homepage](../docs/ui-redesign/screenshots/home-ur-mobile.png) |

## Backend and API contracts

FastAPI endpoints in `backend/main.py`:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/scan-parchi` | Prescription extraction (Gemini / OpenRouter / FreeAPI ImgChat Vision), deterministic medicine resolution, overdose/interaction checks, MedSter pricing, Urdu script/audio, telemetry |
| `POST /api/v1/verify-strip` | Compare photographed blister strip against selected prescription medicine & strength |
| `POST /api/v1/vision/chat` | Multi-turn image Q&A / OCR via OpenRouter Vision or FreeAPI ImgChat |
| `GET /api/v1/medicines/search` | Search Pakistani brands & generic salts across local formulary + FreeAPI MedSter (`Rs.` prices) |
| `GET /api/v1/medicines/details` | Fetch full FreeAPI MedSter monograph + local formulary safety caps |
| `GET /api/v1/audio/{scan_id}` | Retrieve saved Urdu script and audio location for QR replay (supports cold-instance recovery for demo scans) |
| `POST /api/v1/tts/urdu` | Synthesize Pakistani Urdu MP3 on demand via Uplift Orator → Azure → Google TTS |
| `POST /api/v1/stt/urdu` | Transcribe Urdu/Roman-Urdu voice audio via Uplift Scribe → FreeAPI Transcribe → Gemini → OpenRouter |
| `GET /api/v1/scans/{scan_id}` | Retrieve a full persisted scan result by ID |
| `GET /api/v1/patients/{patient_id}/scans` | List saved scan summaries for a patient |
| `GET /api/v1/cabinet/{patient_id}` | Retrieve saved cross-doctor Active Cabinet medicines |
| `POST /api/v1/cabinet/{patient_id}` | Add medicine to Active Cabinet with automatic generic salt resolution |
| `DELETE /api/v1/cabinet/{patient_id}/{item_id}` | Remove a medicine from Active Cabinet |
| `GET /api/v1/demo-cases` | List the 5 sample Pakistani clinical demo cases |
| `POST /api/v1/demo-cases/{case_id}` | Run a deterministic clinical demo case through the safety engine |
| `GET /api/v1/whatsapp/reminders` | List saved/sent reminders and patient replies |
| `POST /api/v1/whatsapp/send-reminder` | Send Day-3 antibiotic or dose Urdu prompt (and optional Opus OGG voice note) via Twilio/Meta when configured |
| `GET /api/v1/whatsapp/webhook` | Verify Meta WhatsApp Cloud API webhook using `WHATSAPP_VERIFY_TOKEN` |
| `POST /api/v1/whatsapp/webhook` | Classify patient text or voice-note WhatsApp replies (`1` Continuing vs `2` Stopped/Side-effect escalation) |
| `GET /api/v1/benchmark` | Return results from the 30-case deterministic safety harness (`tests/eval_results.json`) |
| `GET /health` | Service readiness, `.env` capability flags, formulary size (`327` brands, `73` interaction pairs), and SQLite counts |
| `GET /admin` | Optional password-protected operational diagnostics panel (enabled when `ADMIN_MONITOR_PASSWORD` >= 16 chars in `.env`) |

### Disclosed models, datasets & libraries

- **Vision extraction (perception only):** Google Gemini (`GEMINI_API_KEY`) extracts line text, confidence, and bounding coordinates; it never makes clinical safety decisions.
- **Deterministic safety gate & datasets:** RapidFuzz brand normalization (`cutoff=82`), compiled Pakistani DRAP brand/salt formulary (`327` entries) with WHO AWaRe classifications and daily max dose ceilings, openFDA Drug Label API (`fda.gov`) plus cached verified label excerpts (`73` interaction pairs). Neither FDA nor WHO endorses this application.
- **Frameworks & infrastructure:** FastAPI, Pydantic, Pillow, httpx, Next.js 16, React, Lucide Icons, custom WebGL GLSL shader Hero (`THREE`-free lightweight procedural WebGL canvas), local SQLite runtime persistence (`backend/data/nuskha_local.db`, plus optional Postgres reference schema in [`backend/sql/supabase_schema.sql`](backend/sql/supabase_schema.sql)), Playwright, `@axe-core/playwright`.
- **Voice & messaging order:** Server Urdu audio order is Uplift Orator → Azure Speech → Google TTS (falls back to browser Urdu speech synthesis when TTS keys are unset; never substitutes English voice for Urdu clinical guidance). Urdu voice transcription tries Uplift Scribe → Gemini Audio. WhatsApp reminders stay explicitly disabled (`whatsapp_scheduled: false`) until real Twilio/Meta credentials are connected in `.env`.

## Run locally (Everything configured in `.env`)

All backend configuration and API keys live in **`backend/.env`** (or `.env` in this directory).

1. Fill in your API keys inside `backend/.env` (created from `backend/.env.example`):
   - `OPENROUTER_API_KEY` or `GEMINI_API_KEY`: vision extraction (`VISION_PRIMARY=auto` tries Gemini → OpenRouter → FreeAPI ImgChat).
   - `FREEAPI_BASE_URL=https://freeapi.pro`: powers **MedSter** (`MEDSTER_LIVE=true`), **ImgChat** (`FREEAPI_IMGCHAT_ENABLED=true`), and **Transcribe** (`FREEAPI_TRANSCRIBE_ENABLED=true`) with zero signup.
   - `OPENFDA_API_KEY` *(optional)*: raises live openFDA rate limits to 240 req/min (`OPENFDA_LIVE=true`).
   - `UPLIFT_API_KEY` & `UPLIFT_VOICE_ID` *(optional)*: Pakistani Urdu MP3 voice synthesis & Scribe STT, with optional fallbacks `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` and `GOOGLE_TTS_API_KEY`.
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` **or** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` *(optional)*: enables live WhatsApp reminders and webhook replies.
   - `ADMIN_MONITOR_PASSWORD` *(optional, >=16 chars)*: unlocks `/admin` diagnostics.

2. Start the FastAPI backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python main.py
```

On Windows PowerShell (or run both backend + frontend together with `.\start.ps1` / `./start.sh`):

```powershell
.\start.ps1
```

3. In another terminal, start the Next.js frontend:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`; FastAPI runs at `http://localhost:8000` (API docs at `http://localhost:8000/docs` and capability status at `http://localhost:8000/health`). Camera capture requires localhost or HTTPS.

### Optional Docker run

You can also run the self-contained backend container with your `.env` file (`ffmpeg` included for WhatsApp Opus OGG voice conversion):

```bash
cd backend
docker build -t nuskha-saathi-api .
docker run --rm -p 8000:8000 --env-file .env nuskha-saathi-api
```

## Verification

```bash
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python -m tests.run_eval_30
```

With the frontend running, execute in `frontend/`:

```bash
npm run typecheck
npm run test:ui
npm run build
npm audit --omit=dev
```

The UI suite uses installed Google Chrome by default. Set `UI_TEST_BROWSER=chromium` after `npx playwright install chromium` to use Playwright's browser. `UI_TEST_BASE_URL` changes the origin; `UI_TEST_OUTPUT` changes the artifact directory (default `/tmp/nuskha-ui-results`). The browser suite intercepts API requests with explicit test fixtures; the application never imports those fixtures. It exercises real browser media playback, simulated camera capture, safety/verification states, and accessibility checks.

[Verification results, tested limits, and milestone commits](../docs/ui-redesign/verification.md) · [Machine-readable browser report](../docs/ui-redesign/browser-report.json)

## Verified Test Coverage & Honest Limits

- **Backend tests (`pytest`):** Covers formulary matching, confidence lock (`<0.85` refusal), overdose ceiling blocking (`5000mg` Leflox), openFDA salt-only queries, cabinet CRUD + auto-merge, `.env` configuration & runtime path overrides, TTS/STT endpoints, WhatsApp honest unconfigured/webhook checks, serverless `/tmp` storage, and demo QR cold recovery.
- **Deterministic 30-Case Safety Benchmark (`python -m tests.run_eval_30`):** `30/30 passed` across 15 Pakistani brand extractions, 5 illegible/low-confidence refusals, 5 high-risk interactions, and 5 strip swaps/overdose ceilings. *Note: This harness measures the deterministic clinical engine offline (non-VLM latency); real-world prescription photos add Gemini Vision inference latency and still require pharmacist/clinician validation.*
- **Frontend checks:** `tsc --noEmit` clean, `next build` clean, `19/19` Playwright + axe-core WCAG 2.0/2.1/2.2 AA checks.
- **Honest Limits:** Outbound WhatsApp reminders require Twilio or Meta credentials in `.env`. Live handwriting accuracy across diverse clinicians, Uplift/Azure/Google audio quality when credentials are supplied, physical smartphone cameras/torch, and regional languages need device/credential-backed acceptance testing.

Follow the treating clinician's instructions. Ask a pharmacist to confirm unclear wording before taking medicine. The app does not diagnose, prescribe, or authorize changing medicines.
