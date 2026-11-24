# Nuskha Saathi — Clinical Safety & Security Plan

Product: **Nuskha Saathi (نسخہ ساتھی)**, powered by the **Dawa-Guard** clinical safety engine.

This plan is the safety contract for engineers, pitch, and Q&A. It is extracted from the master spec. If this file and the master spec ever disagree, the master spec wins and this file gets updated the same day.

## 1. Product boundary

Nuskha Saathi is a **patient comprehension and clinical safety-flagging companion**.

It does these things:

- Read a handwritten or printed Pakistani prescription (*parchi*) and a physical medicine strip.
- Flag unreadable lines, unknown brands, and dose numbers that break a fixed ceiling.
- Map a Pakistani brand to a generic salt, then check that salt against live `openFDA` labels and a local verified fallback.
- Show a cross-doctor conflict when a new *parchi* clashes with medicines already in the patient's cabinet.
- Speak a fixed Urdu script and show a photo-anchored Sun/Moon dose card.
- Send scheduled WhatsApp voice reminders and a Day-3 antibiotic check-in.

It does **not** diagnose, prescribe, change a dose, pick a substitute for the patient to take, or replace a doctor or pharmacist. DRAP shortage notes may name bioequivalent brands the patient can **ask a pharmacist about**. The app does not tell the patient to switch.

Every screen that shows a result carries the companion framing in Urdu: verify with a pharmacist or doctor when a line is refused or a conflict is flagged.

## 2. Architectural law

> The LLM only perceives and translates. It never makes a clinical safety decision.

| Step | Who decides | Allowed output |
| :--- | :--- | :--- |
| Read the photo | Gemini Vision, `temperature=0.0`, strict JSON schema | Raw text, brand guess, strength, schedule, `ocr_confidence`, `bbox_1000` |
| Accept or refuse a line | `safety_gate.py` (pure code) | `VERIFIED`, `REFUSED_BLURRY`, `REFUSED_UNKNOWN_DRUG`, `REFUSED_DOSAGE_ANOMALY` |
| Map brand to salt | `formulary_resolver.py` + `pk_formulary.json` | A curated formulary row, or refusal |
| Interaction severity | `openFDA` label fields, else `pk_interactions_fallback.json` | Verbatim FDA excerpt plus a fixed Urdu template |
| Strip match | Deterministic compare of detected brand/salt/strength vs the verified *parchi* line | `EXACT_MATCH`, `GENERIC_EQUIVALENT_MATCH`, `STRENGTH_MISMATCH`, `WRONG_MEDICINE`, `UNREADABLE_STRIP` |
| Spoken Urdu | `urdu_formatter.py` templates, then TTS | Audio of the already-decided text |

No prompt, tool call, or model score may override a refusal, raise a dose, clear an interaction, or mark a strip as matched.

## 3. Harm scenarios and controls

