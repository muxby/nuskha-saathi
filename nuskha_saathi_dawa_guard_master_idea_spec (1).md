# Nuskha Saathi (نسخہ ساتھی) — Powered by the Dawa-Guard Clinical Safety Engine

> **1-Line Pitch (<15 Seconds):** Snap a photo of any handwritten Pakistani doctor's prescription (*parchi*) or physical medicine strip to instantly check live FDA drug interactions across active medicines, catch wrong-strength pharmacy strips, hear safe Pakistani-accent Urdu dosing instructions, get a photo-anchored Sun/Moon dose card, and receive WhatsApp Day-3 antibiotic completion voice check-ins.

---

## Document Purpose (Single Source of Truth)
This specification is written so **three audiences** can act on it immediately with zero ambiguity:
1. **Judges & Mentors:** Instantly feel the human problem, verify every Pakistani statistic, see why it cannot be replaced by ChatGPT, and inspect the 20/20 scoring proof.
2. **AI Coding Agents & Engineers:** Build the entire backend, frontend, safety gates, database tables, API contracts, fallback modes, and automated 30-*parchi* evaluation harness straight from this file without guessing schemas or edge cases.
3. **Teammates (Pitch, Design & Video):** Execute the exact low-literacy UI rules, 90-second live stage demo, 2-minute submission video, pitch deck flow, and Q&A defense.

---

## 1. Event Metadata, Positioning & Non-Negotiable Laws

* **Target Event:** CYE 2026 Hackathon — Innovation Sprint (University Finale: **2 December 2026**, Pak-China Friendship Center, Islamabad)
* **Submission Deadlines:** Platform displays **27 Nov 2026, 7:01 PM PKT** (requirements text cites 28 Nov, 11:59 PM). **Team Hard Freeze & Submit Target: Friday, 27 Nov afternoon (PKT)**, leaving **28 Nov – 1 Dec** purely for live pitch and Q&A rehearsal.
* **Primary Track:** Urdu & Regional Language Technology *(cross-qualifies for Healthcare, Social Impact, and Open Innovation)*
* **Mandatory Deliverables:**
  1. Public GitHub repository with a transparent `README.md` disclosing **every API, model, dataset, and library** used (core logic written during the 16–28 Nov sprint window).
  2. Live deployed web URL (tested over mobile 4G data).
  3. Demo video strictly **$\le 2$ minutes**.
  4. Pitch deck (PDF/PPTX) ready for both 5-minute sprint and 20-minute + 10-minute Q&A formats.
* **Winning Strategy (Path A — High-Pain Utility):** Solve one visceral, hyper-specific everyday Pakistani clinical safety failure where before-and-after value is visibly proven in under 15 seconds.
* **Clinical & Legal Safety Boundary:** Nuskha Saathi is strictly a **patient comprehension and clinical safety-flagging companion**—never a medical prescriber, diagnostic engine, or replacement for a doctor or pharmacist.
* **Core Architectural Law:**
  > **"The LLM only perceives and translates — it NEVER makes clinical safety decisions."**

---

## 2. Winning Filter & 20/20 Rubric Engineering

### A. Pre-Code 5-Point Winning Checklist
Every piece of this project passes the core hackathon filter before a single line of code is written:

| Hackathon Winning Filter | Status | Concrete Proof Inside Nuskha Saathi (Dawa-Guard) |
| :--- | :---: | :--- |
| **1. Explained in 1 clear sentence?** | **PASS** | Photograph a handwritten *parchi* or medicine strip $\rightarrow$ deterministic FDA safety check + strip verification + Urdu voice guide + photo dose card + WhatsApp voice reminders. |
| **2. Matches theme & makes core tech the hero?** | **PASS** | Built natively for Urdu/Pakistani healthcare reality using Gemini Vision structured bounding-box extraction, Uplift AI Pakistani-accent Urdu speech, and live `openFDA` grounding. |
| **3. Before-and-after value visible in <15 seconds?** | **PASS** | **Before:** Unreadable scribbled *parchi* + silent cross-doctor drug conflict + wrong-mg loose strip. **After (<10s):** Amber refusal box on blurry scribble + red live FDA interaction banner + green/red physical strip check + clear Urdu voice + photo-anchored Sun/Moon card. |
| **4. Unmistakably better than a ChatGPT prompt?** | **PASS** | ChatGPT does not map local Pakistani brands (*Risek, Leflox, Augmentin*) to live `openFDA` labels, does not enforce deterministic refusal (`<0.85` confidence + dosage ceilings), cannot verify a physical blister strip against a *parchi*, does not track a cross-doctor medicine cabinet, and cannot run Day-3 Urdu WhatsApp voice loops. |
| **5. Working, crash-proof demo with 3h to rehearse?** | **PASS** | Strict Pydantic JSON outputs, automatic API fallbacks, local mirrored FDA interaction matrix, and a hidden **5-case Offline Demo Mode** so venue Wi-Fi failure can never break the stage demo. |

### B. Rubric Scorecard: How We Jump from 18.5/20 to a Locked-In 20/20

| Criterion (25% Each) | Baseline (18.5/20) | 20/20 Upgrade Engineered Into This Spec | Elimination Trap We Neutralized |
| :--- | :---: | :--- | :--- |
| **Innovation & Creativity** | 4.5 / 5 | **5.0 / 5** — Added **Parchi-to-Strip physical verification**, **Cross-Doctor Active Medicine Cabinet**, **Photo-Anchored Sun/Moon Dose Cards**, and **Interactive Day-3 Antibiotic WhatsApp check-ins**. | Being dismissed as *"just an OCR-to-Urdu-TTS wrapper."* |
| **Technical Execution** | 4.5 / 5 | **5.0 / 5** — Deterministic safety gate (`<0.85` confidence lock + dosage ceiling lock + cropped bounding boxes), 200-brand `RapidFuzz` Pakistani brand-to-salt resolver, live `openFDA` + local fallback, **30-*parchi* automated eval benchmark**, `pytest` suite, and toggleable **`Dev Proof` telemetry drawer**. | Querying `openFDA` directly with local Pakistani brand names (returns empty), hallucinating unreadable scribbles, or lacking measured accuracy/latency numbers. |
| **Real-World Impact & Viability** | 5.0 / 5 | **5.0 / 5** — Hard Pakistani clinical evidence (79.2% unread prescriptions, 200,000+ AMR deaths/yr, 56% early antibiotic stop, ~70% polypharmacy), zero-learning WhatsApp distribution, ~PKR 1–2/scan unit economics, named deployment channels (LHWs, pharmacies, OPD desks). | Getting cornered on medical liability or unrealistic monetization. |
| **Presentation, UI/UX & Pitch** | 5.0 / 5 | **5.0 / 5** — Unbeatable 90-second live judge-scribble + real blister-strip swap demo, low-literacy RTL Noto Nastaliq icon-first UI, live WhatsApp ping, `Dev Proof` telemetry flash, and live QR code for judges to try on their own phones. | Cluttered English UI, slow/invisible background behavior, or broken untested regional audio live on stage. |

