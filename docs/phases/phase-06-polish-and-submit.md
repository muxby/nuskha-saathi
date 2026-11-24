# Phase 6 — Polish, Video, Deck, and Submit

**Days:** Thursday 26 Nov – Friday 27 Nov 2026

**Depends on:** Feature freeze from Phase 5. Allowed work is disclosure, copy, demo reliability, video, and slides. Safety-gate behavior does not change unless a Phase 5 miss is a patient-harm bug and the pytest suite is re-run.

**Goal:** Public repo, live URL, ≤ 2:00 video, and deck submitted Friday afternoon PKT.

## Deliverables

- [ ] Public GitHub repo. Commits visible inside the 16–28 Nov sprint window. History stays readable.
- [ ] `README.md` discloses every API, model, dataset, and library. Includes the architecture diagram, clinical limits, and the 30-*parchi* table.
- [ ] Deployed PWA URL checked on desktop and on a phone using mobile 4G (Wi-Fi off).
- [ ] Demo video ≤ 2:00, crisp audio, live workflow.
- [ ] Pitch deck PDF and PPTX. Last slide has the judge QR.
- [ ] `pytest` output and `run_eval_30.py` output committed.
- [ ] Stage kit list packed (see Phase 7).
- [ ] Submit Friday 27 Nov afternoon. Do not use the 28 Nov citation as the working deadline.

## README disclosure checklist

Name each of these if it is actually in the running system:

- Google Gemini Vision (model id used)
- openFDA Drug Label API
- Uplift AI Orator and Scribe
- Azure `ur-PK-UzmaNeural` and Google `ur-PK-Standard-A` if wired
- Meta MMS-TTS only if the Day 3 gate turned it on; otherwise state that it was tested and not shipped
- Twilio WhatsApp Sandbox and/or Meta WhatsApp Cloud API
- Supabase (Postgres + Storage)
- RapidFuzz, Pillow, FastAPI, Pydantic v2, httpx, ffmpeg
- Next.js, React, Tailwind, `qrcode.react`, Noto Nastaliq Urdu
- `pk_formulary.json` and `pk_interactions_fallback.json` as team-curated data, with FDA excerpts attributed

Also state the clinical boundary in one paragraph: comprehension and safety flags, not a prescriber.

## Video timing (≤ 2:00)

| Time | Shot |
| :--- | :--- |
| 0:00–0:15 | Messy *parchi* and loose strips. Voiceover: 79.2% struggle to read prescriptions, 56% stop antibiotics early, 200,000+ AMR-associated deaths a year in Pakistan. |
| 0:15–1:25 | Unedited demo: amber crop, red cross-doctor FDA citation, WHO Watch badge, ~6 seconds of Urdu voice, wrong strip red, correct strip green, photo on the Sun/Moon card, WhatsApp voice note and Day-3 reply. |
| 1:25–1:45 | Architecture line ("LLM perceives, deterministic engine decides"), Dev Proof numbers, eval table, pytest. |
| 1:45–2:00 | LHWs, OPD desks, pharmacies, about PKR 1–2 per scan, live QR. |

## Deck flow

Use the same story at 5 minutes or at 20 minutes plus 10 minutes of questions. Sections, in order:

1. Zubaida Bibi, 79.2%, 200,000+ AMR deaths, 56% early stop.
2. Live demo and the judge QR left on screen.
3. One architecture slide and the README’s API list.
4. Eval table, pytest count, p50 latency, PKR per scan, two user quotes.
5. Who deploys it (OPD, Lady Health Workers, pharmacy counters, provincial AMR grants) and cost per 1,000 scans (~PKR 1,200).
6. Limits: no diagnosis, no prescribing, opt-in cabinet, pilot ask.

Q&A answers are the seven in the master spec, section 9. They must match [SECURITY_PLAN.md](../SECURITY_PLAN.md). Do not invent a privacy claim or an accuracy number that the eval table does not show.

## 2-hour cut

If the edit of the video stalls, export the live capture with a simple title card. A true ≤ 2:00 live demo beats a polished cut that misses the afternoon submit.

## Done when

- The four mandatory deliverables are uploaded: repo, URL, video, deck.
- A phone on 4G completes one online scan or, if the network fails, the documented offline path. The result of that check is written in the README or the submit notes.
- Tag or note the freeze commit so rehearsal does not move `main`.
