# 6-Day Execution Sprint

**Window:** Saturday 21 Nov 2026 → Friday 27 Nov 2026 (PKT).

**After freeze:** 28 Nov – 1 Dec is rehearsal, Q&A, and hardware checks. No risky code changes after the Friday 27 Nov afternoon submit target.

**Finale:** 2 December 2026, Pak-China Friendship Center, Islamabad.

**Platform deadline shown:** 27 Nov 2026, 7:01 PM PKT. Requirements text cites 28 Nov, 11:59 PM. The team target is Friday afternoon so the weekend is rehearsal only.

**2-hour cut rule:** If a secondary feature stalls for more than two hours, cut or simplify it. Protect the core loop: scan → safety gate → formulary → FDA or local interactions → Urdu voice → dose card. Strip check, cabinet, and WhatsApp sit on that loop and can be simplified, not the other way around.

| Phase | Day | File | Focus |
| :--- | :--- | :--- | :--- |
| 1 | Sat 21 Nov | [phase-01-data-and-clinical-engine.md](phase-01-data-and-clinical-engine.md) | Formulary, interaction cache, resolver, openFDA client |
| 2 | Sun 22 Nov | [phase-02-vision-and-safety-gates.md](phase-02-vision-and-safety-gates.md) | Vision, refusal locks, scan and strip routes, pytest |
| 3 | Mon 23 Nov | [phase-03-frontend-and-urdu-voice.md](phase-03-frontend-and-urdu-voice.md) | RTL PWA, dose card, TTS, live Vercel deploy |
| 4 | Tue 24 Nov | [phase-04-cabinet-whatsapp-offline.md](phase-04-cabinet-whatsapp-offline.md) | Cabinet, WhatsApp Day-3 loop, offline demo mode |
| 5 | Wed 25 Nov | [phase-05-eval-and-user-tests.md](phase-05-eval-and-user-tests.md) | 30-*parchi* benchmark, user clips, feature freeze 11:00 PM |
| 6 | Thu 26 – Fri 27 Nov | [phase-06-polish-and-submit.md](phase-06-polish-and-submit.md) | README, video ≤ 2:00, deck, 4G test, submit |
| Rehearsal | 28 Nov – 1 Dec | [phase-07-rehearsal.md](phase-07-rehearsal.md) | 90-second demo and Q&A. Code frozen |

Safety rules that apply on every day live in [../SECURITY_PLAN.md](../SECURITY_PLAN.md).

## Core loop that must work by Day 3

1. Photo of a *parchi* goes to `POST /api/v1/scan-parchi`.
2. Gemini returns strict JSON. The safety gate refuses blur, unknown brands, and dose-ceiling breaches with no model override.
3. Verified lines resolve through `pk_formulary.json` to generic salts.
4. Salts are checked on live `openFDA`, with `pk_interactions_fallback.json` when the API fails.
5. A fixed Urdu script is spoken.
6. The PWA shows red / amber / green and a Sun/Moon dose card.

## Repo map (target)

```text
nuskha-saathi/
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── schemas/          vision.py, responses.py
│   ├── routers/          scan.py, cabinet.py, whatsapp.py
│   ├── services/         vision, safety gate, resolver, openFDA, Urdu, TTS/STT, demo fixtures
│   ├── data/             pk_formulary.json, pk_interactions_fallback.json
│   └── tests/            test_safety_gate.py, run_eval_30.py
└── frontend/
    ├── public/manifest.json
    └── src/app + components
```