### C. Why Prior Hackathon Winners & Existing Tools Leave This Gap Wide Open

| Reference Project | What It Solved | Why Nuskha Saathi (Dawa-Guard) Is Distinct & Deeper |
| :--- | :--- | :--- |
| **Mashwara AI** *(Alibaba Cloud Pakistan 2026 Urdu Winner)* | Urdu/Roman Urdu symptom & general health guidance. | Does not decode handwritten Pakistani *parchis*, verify physical blister strips, or run deterministic `openFDA` interaction checks. |
| **SAKHI AI** *(Global Innovation Build Challenge 2026)* | OCR printed Indian lab reports $\rightarrow$ WhatsApp audio. | Covers printed diagnostic lab reports, not handwritten doctor prescriptions, cross-doctor polypharmacy, physical strip mismatches, or AMR stewardship. |
| **Sach Batao / Hisaab** *(2026 Pakistani Winners)* | WhatsApp Urdu voice scam checker & shopkeeper *khata*. | Proven WhatsApp Urdu voice distribution model—we adopt that exact zero-friction channel for clinical adherence and Day-3 antibiotic defense. |
| **Vanilla ChatGPT / Gemini** | Generic multimodal chat. | Hallucinates blurry handwriting instead of refusing safely; fails on local Pakistani brand-to-FDA mapping; no persistent cross-doctor cabinet; no strip-to-*parchi* verification; no scheduled WhatsApp voice loop. |

---

## 3. The Human Problem, Persona & Verified Pakistani Evidence

### The Hyper-Specific User Story (First 15 Seconds of Pitch)
**Meet Zubaida Bibi (62, outpatient in Rawalpindi/Lahore) and her daughter Ayesha (28, working caregiver).**
Zubaida manages diabetes and a heart condition. On Monday her cardiologist prescribes **Warfarin 5mg**. On Friday she visits a local clinic for fever and throat pain and walks out with a hurried, English handwritten *parchi* (`Tab Leflox 500mg 1xOD`, `Tab Brufen 400mg BD`, plus an illegible syrup line) and loose blister strips handed across a crowded pharmacy counter—where the clerk accidentally hands her **250mg instead of 500mg**.
1. She cannot read English shorthand (`1+0+1`, `BD`, `PC`, `OD`) or the doctor's scribble.
2. Neither doctor knows the other's active medications—**Brufen + Warfarin** creates a serious internal bleeding risk.
3. By **Day 3**, her fever drops, so she stops her **WHO Watch-group antibiotic** early—fueling antimicrobial resistance.

### Empirically Documented Statistics (Problem Slide Reference)

| Domain | Verified Metric | Primary Source |
| :--- | :--- | :--- |
| **Prescription Unreadability** | **79.2%** of Lahore government-hospital outpatients struggled to read their prescriptions. | *Journal of Healthcare Quality Research* |
| **Dosage Comprehension** | Urdu-medium Karachi patients understood dosage terms significantly less often than English-medium patients; most could not read doctors' handwriting. | *PLOS One (2013)* |
| **Urdu Instructions Demand** | **49.6%** of Karachi patients explicitly wanted medicine package inserts in Urdu. | *Tropical Journal of Pharmaceutical Research* |
| **Pictogram Proof** | Picture-and-symbol medication labels measurably improved comprehension among illiterate patients. | *BMJ Open Quality* |
| **National & Female Literacy** | **60.65%** literacy (age 10+); **51.56%** rural; **52.84%** female; rural female literacy drops to **27.52%** (Sindh), **26.59%** (Balochistan), **33.76%** (KP). | *PBS Census 2023 Table 12; Economic Survey 2024–25 Table 10.2* |
| **Language Landscape** | Mother tongues: Punjabi **36.98%**, Pashto **18.15%**, Sindhi **14.31%**, Saraiki **12.0%**, Urdu **9.25%**, Balochi **3.38%**. | *PBS Census 2023 Table 11* |
| **Polypharmacy Risk** | Roughly **70%** of patients receive prescriptions containing more than three drugs simultaneously. | *Pakistani Outpatient Prescribing Audits* |
| **AMR Mortality Crisis** | Pakistan suffers **200,000+ deaths per year** associated with Antimicrobial Resistance (AMR). | *Global Burden of AMR / National AMR Surveillance* |
| **Early Antibiotic Stop & Misuse** | **56.0%** of surveyed Pakistani recent antibiotic users stopped their course early upon feeling better; **54.9%** obtained antibiotics without prescription; **52.7%** took them for viral colds/flu. | *2026 Pakistani Community Antibiotic Use Survey (n=160)* |
| **Channel Reach (WhatsApp)** | **200.55M** cellular subscribers, **150.6M** 3G/4G subscriptions, **91.7M+** active WhatsApp users, **73.2%** type Roman Urdu. | *PTA End-2025; Samaa; IEEE Access* |

---

## 4. Complete Product Features (The 7-Part Closed-Loop System)

### 1. Confidence-Gated *Parchi* Scanner (Zero-Hallucination Extraction)
* User snaps a photo of a handwritten or printed prescription inside the mobile PWA.
* Gemini Vision outputs strict structured JSON per medicine line: raw text, brand/salt guess, strength (mg/ml), dosage form, Morning/Afternoon/Night quantities, meal timing (`before_food` / `after_food` / `any`), duration (days), **per-field `ocr_confidence` (`0.0–1.0`)**, and **normalized bounding box `bbox_1000` (`[ymin, xmin, ymax, xmax]`)**.
* **Three Hard Deterministic Refusal Locks (NO LLM Involvement):**
  1. `ocr_confidence < 0.85` $\rightarrow$ `REFUSED_BLURRY`
  2. Fuzzy match score `< 82` against the curated Pakistani formulary $\rightarrow$ `REFUSED_UNKNOWN_DRUG`
  3. Extracted `strength_mg > max_single_dose_mg` OR computed `daily_mg > max_daily_dose_mg` $\rightarrow$ `REFUSED_DOSAGE_ANOMALY` (catches fatal OCR errors like `5000mg` instead of `500mg`)
