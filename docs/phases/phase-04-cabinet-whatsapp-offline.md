# Phase 4 — Cabinet, WhatsApp, and Offline Demo Mode

**Day:** Tuesday 24 Nov 2026

**Depends on:** Phases 1–3. Scan, strip, Urdu voice, and the deployed PWA exist.

**Goal:** A second doctor’s *parchi* is checked against medicines already on file, Day-3 antibiotic voice can go out and come back, and the stage demo survives a dead network.

## Deliverables

- [ ] Supabase tables: `patients`, `prescriptions`, `cabinet_medications`, `reminders`, `telemetry_logs` (SQL in the master spec, section 5.E).
- [ ] `backend/routers/cabinet.py` — `GET`, `POST`, `DELETE /api/v1/cabinet/{patient_id}`.
- [ ] Scan path loads active cabinet rows and pairs them with the new *parchi*.
- [ ] `backend/routers/whatsapp.py` — `POST /api/v1/whatsapp/send-reminder` and `POST /api/v1/whatsapp/webhook`.
- [ ] ffmpeg in the backend container. Incoming OGG converted for STT. Outgoing voice is Opus OGG 32 kbps: `ffmpeg -i in.mp3 -c:a libopus -b:a 32k out.ogg`.
- [ ] `backend/services/demo_fixtures.py` — 5 cached cases.
- [ ] Offline mode: `?demo=offline` or three taps on the header logo.
- [ ] `ActiveCabinetView.tsx` and `WhatsAppPreviewModal.tsx`.
- [ ] One-tap clear cabinet. One-off scan writes nothing.

## Cabinet rules

- A row is written only after the patient confirms the verified lines (opt-in).
- Active window is `start_date` through `end_date`, `is_active = true`.
- Demo seed: patient `demo-zubaida-01`, display name Zubaida Bibi, **Warfarin 5 mg** active from a prior cardiologist visit (story date 14 Nov). New scan of Brufen must raise the ibuprofen + warfarin banner and label drug B as the cabinet medicine.
- `DELETE` clears that patient’s active rows.
- Fields stored are in [SECURITY_PLAN.md](../SECURITY_PLAN.md) section 8. No CNIC. No diagnosis.

## WhatsApp loop

Reminder types: `DOSE` and `DAY3_ANTIBIOTIC_CHECKIN`.

Day-3 script, sent when a verified line has `requires_day3_checkin` (antibiotic, especially WHO Watch or Reserve):

*"Assalam-o-Alaikum, aaj aap ki antibiotic ka teesra din hai. Kya aap apni dawai rozana le rahi hain?"*

Webhook path:

1. Verify the provider signature.
2. Convert Opus OGG to the format STT accepts.
3. Transcribe with Uplift Scribe (`language=ur`). On failure, Gemini audio.
4. Accept Urdu, Roman Urdu, and English mixed in one reply.
5. Choose a fixed Urdu adherence reply (do not stop early; resistant bacteria; talk to the doctor). Send it as an OGG voice note.
6. Set reminder `status` from `PENDING` → `SENT` → `REPLIED`. Store `user_reply_transcript`.

Provider order: Twilio WhatsApp Sandbox first if Meta Cloud approval is still pending. In-app `WhatsAppPreviewModal` plays the same OGG if the sandbox rate-limits.

## Offline demo mode

Five pre-verified cases with cached images, FDA excerpts, and Urdu MP3s. Minimum set for the 90-second script:

1. Clear Leflox 500 mg line, Watch badge, Day-3 flag.
2. Illegible syrup line → amber crop, no dosing audio.
3. Brufen on the new *parchi* against cabinet Warfarin → red verbatim FDA excerpt.
4. Strip strength mismatch (250 vs 500) → red "RUK JAIYE".
5. Exact strip match → green, thumbnail lands on the Sun/Moon card.

Offline mode does not call Gemini, openFDA, Uplift, or Supabase writes.

## 2-hour cut

WhatsApp Cloud approval is not allowed to block the day. Sandbox plus the in-app preview modal is the ship path. Cabinet conflict checking stays even if reminders are preview-only.

If Supabase setup stalls past two hours, run the cabinet against a local SQLite or JSON fixture with the same row shape, and keep the Supabase SQL in the repo so Day 6 can point the env at the hosted project.

## Done when

- Scanning Brufen for `demo-zubaida-01` returns the warfarin interaction from the cabinet, not only from the same photo.
- A Day-3 voice note is received on a teammate phone, or the preview modal plays the same note and a sample reply produces the adherence voice note.
- Airplane mode plus `?demo=offline` completes cases 1–5 with audio.