| Harm | How it happens | Control |
| :--- | :--- | :--- |
| Hallucinated medicine from a scribble | Model invents a name on a blurry line | `ocr_confidence < 0.85` → `REFUSED_BLURRY`. Amber card shows the Pillow crop of `bbox_1000`. No dosing audio for that line. |
| Wrong local brand mapped to the wrong salt | Fuzzy match is too loose, or `openFDA` is queried with a Pakistani brand | RapidFuzz score `< 82` → `REFUSED_UNKNOWN_DRUG`. `openFDA` is queried only with USAN/INN salts from the formulary (`levofloxacin`, `ibuprofen`, `warfarin`, and so on). |
| Fatal OCR digit error (`500` read as `5000`) | Strength or daily total exceeds the formulary ceiling | `strength_mg > max_single_dose_mg` or computed `daily_mg > max_daily_dose_mg` → `REFUSED_DOSAGE_ANOMALY`. |
| Cross-doctor bleed risk missed | New *parchi* is checked only against itself | Every new scan is paired with other lines on the same *parchi* **and** every active row in `cabinet_medications`. |
| Wrong-milligram strip taken home | Pharmacy counter hands over 250 mg when the *parchi* says 500 mg | `/api/v1/verify-strip` compares brand, salt, and strength. Mismatch speaks the fixed "RUK JAIYE" Urdu line and stays red. |
| Early antibiotic stop | Patient feels better on Day 3 | WHO AWaRe tag on the formulary row. Watch/Reserve antibiotics schedule a two-way Day-3 WhatsApp voice check-in. Reply text is transcribed, then answered from a fixed adherence script. |
| Model outage or bad JSON | Gemini returns prose or times out | `response_mime_type=application/json`, strict schema, one retry, then fail closed to `REFUSED_BLURRY`. The parser never guesses. |
| `openFDA` empty or down | Brand name queried directly, or the API throttles | Local `pk_interactions_fallback.json` (top 60 verified pairs with verbatim FDA quotes) returns in under 5 ms. |
| TTS vendor down | Uplift Orator fails | Azure `ur-PK-UzmaNeural`, then Google `ur-PK-Standard-A`, then browser TTS. Clinical text is already fixed before any voice vendor runs. |
| Venue Wi-Fi dies on stage | Live APIs unreachable | Hidden 5-case Offline Demo Mode (`?demo=offline` or three taps on the header logo). Cached audio and FDA payloads only. |
| Patient data retained without consent | Cabinet or phone number stored on a one-off scan | Cabinet and WhatsApp are opt-in. A one-off scan persists nothing. One tap clears the cabinet. No CNIC and no free-text medical history. |
| Unverified regional medical audio | Pashto or Sindhi TTS shipped because the model exists | Urdu is the only production voice. `pus` / `snd` audio ships only after the Day-3 10-phrase clinical listen-test passes. Otherwise it stays documented as queued. |

## 4. Deterministic safety gate

Implemented only in `backend/services/safety_gate.py`. Three locks, any one of them refuses the line:

1. **Blur.** `ocr_confidence < 0.85` → `REFUSED_BLURRY`.
2. **Unknown drug.** Best RapidFuzz score against `pk_formulary.json` `< 82` → `REFUSED_UNKNOWN_DRUG`.
3. **Dose ceiling.** Extracted `strength_mg > max_single_dose_mg` **or** computed daily milligrams `> max_daily_dose_mg` → `REFUSED_DOSAGE_ANOMALY`.

Boundary the tests must pin:

- Confidence `0.84` refuses. Confidence `0.85` may pass the blur lock (other locks still apply).
- `5000 mg` levofloxacin is hard-blocked.
- `Augmntin` resolves to `amoxicillin + clavulanate` when the formulary aliases include that spelling.
- A strip detected as Leflox 250 mg against a verified Leflox 500 mg line returns `STRENGTH_MISMATCH`.

On any refusal:

- Crop `bbox_1000` with Pillow (`[ymin, xmin, ymax, xmax]` on a 0–1000 grid) and return it as the amber card image.
- Do not attach dosing audio for that line.
- Urdu line: *"Yeh lafz saaf nahi hai — meharbani kar ke pharmacist ya doctor se tasdeeq karein."* (Unknown-drug and dose-anomaly lines use their own fixed Urdu templates with the same pharmacist instruction.)

Vision extraction fields the gate is allowed to read: `raw_text`, `brand_or_salt_guess`, `strength_mg`, `dosage_form`, `morning_qty`, `afternoon_qty`, `night_qty`, `meal_timing`, `duration_days`, `ocr_confidence`, `bbox_1000`. Missing required fields fail closed.

## 5. Clinical data the engine may trust

Only these files and APIs may supply a safety fact:

| Source | What it may assert | What it may not assert |
| :--- | :--- | :--- |
| `backend/data/pk_formulary.json` | Brand, aliases, generic salts, common strengths, max single dose, max daily dose, antibiotic flag, WHO AWaRe tier, DRAP shortage flag, bioequivalent brand names to ask about | A personal dose for this patient |
| `backend/data/pk_interactions_fallback.json` | Salt pair, severity, source string, verbatim FDA excerpt, fixed Urdu warning | A new interaction invented at runtime |
| `openFDA` `drug/label.json` | `drug_interactions`, `boxed_warning`, `contraindications` for a resolved generic salt | Anything derived from a Pakistani brand string |
| Supabase `cabinet_medications` | Medicines the patient (or demo persona) already confirmed | Inferred diagnoses |

