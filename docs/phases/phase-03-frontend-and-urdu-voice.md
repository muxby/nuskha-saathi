# Phase 3 — Frontend PWA and Urdu Voice

**Day:** Monday 23 Nov 2026

**Depends on:** Phase 2 scan and strip contracts.

**Goal:** A phone on mobile data can scan, hear Urdu, and see the dose card. The app is deployed the same day.

## Deliverables

- [ ] Next.js 15+ App Router PWA, React 19, Tailwind.
- [ ] `frontend/public/manifest.json` so the app is installable.
- [ ] `src/app/layout.tsx` — `dir="rtl"`, `Noto Nastaliq Urdu` + `Inter`, `leading-loose`.
- [ ] `src/app/page.tsx` — one primary action, "Parchi Scan Karein", plus cabinet summary placeholder.
- [ ] `src/app/audio/[scanId]/page.tsx` — page opened from the dose-card QR.
- [ ] `ParchiCamera.tsx` — one-tap camera and file upload, targets ≥ 48 px.
- [ ] `SafetyAlertBanner.tsx` — red FDA banner, amber refusal crop, WHO AWaRe badge.
- [ ] `VisualDoseCard.tsx` — Subah (rising sun), Dopehar (full sun), Raat (crescent moon), Khane se Pehle / Baad (empty vs full plate). Printable. Audio QR via `qrcode.react`.
- [ ] `StripVerifierModal.tsx` — "Dawai Check Karein".
- [ ] `DevProofDrawer.tsx` — hidden behind a corner chip. Shows stage milliseconds, PKR and USD cost, fuzzy score, raw FDA JSON.
- [ ] `backend/services/tts_stt_service.py` — Uplift Orator, Azure fallback, ffmpeg hook.
- [ ] Live deploy on Vercel. Backend reachable from that origin.

## Voice pipeline

Primary: `POST https://api.upliftai.org/v1/synthesis/text-to-speech`

- Header `Authorization: Bearer <server env>`.
- `outputFormat: MP3_22050_128`.
- Max 2,500 characters.
- Voice id configured in env.

Fallback order: Azure `ur-PK-UzmaNeural` → Google `ur-PK-Standard-A` → browser TTS.

Text handed to TTS is the string from `urdu_formatter.py` only. Brands in ASCII. Numbers as Western digits (`500 mg`, `3 din`).

STT client can be stubbed today and finished in Phase 4:

`POST https://api.upliftai.org/v1/transcribe/speech-to-text` with `model=scribe`, `language=ur`, max 25 MB. Fallback: Gemini audio transcription.

## UI rules

- Speaker icon on every primary card.
- One primary action per screen. No dense forms.
- Red = stop. Amber = ask a pharmacist. Green = verified match or safe schedule.
- Camera, network, and blur errors have Urdu copy and Urdu audio.
- Dose card may embed a strip thumbnail only after strip status is `EXACT_MATCH` or `GENERIC_EQUIVALENT_MATCH`.

## Pashto / Sindhi gate (today, time-boxed)

Run 10 clinical phrases through Meta `MMS-TTS` (`pus` and `snd`). Enable a regional voice in the UI only if the listen-test is natural and fast. Otherwise leave the product Urdu-only and write one honest sentence in the README: regional audio is queued pending native clinical validation.

This test loses to the Urdu path. If it passes two hours, stop and stay on Urdu.

## 2-hour cut

Ship camera, amber card, red interaction banner, speaker, and a simple Sun/Moon grid. Defer print layout polish, QR styling, and the Dev Proof drawer visual design if the live Urdu voice is not deployed yet. Deploy a working URL before midnight even if the drawer is plain text.

## Done when

- A teammate on a phone opens the Vercel URL, uploads a *parchi* photo, hears Pakistani-accent Urdu, and sees amber and red states from the Phase 2 API.
- Dev Proof chip shows `vision_ms`, `resolver_ms`, `openfda_ms`, `tts_ms`, and estimated PKR.
- Audio QR opens `/audio/{scanId}` and replays the same clip.