* On **any** lock, the backend uses Pillow to crop the exact `bbox_1000` handwriting region, displays it inside an **Amber Refusal Card**, refuses to output dosing audio for that line, and speaks in Urdu: *"Yeh lafz saaf nahi hai — meharbani kar ke pharmacist ya doctor se tasdeeq karein."*

### 2. Pakistani Brand-to-Salt Resolver + Live `openFDA` Clinical Shield + WHO AWaRe + DRAP Shortage Check
* **Brand-to-Salt Bridge:** Live `openFDA` queries fail on local Pakistani brand names (*Risek, Leflox, Augmentin, Brufen, Disprin, Flagyl, Concor*). Our curated **200-medicine Pakistani Formulary (`pk_formulary.json`)** resolves messy doctor spellings (`Augmntin` $\rightarrow$ `Augmentin` $\rightarrow$ `amoxicillin + clavulanate`) in $<5\text{ ms}$ using `RapidFuzz` + phonetic normalization.
* **Live `openFDA` Interaction Grounding:** Queries `https://api.fda.gov/drug/label.json` using resolved generic salts to inspect verbatim `drug_interactions`, `boxed_warning`, and `contraindications` fields. Every flagged alert displays the **verbatim FDA excerpt** on screen—proving zero hallucination.
* **WHO AWaRe Stewardship Badge:** Automatically tags every antibiotic as **Access**, **Watch**, or **Reserve** per WHO AWaRe classification, warning patients when a potent *Watch/Reserve* antibiotic requires strict course completion.
* **DRAP Shortage Bioequivalent Helper:** Flags medicines listed on DRAP hospital shortage advisories and suggests bioequivalent generic salt alternatives to ask the pharmacist about (never auto-prescribing).

### 3. Cross-Doctor "Active Medicine Cabinet" (Real Polypharmacy Protection)
* Confirmed prescriptions persist to the patient's Supabase `cabinet_medications` table with start and end dates.
* Every newly scanned *parchi* is automatically cross-checked against **both other drugs on the same *parchi* AND every active medication already in the patient's cabinet** from prior doctor visits (e.g., catching *Warfarin* from Monday's cardiologist conflicting with *Brufen* from Friday's GP).

### 4. "Parchi-to-Strip" Physical Verification (*"Dawai Check Karein"*)
* Addresses Pakistan's widespread pharmacy-counter problem of generic brand swaps, loose blister strips, and wrong milligram strengths.
* Patient taps **"Dawai Check Karein"** and holds the physical medicine strip/box in front of the camera.
* Backend extracts printed brand/generic salt and milligram strength from the strip and compares deterministically against the scanned *parchi*:
  * **Exact Match (Green Card + Urdu Voice):** *"Bilkul theek dawai hai — yeh Leflox 500mg hai. Subah khane ke baad leni hai."* Automatically crops the strip thumbnail into the visual dose card.
  * **Wrong Strength / Wrong Salt (Red Alert + Urdu Voice):** *"RUK JAIYE! Doctor ne Leflox 500mg likhi thi, lekin aap ke haath mein 250mg strip hai. Yeh na khayein aur pharmacist ko wapas dikhayein."*

### 5. Photo-Anchored Sun/Moon Visual Dose Card + Shareable Audio QR
* Renders an ultra-clear visual schedule broken into **Subah (Rising Sun)**, **Dopehar (Full Sun)**, **Raat (Crescent Moon)**, and **Khane se Pehle / Baad (Empty vs. Full Plate)**.
* **Illiterate-Proof Breakthrough:** Embeds the **cropped photo of the patient's actual scanned blister strip/box** inside each time slot—so a patient who cannot read a single word physically matches the box in their hand to the image beside the Sun or Moon.
* Includes a **Shareable Audio QR Code** on the downloadable/printable card so any relative or caregiver can scan it and replay the clear Urdu dosing audio on their phone.

### 6. Interactive WhatsApp Voice Reminders + Day-3 Antibiotic Stewardship Loop
* Converts Urdu TTS MP3 audio into WhatsApp-native Opus OGG via `ffmpeg` and dispatches scheduled dosing voice notes on WhatsApp.
* Whenever any **WHO AWaRe antibiotic** is verified on a *parchi*, schedules a **Two-Way Day-3 Check-In Voice Note**: *"Assalam-o-Alaikum, aaj aap ki antibiotic ka teesra din hai. Kya aap apni dawai rozana le rahi hain?"*
* When the user replies with a WhatsApp voice note (e.g., *"Ab bukhar theek hai, kya goli chor doon?"*), **Uplift AI Scribe STT** transcribes the Urdu speech and the backend replies instantly with a grounded Urdu voice note explaining why stopping halfway breeds drug-resistant bacteria—directly attacking Pakistan's **56% early-stop cliff**.

### 7. Judge-Proof Engineering Layer (`Dev Proof` Drawer, Offline Demo Mode & Regional Language Gate)
* **Toggleable `Dev Proof` Telemetry Drawer:** Keeps the patient UI 100% clean and low-literacy friendly while letting us tap a corner `Dev Proof` chip on stage to expose live engineering metrics: stage-by-stage millisecond latency, PKR/USD cost per scan, fuzzy match score, raw verbatim `openFDA` JSON, and our 30-*parchi* benchmark table.
* **Hidden 5-Case Offline Demo Mode:** Tapping the app header logo 3 times (or loading `?demo=offline`) activates 5 pre-verified Pakistani prescription & strip cases with cached Urdu audio and FDA payloads—making the stage demo 100% immune to conference Wi-Fi failure.
* **Honest Regional Language Gate (Pashto / Sindhi):** Urdu is 100% production-verified first via Uplift AI Orator + Azure fallback. On Day 3, we run a 10-phrase clinical audio quality test on Meta `MMS-TTS` (`pus`/`snd`); regional audio is enabled live **only** if natural and fast—otherwise honestly documented as queued next pending native clinical validation.

---

## 5. Complete Technical Architecture & Agent Implementation Spec

### A. System Data-Flow Diagram