Query shape for live labels:

`GET https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{salt}"&limit=1`

Every red interaction banner shows the **verbatim FDA excerpt** and names the source (`openFDA Drug Label API` or the cached excerpt). The UI does not paraphrase the clinical claim.

High-risk pairs the eval set must recall at 100%:

- Warfarin + ibuprofen
- Ciprofloxacin + tizanidine
- Metronidazole + warfarin
- Sildenafil + nitrates
- Clarithromycin + simvastatin

## 6. Strip verification

`POST /api/v1/verify-strip` compares the strip extraction to one verified *parchi* line.

| Status | Patient-facing result |
| :--- | :--- |
| `EXACT_MATCH` | Green card. Urdu confirms brand, strength, and the already-verified schedule. Strip thumbnail is allowed onto the dose card. |
| `GENERIC_EQUIVALENT_MATCH` | Green only when the salt matches and the strength matches, and the other brand is on that formulary row's bioequivalent list. Wording still tells the patient what was detected. |
| `STRENGTH_MISMATCH` | Red. Fixed "RUK JAIYE" script names the prescribed strength and the strength in hand. |
| `WRONG_MEDICINE` | Red. Names both and tells the patient to return the strip. |
| `UNREADABLE_STRIP` | Amber. No green confirmation. Ask for a clearer photo or the pharmacist. |

A refused *parchi* line cannot be strip-verified into a pass. Verification reads the verified line, not the raw model guess.

## 7. Voice and message safety

- Urdu scripts are built in `urdu_formatter.py` from templates. English brand names stay ASCII (`Leflox`, `Warfarin`). Numbers stay Western digits (`500 mg`, `3 din`) so Uplift Orator pronounces them cleanly.
- TTS vendors receive that string only. They do not receive a prompt that asks them to invent advice.
- WhatsApp inbound voice is transcribed (Uplift Scribe, `language=ur`, else Gemini audio). The reply is selected from grounded adherence templates (course completion, talk to the doctor, do not stop a Watch antibiotic early). The transcript is stored on the reminder row as `user_reply_transcript` and is not sent to a free-form clinical model.
- Mixed Urdu, Roman Urdu, and English in one reply is in scope for transcription. It is out of scope for changing the safety decision.
- Outgoing WhatsApp audio is Opus OGG at 32 kbps: `ffmpeg -i in.mp3 -c:a libopus -b:a 32k out.ogg`.

## 8. Privacy and data minimization

Stored only when the patient opts into the cabinet or WhatsApp reminders:

| Table | Fields we keep | Fields we do not collect |
| :--- | :--- | :--- |
| `patients` | `id`, display name, WhatsApp phone, preferred language (`ur` default) | CNIC, address, diagnosis, full medical history |
| `prescriptions` | Image URL, raw vision JSON, verified response JSON, Urdu audio URL | — |
| `cabinet_medications` | Brand, salts, strength, AWaRe tier, strip flag, thumbnail, start/end, active flag | — |
| `reminders` | Type (`DOSE` or `DAY3_ANTIBIOTIC_CHECKIN`), schedule, audio URL, status, reply transcript | — |
| `telemetry_logs` | Scan id and stage timings, estimated cost | Phone number, image bytes, raw prescription text |

Rules:

- One-off scan mode writes no patient row and no cabinet row.
- Clearing the cabinet is one action and removes active medications for that patient id.
- Demo persona `demo-zubaida-01` is fixture data for the stage. It is labeled as demo data and is not a real patient's record.
- Images and audio live in Supabase Storage or local static paths. Public demo URLs used on stage are the five cached cases only.
- Telemetry shown in the `Dev Proof` drawer (latency, PKR/USD cost, fuzzy score, raw FDA JSON, eval table) is judge-facing and must not include a phone number.

## 9. Secrets and third-party access