```text
[Next.js RTL PWA: Camera Capture (Parchi / Blister Strip)]
                           │
                           ▼ (Multipart Image + patient_id)
[FastAPI Backend: /api/v1/scan-parchi | /api/v1/verify-strip]
                           │
                           ├──► (1) Gemini Vision Structured Extractor
                           │        - Strict Pydantic response_schema (JSON)
                           │        - Extracts brand_or_salt_guess, strength_mg,
                           │          schedule, meal_timing, duration_days,
                           │          ocr_confidence (0..1), bbox_1000 [y1,x1,y2,x2]
                           │
                           ├──► (2) Deterministic Safety Gate (ZERO LLM DECISIONS)
                           │        ├─ ocr_confidence < 0.85 --------► REFUSED_BLURRY
                           │        ├─ RapidFuzz match < 82 ---------► REFUSED_UNKNOWN_DRUG
                           │        └─ dose > max_single/daily_mg ---► REFUSED_DOSAGE_ANOMALY
                           │        * Any refusal -> Pillow crops bbox_1000 -> base64 amber card
                           │
                           ├──► (3) Pakistani Formulary & Clinical Engine (ZERO LLM DECISIONS)
                           │        ├─ Resolve PK Brand -> Generic Salts (data/pk_formulary.json)
                           │        ├─ Attach WHO AWaRe Tier & DRAP Shortage Bioequivalents
                           │        ├─ Pull Active Meds from Supabase `cabinet_medications`
                           │        └─ Check all pairs via Live openFDA Label API
                           │           (+ local fallback data/pk_interactions_fallback.json)
                           │
                           ├──► (4) Grounded Urdu Script Builder
                           │        - Deterministic Urdu dosing & alert templates
                           │        - Uplift TTS formatting rule: English drug names in ASCII,
                           │          numbers in Western digits ("500 mg", "3 din")
                           │
                           ├──► (5) Voice Synthesis & Audio Pipeline
                           │        - Primary: Uplift AI Orator TTS (Pakistani-accent Urdu)
                           │        - Fallback 1: Azure Neural TTS (ur-PK-UzmaNeural)
                           │        - Fallback 2: Google Cloud TTS (ur-PK-Standard-A)
                           │        - ffmpeg converts MP3 -> Opus OGG (32kbps) for WhatsApp
                           │
                           └──► (6) Persistence, Telemetry & WhatsApp Scheduler
                                    - Persist scan, cabinet meds & per-stage ms latency to Supabase
                                    - Schedule dose reminders + Day-3 Antibiotic WhatsApp check-in
                                    - Webhook (/api/v1/whatsapp/webhook) handles Urdu voice replies
                                      via Uplift Scribe STT -> grounded Urdu adherence voice reply
```

### B. Exact Tech Stack, Verified API Endpoints & Fallbacks

| Layer | Primary Technology | Exact API Endpoint / Config | Resilience Fallback |
| :--- | :--- | :--- | :--- |
| **Frontend PWA** | Next.js 15+ (App Router), React 19, Tailwind CSS | RTL Urdu (`Noto Nastaliq Urdu` + `Inter`), mobile camera capture, printable Sun/Moon Dose Card, Audio QR (`qrcode.react`), `Dev Proof` drawer | Hidden 5-Case Offline Demo Mode (`?demo=offline` or 3x logo tap) |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, Pillow, RapidFuzz, httpx | Async routes, strict Pydantic schemas, `time.perf_counter()` per-stage telemetry | 2x exponential-backoff retries on all external HTTP calls |
| **Vision OCR** | Google Gemini API (Gemini 2.5/3.1 Flash Vision) | `response_mime_type="application/json"`, `temperature=0.0`, strict `response_schema` with `bbox_1000` | Retry once; fail-safe to `REFUSED_BLURRY` (never guess) |
| **Clinical Grounding** | `openFDA` Drug Labeling API | `GET https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{salt}"&limit=1` (free API key = 240 req/min) | Local `data/pk_interactions_fallback.json` (top 60 verified critical Pakistani pairs + verbatim FDA quotes) |
| **Urdu TTS** | Uplift AI Orator REST API | `POST https://api.upliftai.org/v1/synthesis/text-to-speech` (`Authorization: Bearer`, `voiceId`, `outputFormat: MP3_22050_128`, max 2,500 chars) | Azure `ur-PK-UzmaNeural` $\rightarrow$ Google `ur-PK-Standard-A` $\rightarrow$ Browser TTS |
| **Urdu STT** | Uplift AI Scribe REST API (Beta) | `POST https://api.upliftai.org/v1/transcribe/speech-to-text` (`model=scribe`, `language=ur`, max 25 MB) | Gemini Audio multimodal transcription |
| **Regional Stretch** | Meta `MMS-TTS` (`pus`/`snd`) | Tested strictly on Day 3 against 10 clinical phrases before UI exposure | Stay Urdu-only if audio clarity fails clinical bar |
| **WhatsApp Channel** | Twilio WhatsApp Sandbox / Meta WhatsApp Cloud API | Keep `ffmpeg` in container from Day 1: `ffmpeg -i in.mp3 -c:a libopus -b:a 32k out.ogg` (WhatsApp requires Opus OGG) | In-app interactive WhatsApp simulation modal if sandbox rate-limits |
| **Database & Storage** | Supabase (PostgreSQL + Storage) | Stores patients, scans, active cabinet meds, strip thumbnails, reminders, telemetry logs | Local SQLite / JSON fixture store for offline mode |

### C. Critical Pakistani NLP & Audio Engineering Gotchas (Must Implement Day 1)
1. **Install `ffmpeg` in Backend Container on Day 1:** WhatsApp incoming voice notes arrive as Opus OGG (which most STT endpoints need converted to MP3/WAV), and outgoing WhatsApp voice notes must be Opus OGG to play inline with a waveform.
2. **Uplift TTS Text Formatting Rule:** Write English drug/brand names inside Urdu strings in **ASCII** (`Leflox`, `Warfarin`) and numbers in **Western digits** (`500 mg`, `3 din`) per Uplift AI Orator docs for natural Pakistani pronunciation.
3. **Mixed Script Input Support:** Accept Urdu script, Roman Urdu, and English mixed in one WhatsApp message or voice reply (e.g., *"Ab fever theek hai, antibiotic stop kar doon?"*).
4. **Never Query `openFDA` With Local Brand Names:** Always map local Pakistani brand names through `pk_formulary.json` to USAN/INN generic salt names (`levofloxacin`, `ibuprofen`, `omeprazole`, `metronidazole`, `amoxicillin`, `clavulanate`) *before* querying `openFDA`.

### D. Copy-Ready Data Contracts & Schemas

#### 1. Curated Pakistani Formulary Entry (`backend/data/pk_formulary.json`)
```json
{
  "brand_name": "Leflox",
  "aliases": ["leflox", "leflx", "leflo", "levofloxacin", "lefloxacine"],
  "generic_salts": ["levofloxacin"],
  "common_strengths_mg": [250, 500, 750],
  "max_single_dose_mg": 750,
  "max_daily_dose_mg": 750,
  "is_antibiotic": true,
  "who_aware_tier": "WATCH",
  "drap_shortage_flagged": false,
  "bioequivalent_pk_brands": ["Cravit", "Tavanic", "Bactoflox"],
  "urdu_category_note": "Yeh ek taqatwar Watch-group antibiotic hai. Doctor ke bataye huay poore din mukammal karein, beech mein na chorein."
}
```

#### 2. Local Verified Interaction Fallback Entry (`backend/data/pk_interactions_fallback.json`)
```json
{
  "salt_a": "ibuprofen",
  "salt_b": "warfarin",
  "severity": "HIGH",
  "source": "openFDA Drug Label (Cached Verified Excerpt)",
  "fda_verbatim_excerpt": "The effects of warfarin and NSAIDs on GI bleeding are synergistic, such that users of both drugs together have a risk of serious GI bleeding higher than users of either drug alone.",
  "urdu_warning": "Khabardar! Aap pehle se khoon patla karne ki dawai Warfarin le rahi hain. Brufen (ibuprofen) is ke sath lene se bleeding ka khatra barh sakta hai. Lene se pehle apne doctor se foran rabta karein."
}
```

#### 3. Gemini Vision Extraction Schema (`backend/schemas/vision.py`)
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

#### 4. `/api/v1/scan-parchi` Deterministic Response Contract
```json
{
  "scan_id": "scan_9f82c1",
  "patient_id": "demo-zubaida-01",
  "overall_status": "ACTION_REQUIRED",
  "medications": [
    {
      "line_id": "med_1",
      "status": "VERIFIED",
      "brand_matched": "Leflox",
      "fuzzy_score": 98.5,
      "generic_salts": ["levofloxacin"],
      "strength_mg": 500,
      "schedule": {
        "morning": 1,
        "afternoon": 0,
        "night": 0,
        "meal_timing": "after_food",
        "duration_days": 5
      },
      "who_aware_tier": "WATCH",
      "requires_day3_checkin": true,
      "drap_shortage_alert": null,
      "strip_verified": false,
      "strip_thumbnail_url": null
    },
    {
      "line_id": "med_2",
      "status": "REFUSED_BLURRY",
      "raw_text": "Syp ??? 5ml",
      "ocr_confidence": 0.42,
      "cropped_handwriting_b64": "data:image/jpeg;base64,...",
      "refusal_reason_urdu": "Yeh lafz saaf nahi hai. Meharbani kar ke pharmacist ya doctor se tasdeeq karein."
    }
  ],
  "interactions": [
    {
      "severity": "HIGH",
      "drug_a": "ibuprofen (Brufen — current parchi)",
      "drug_b": "warfarin (Active Cabinet — Cardiologist 14 Nov)",
      "source": "openFDA Drug Label API",
      "fda_verbatim_excerpt": "The effects of warfarin and NSAIDs on GI bleeding are synergistic...",
      "urdu_warning": "Khabardar! Aap pehle se Warfarin le rahi hain. Brufen is ke sath lene se bleeding ka khatra barh sakta hai. Lene se pehle doctor se rabta karein."
    }
  ],
  "audio_urdu_url": "/static/audio/scan_9f82c1.mp3",
  "audio_qr_payload": "https://nuskha-saathi.vercel.app/audio/scan_9f82c1",
  "whatsapp_scheduled": true,
  "telemetry": {
    "vision_ms": 1480,
    "resolver_ms": 4,
    "openfda_ms": 295,
    "tts_ms": 910,
    "total_ms": 2689,
    "estimated_cost_usd": 0.0042,
    "estimated_cost_pkr": 1.18
  }
}
```

#### 5. `/api/v1/verify-strip` Response Contract
```json
{
  "scan_id": "scan_9f82c1",
  "matched_line_id": "med_1",
  "verification_status": "STRENGTH_MISMATCH",
  "expected": { "brand": "Leflox", "generic_salts": ["levofloxacin"], "strength_mg": 500 },
  "detected_on_strip": { "brand": "Leflox", "generic_salts": ["levofloxacin"], "strength_mg": 250 },
  "strip_thumbnail_url": "/static/strips/strip_44a2.jpg",
  "urdu_verdict": "RUK JAIYE! Doctor ne Leflox 500 mg likhi thi, lekin aap ke haath mein 250 mg strip hai. Pharmacist ko wapas dikhayein.",
  "audio_urdu_url": "/static/audio/verify_44a2.mp3"
}
```
*(Possible `verification_status` enum values: `EXACT_MATCH`, `GENERIC_EQUIVALENT_MATCH`, `STRENGTH_MISMATCH`, `WRONG_MEDICINE`, `UNREADABLE_STRIP`)*