| Secret | Where it lives | Rule |
| :--- | :--- | :--- |
| Gemini API key | Backend env only | Never in the Next.js client, never in git |
| openFDA API key | Backend env | Free tier is 240 requests/minute. Cache and the local matrix absorb throttling |
| Uplift AI bearer token | Backend env | TTS and STT calls stay server-side |
| Azure / Google TTS credentials | Backend env | Fallback path only |
| Supabase service role | Backend env | The browser uses the public anon key only for reads the product explicitly allows |
| Twilio or Meta WhatsApp token | Backend env | Webhook verifies the provider signature before it trusts a reply |

`README.md` discloses every API, model, dataset, and library by name. Disclosure lists the service. It does not list key values.

HTTP calls use two exponential-backoff retries, then the documented fallback. A failed external call fails closed on the safety path (refuse the line, or serve the local interaction matrix). It does not fail open.

## 10. Offline demo mode isolation

Offline mode exists so a dead venue network cannot invent a live result.

- Activated only by `?demo=offline` or three taps on the header logo.
- Serves five pre-verified cases from `demo_fixtures.py` with cached Urdu audio and cached FDA payloads.
- The UI marks the mode so the team knows they are on fixtures. Judges still see the real product behavior for those cases.
- Offline mode cannot write a new cabinet row to production Supabase.
- Leaving offline mode returns to the live pipeline. It does not merge fixture medicines into a real cabinet.

## 11. UI safety semantics

- **Red:** clinical stop. Interaction, wrong strength, wrong medicine.
- **Amber:** cannot verify. Blurry line, unknown drug, dose anomaly, unreadable strip.
- **Green:** verified schedule or exact / allowed generic strip match.
- One primary action per screen. Tap targets at least 48 px.
- RTL, `Noto Nastaliq Urdu`, loose line-height.
- Every primary card has a speaker control. Camera, network, and blur errors have Urdu text and Urdu audio. No English-only error.

## 12. Proof required before freeze

`backend/tests/test_safety_gate.py` must pass on the locks in section 4 and on strip mismatch.

`backend/tests/run_eval_30.py` on 30 real handwritten *parchis* (not clean synthetic fonts):

| Subset | Count | Target |
| :--- | :---: | :--- |
| Standard Pakistani *parchis* | 15 | Brand-to-salt resolution ≥ 90% |
| Deliberate illegible scribbles | 5 | Safe refusal 100%. Zero hallucinated names |
| High-risk drug conflicts | 5 | Interaction recall 100% |
| Physical strip mismatches | 5 | Mismatch detection 100% |

Feature freeze is 11:00 PM PKT on Day 5 (Wed 25 Nov). After Friday 27 Nov afternoon, the safety gate, formulary ceilings, and interaction matrix do not change for the finale.

## 13. Stage failure response

| Failure on stage | Response |
| :--- | :--- |
| Wi-Fi or API timeout | Switch to Offline Demo Mode. Do not retry live in front of judges. |
| Audio device fails | Teammate phone plays the cached voice note. |
| Strip camera fails | Use the second pre-shot strip image already in the offline case. |
| A feature is still broken in rehearsal | Cut it. The 90-second loop that must survive is: amber refusal, red cabinet interaction with FDA excerpt, Watch badge, Urdu voice, red-then-green strip check, Sun/Moon card. |
| Someone asks the app to prescribe | Demo answer is the Q1 defense: the model does not decide; low confidence and dose ceilings hard-lock; the product is a flagging companion. |

Physical kit: 4G hotspot, black marker, blank *parchi* pad, two real strips (one matching strength, one wrong strength or salt), second phone with speaker, pre-recorded backup video, backend health ping five minutes before stage.

## 14. Owners for this plan

- Safety gate, formulary ceilings, and interaction fallback: backend owner, reviewed before Day 5 eval.
- Privacy copy and one-tap cabinet clear: frontend owner, visible in the UI before submit.
- Secret handling and README disclosure: whoever opens the GitHub repo, checked on Day 6.
- Stage fallback drill: whole team, daily from 28 Nov through 1 Dec.