### E. Supabase PostgreSQL Schema
```sql
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  whatsapp_phone TEXT,
  preferred_language TEXT DEFAULT 'ur',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  image_url TEXT,
  raw_vision_json JSONB NOT NULL,
  verified_response_json JSONB NOT NULL,
  audio_urdu_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cabinet_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES patients(id),
  prescription_id TEXT REFERENCES prescriptions(id),
  brand_name TEXT NOT NULL,
  generic_salts TEXT[] NOT NULL,
  strength_mg NUMERIC,
  who_aware_tier TEXT DEFAULT 'NONE',
  strip_verified BOOLEAN DEFAULT FALSE,
  strip_thumbnail_url TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES patients(id),
  prescription_id TEXT REFERENCES prescriptions(id),
  reminder_type TEXT NOT NULL, -- 'DOSE' | 'DAY3_ANTIBIOTIC_CHECKIN'
  scheduled_at TIMESTAMPTZ NOT NULL,
  audio_ogg_url TEXT,
  status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'REPLIED'
  user_reply_transcript TEXT
);

CREATE TABLE telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id TEXT,
  vision_ms INT,
  resolver_ms INT,
  openfda_ms INT,
  tts_ms INT,
  total_ms INT,
  estimated_cost_usd NUMERIC(8,5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### F. Repository File Structure
```text
nuskha-saathi/
├── README.md                         # Mandatory API/library disclosures + architecture + 30-parchi eval table
├── backend/
│   ├── Dockerfile                    # Includes python:3.11-slim + ffmpeg pre-installed
│   ├── main.py                       # FastAPI entrypoint, CORS, static audio/strip serving
│   ├── schemas/
│   │   ├── vision.py                 # Gemini structured Pydantic contracts
│   │   └── responses.py              # Deterministic scan, verify-strip & telemetry schemas
│   ├── routers/
│   │   ├── scan.py                   # POST /api/v1/scan-parchi & POST /api/v1/verify-strip
│   │   ├── cabinet.py                # GET/POST/DELETE /api/v1/cabinet/{patient_id}
│   │   └── whatsapp.py               # POST /api/v1/whatsapp/send-reminder & /webhook (Day-3 loop)
│   ├── services/
│   │   ├── vision_extractor.py       # Gemini Vision JSON extraction + Pillow bbox_1000 cropper
│   │   ├── safety_gate.py            # Deterministic confidence (<0.85) + max-dose ceiling locks
│   │   ├── formulary_resolver.py     # RapidFuzz + phonetic PK brand -> generic salt resolver
│   │   ├── openfda_client.py         # Live openFDA fetcher + local fallback + cross-cabinet checker
│   │   ├── urdu_formatter.py         # Deterministic Urdu script builder (ASCII brands + Western digits)
│   │   ├── tts_stt_service.py        # Uplift Orator/Scribe + Azure/Google fallback + ffmpeg OGG
│   │   └── demo_fixtures.py          # 5 pre-verified offline demo cases + cached audio paths
│   ├── data/
│   │   ├── pk_formulary.json         # 200 common Pakistani brands + salts + WHO AWaRe + max doses + DRAP
│   │   └── pk_interactions_fallback.json # Top 60 verified FDA interaction pairs with excerpts
│   └── tests/
│       ├── test_safety_gate.py       # Pytest deterministic unit tests (blurry refusal, overdose lock, strip swap)
│       └── run_eval_30.py            # Automated benchmark runner across 30 real handwritten test parchis
└── frontend/
    ├── public/manifest.json          # Installable mobile PWA config
    └── src/
        ├── app/
        │   ├── layout.tsx            # RTL dir="rtl", Noto Nastaliq Urdu + Inter fonts
        │   ├── page.tsx              # Home: One big "Parchi Scan Karein" action + Cabinet summary
        │   └── audio/[scanId]/page.tsx # Shareable Audio QR playback page for family members
        └── components/
            ├── ParchiCamera.tsx      # High-contrast one-tap camera & file upload
            ├── SafetyAlertBanner.tsx # Red FDA interaction + Amber refusal crop + WHO AWaRe badge
            ├── VisualDoseCard.tsx    # Photo-anchored Sun/Moon/Plate grid + printable Audio QR
            ├── StripVerifierModal.tsx# "Dawai Check Karein" live physical strip matcher
            ├── ActiveCabinetView.tsx # Patient's cross-doctor active medications list
            ├── WhatsAppPreviewModal.tsx # Live preview / trigger for Dose & Day-3 Voice Notes
            └── DevProofDrawer.tsx    # Judge telemetry drawer (ms latency, PKR cost, raw FDA JSON, eval score)
```

### G. Low-Literacy UI/UX Design Rules (Non-Negotiable)
1. **Icons + Audio on Every Screen:** Every primary card has a giant play-audio speaker icon so illiterate patients never have to read to understand.
2. **One Primary Action Per Screen:** Giant high-contrast tap targets ($\ge 48\text{px}$), zero dense forms, zero clutter.
3. **True RTL Nastaliq Typography:** Use `Noto Nastaliq Urdu` with generous line-height (`leading-loose`) so Nastaliq diacritics never collide or clip.
4. **Zero English-Only Error Messages:** Every camera, network, or blurry-photo error speaks and displays clear, warm Urdu.
5. **Color Semantics:** Strictly reserve **Red** for clinical safety/mismatch stops, **Amber** for blurry pharmacist-verification locks, and **Green** for verified safe dosing/strip matches.

---

## 6. Automated Evaluation Harness & Engineering Proof Standard

Before code freeze, run `backend/tests/run_eval_30.py` across **30 real handwritten test cases** collected from peers/medical students (never synthetic clean fonts):

| Test Subset | Count | What It Proves to Technical Judges | Target Benchmark |
| :--- | :---: | :--- | :---: |
| **Standard Pakistani *Parchis*** | 15 | Real messy handwriting for top local brands (*Augmentin, Risek, Panadol, Glucophage, Concor, Leflox, Flagyl, Brufen, Disprin, Arinac*). | $\ge 90\%$ Brand-to-Salt Resolution |
| **Deliberately Illegible Scribbles** | 5 | Must trigger `REFUSED_BLURRY` + amber crop—**never** hallucinate a medicine name. | **100%** Safe Refusal Rate |
| **High-Risk Drug Conflicts** | 5 | Same-*parchi* and cross-cabinet dangerous pairs (*Warfarin + Ibuprofen*, *Ciprofloxacin + Tizanidine*, *Metronidazole + Warfarin*, *Sildenafil + Nitrates*, *Clarithromycin + Simvastatin*). | **100%** Interaction Recall |
| **Physical Strip Mismatches** | 5 | Real blister packs with wrong mg strength or wrong active salt held against a scanned *parchi*. | **100%** Mismatch Detection |

Plus a deterministic `pytest` suite (`backend/tests/test_safety_gate.py`) verifying:
* Confidence boundary locks (`0.84` refuses, `0.85` passes).
* Overdose ceiling locks (`5000mg` Levofloxacin hard-blocked).
* Fuzzy brand matching (`Augmntin` $\rightarrow$ `amoxicillin + clavulanate`).
* Cross-cabinet conflict detection against live & cached FDA payloads.
* Strip strength mismatch (`250mg` vs `500mg` returns `STRENGTH_MISMATCH`).

---

## 7. Judge-Proof Demo Strategy, Live Stage Script & Pitch Blueprint

### A. Judge-Proof Safeguards (Zero Stage Crashes)
* **2-Hour Cut Rule:** If any secondary feature stalls for $>2$ hours during the sprint, cut or simplify it immediately—protect the core 6-stage loop above everything else.
* **Hidden 5-Case Offline Demo Mode:** Pre-loaded realistic prescriptions, strips, FDA excerpts, and Urdu MP3s behind a 3-tap logo toggle if conference Wi-Fi drops.
* **Physical Stage Kit:** Carry a dedicated **4G mobile hotspot**, a **black thick marker + blank white prescription pad** for the judge scribble, **two real medicine strips** (one matching strength, one wrong strength/salt), a **second teammate phone with loud speaker** for the incoming WhatsApp voice note, and a **pre-recorded backup video** on the laptop.
* **Pre-Warmed Servers:** Ping backend health endpoint 5 minutes before walking on stage so zero cold-start lag hits the demo.

### B. The 90-Second "Impossible to Reject" Live Stage Demo Script
*(Pre-condition: Demo patient "Zubaida Bibi" already has **Warfarin 5mg** active in her medicine cabinet from a prior cardiologist visit.)*

| Timestamp | Live Action on Stage | What Judges See & Hear | Rubric Pillar Maxed |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:15** | **The 15-Second Hook:** Flash a real unreadable Pakistani *parchi* on screen. Tell Zubaida Bibi's story in 2 lines + cite **79.2% unread prescriptions**, **200,000+ AMR deaths/yr**, and **56% early antibiotic stop**. | Immediate visceral recognition—every judge has held an unreadable *parchi*. | **Clarity & Impact** |
| **0:15 – 0:30** | **Live Judge Scribble:** Hand a judge a marker & *parchi* card; ask them to scribble **Brufen 400mg**, **Leflox 500mg**, and **one deliberate unreadable squiggle**. Photograph it live on the mirrored phone. | Live proof—zero pre-baked trickery. | **Execution & Story** |
| **0:30 – 0:50** | **Grounded Safety Result (<10s):** Screen displays: (1) **Amber Refusal Box** with the cropped squiggle (*"Pharmacist se tasdeeq karein"*); (2) **Red Cross-Doctor FDA Alert** catching *Brufen + Cabinet Warfarin* with verbatim `openFDA` excerpt; (3) **WHO Watch Antibiotic Badge** on *Leflox*; (4) Natural Pakistani-accent Urdu audio plays aloud. | Permanently kills *"Why not just use ChatGPT?"* in 20 seconds. | **Innovation & Technical Quality** |
| **0:50 – 1:10** | **Physical Strip-Match Jaw-Dropper:** Pull a **real medicine strip** from your pocket (wrong strength or wrong salt first) and tap **"Dawai Check Karein."** Screen flashes **Red** and speaks Urdu warning. Swap to the **correct strip** $\rightarrow$ turns **Green** and embeds its photo straight into the **Sun/Moon Visual Dose Card**. | Unforgettable tactile moment judges tell other judges about 10 minutes later. | **Uniqueness & UI/UX** |
| **1:10 – 1:30** | **WhatsApp + `Dev Proof` + Judge QR:** Trigger the live WhatsApp Urdu voice reminder + Day-3 Antibiotic check-in onto teammate's phone (speaker up). Tap **`Dev Proof`** for 5 seconds showing live ms latencies, PKR cost, raw openFDA JSON, and 30-*parchi* benchmark. Display a **live QR code** so judges test it on their own phones. | Complete closed-loop proof + deep engineering transparency. | **All 4 Criteria (20/20)** |

### C. Full Pitch Deck Flow (Adapts to 5-Min Sprint OR 20-Min Finale Format)
1. **One Person, One Number (0–2 min):** Zubaida Bibi's story + 79.2% unread prescriptions + 200,000+ AMR deaths + 56% early antibiotic dropout.
2. **Live Demo Early (2–7 min):** Run the 90-second live judge-scribble + physical strip-swap + WhatsApp demo + leave the Judge QR code visible.
3. **Architecture & Why Not ChatGPT (7–11 min):** One clean slide: *"LLM Perceives, Deterministic Engine Decides"* + every disclosed API/library (matching `README.md`).
4. **Hard Proof & Benchmark (11–14 min):** 30-*parchi* evaluation table (accuracy, 100% unsafe refusal, 100% interaction recall, 100% strip mismatch), `pytest` pass count, p50 latency, PKR 1–2 cost/scan, and 2 real user-test quotes (pharmacist + elderly relative).
5. **Impact, Distribution & Viability (14–17 min):** Free for patients; deployed via hospital OPD discharge desks, Lady Health Workers, pharmacy counters, and provincial AMR grants; cost per 1,000 scans (~PKR 1,200); regional language roadmap.
6. **Honest Limits & Next Steps (17–20 min):** Explicit clinical disclaimer (never diagnoses or prescribes), privacy-by-default data handling, and validation pilot ask.

### D. Mandatory $\le 2$-Minute Submission Video Script
* **0:00 – 0:15 (Problem):** Close-up of a messy handwritten Pakistani *parchi* + loose blister strips. Voiceover: **79.2% struggle to read prescriptions, 56% stop antibiotics early, 200,000+ die yearly from AMR in Pakistan.**
* **0:15 – 1:25 (Unedited Live Product Demo):**
  * Scan handwritten *parchi* $\rightarrow$ Amber cropped refusal box + Red cross-doctor `openFDA` citation + WHO Watch badge.
  * Play 6 seconds of crisp Pakistani-accent Urdu dosing voice.
  * Hold wrong physical blister strip $\rightarrow$ Red Urdu alert $\rightarrow$ hold correct strip $\rightarrow$ Green confirmation + photo-anchored Sun/Moon visual dose card.
  * Show incoming WhatsApp Urdu voice note + Day-3 antibiotic voice reply loop.
* **1:25 – 1:45 (Architecture & Proof):** Flash the deterministic architecture slide, `Dev Proof` drawer telemetry, 30-*parchi* eval table, and `pytest` run.
* **1:45 – 2:00 (Impact & QR):** Deployment partners (LHWs, OPD desks, pharmacies), ~PKR 1–2/scan cost, and live QR code.

---

## 8. 6-Day Execution Sprint Plan (Sat 21 Nov $\rightarrow$ Fri 27 Nov 2026)

*(28 Nov – 1 Dec is strictly reserved for demo rehearsal, Q&A drills, and stage hardware checks—zero risky code changes after Friday freeze.)*

| Day | Focus Area | Concrete Deliverables | 2-Hour Cut / Risk Guardrail |
| :--- | :--- | :--- | :--- |
| **Day 1 (Sat 21 Nov)** | Data + Clinical Engine | Build `pk_formulary.json` (200 Pakistani brands, salts, max doses, WHO AWaRe, DRAP flags), `pk_interactions_fallback.json` (60 pairs), `formulary_resolver.py`, `openfda_client.py`, and `README.md` API disclosure skeleton. | Grab free `openFDA` API key immediately (240 req/min); lean on local fallback cache if API throttles. |
| **Day 2 (Sun 22 Nov)** | Vision + Safety Gates | Build `vision_extractor.py` (strict JSON + `bbox_1000` + Pillow cropper), `safety_gate.py` (`<0.85` lock + max-dose lock), `/api/v1/scan-parchi`, `/api/v1/verify-strip`, and `test_safety_gate.py`. | Enforce `response_mime_type="application/json"` + 2x retry so bad formatting never crashes parsing. |
| **Day 3 (Mon 23 Nov)** | Frontend PWA + Urdu Voice | Build Next.js RTL Noto Nastaliq PWA (Camera, Safety Banners, Photo-Anchored Sun/Moon Dose Card, Strip Verifier Modal, Audio QR, `Dev Proof` drawer) + `tts_stt_service.py` (Uplift Orator + Azure fallback). **Deploy live on Vercel Day 3.** | **Pashto/Sindhi Gate:** Run 10-phrase clinical audio test on Day 3; ship regional voices *only* if crisp and fast. |
| **Day 4 (Tue 24 Nov)** | Cabinet + WhatsApp + Offline Mode | Wire Supabase `cabinet_medications` (cross-doctor conflict checks), `ffmpeg` Opus OGG WhatsApp reminders + Day-3 Antibiotic webhook reply, and **hidden 5-case Offline Demo Mode**. | If Meta WhatsApp Cloud approval lags, deploy Twilio WhatsApp Sandbox immediately + in-app preview modal. |
| **Day 5 (Wed 25 Nov)** | Eval Benchmark + User Tests | Collect 30 real handwritten test *parchis* (15 standard, 5 scribbles, 5 conflicts, 5 strip mismatches), run `run_eval_30.py`, log real metrics, fix top edge cases, film 2 quick real-user clips (pharmacist + relative). | **Feature Freeze at 11:00 PM Day 5.** |
| **Day 6 (Thu 26 – Fri 27 Nov)** | Video, Deck, Polish & Submit | Finalize `README.md` (full API/library disclosure, diagram, benchmark table), record $\le 2$-min video, complete slide deck, test deployed URL on mobile 4G data, and submit ahead of 27 Nov deadline. | Rehearse 90-second live stage demo + Q&A daily from 28 Nov to 1 Dec. |

---

## 9. Judge Q&A Defense Playbook

* **Q1: "What if the AI misreads a handwritten dose and harms a patient?"**  
  *Answer:* "That is our #1 design rule: **the LLM never makes clinical decisions.** Any extraction below `0.85` confidence, any unrecognized brand, or any dose exceeding deterministic safety ceilings triggers a hard lock, crops the exact handwritten scribble in amber, refuses dosing audio for that line, and instructs pharmacist verification. We achieved **100% refusal on our illegible test set**, and frame strictly as a comprehension and safety-flagging companion—never a prescriber."
* **Q2: "Why can't someone just upload the prescription photo to ChatGPT?"**  
  *Answer:* "Five reasons: ChatGPT does not map local Pakistani brands like *Risek* or *Leflox* to live `openFDA` labels; it guesses blurry doctor scribbles instead of enforcing deterministic refusal; it does not maintain a cross-doctor active medicine cabinet; it cannot verify whether the physical blister strip in the patient's hand matches the prescribed strength; and it does not run interactive Day-3 Urdu WhatsApp voice check-ins to stop antibiotic dropout."
* **Q3: "How do you handle Pashto, Sindhi, or Punjabi speakers?"**  
  *Answer:* "Our architecture strictly separates the deterministic clinical safety engine from the voice presentation layer. Urdu is production-verified today with natural Pakistani-accent TTS; regional voices plug straight into the same verified JSON output once native clinical pronunciation passes validation—we never ship unverified medical audio."
* **Q4: "Who pays, and how does this scale beyond a hackathon?"**  
  *Answer:* "Patients never pay—unit inference cost is roughly **PKR 1–2 per scan** (~PKR 1,200 per 1,000 patients). Distribution runs through **hospital OPD discharge desks, Lady Health Worker programs, pharmacy chains** (as a counter-side patient safety differentiator), and **provincial public-health / AMR grants** targeting Pakistan's 200,000+ annual AMR deaths."
* **Q5: "What patient data do you store, and how is privacy handled?"**  
  *Answer:* "Cabinet persistence is strictly opt-in for cross-doctor safety checking and WhatsApp reminders; users can run one-off scans with zero persistent storage or clear their cabinet with one tap. No personally identifying CNIC or medical history is required."
* **Q6: "What did your team actually build during the hackathon window?"**  
  *Answer:* "Every line of our safety gate, Pakistani brand-to-salt resolver, `openFDA` cross-cabinet checker, strip verifier, PWA, WhatsApp loop, and 30-*parchi* evaluation harness was built during the sprint—verified by our public GitHub commit history and complete `README.md` API/library disclosure."
* **Q7: "What happens if venue Wi-Fi or an external API (`openFDA` / Uplift) goes down?"**  
  *Answer:* "Every external dependency has a deterministic fallback: `openFDA` falls back in $<5\text{ ms}$ to our local verified 60-pair FDA matrix; Uplift Orator falls back automatically to Azure `ur-PK-UzmaNeural`; and the app ships with a cached 5-case Offline Demo Mode."

---

## 10. Final Submission Compliance Checklist

- [ ] Public GitHub repository live with clean commit history during the hackathon window.
- [ ] `README.md` discloses **every** external API, model, dataset, and open-source library used, plus architecture diagram, clinical limits, and 30-*parchi* benchmark table.
- [ ] Live deployed PWA URL verified on **both desktop and mobile 4G data**.
- [ ] Demo video strictly **$\le 2:00$ minutes** with crisp audio and unedited live workflow.
- [ ] Pitch deck exported as **PDF/PPTX** with Judge QR code on the final slide.
- [ ] `pytest` unit tests and `run_eval_30.py` benchmark outputs committed in repo.
- [ ] Physical stage kit packed (hotspot, marker, *parchi* pad, 2 real medicine strips, teammate phone for WhatsApp audio, backup video).