# Phase 7 — Rehearsal (Code Frozen)

**Window:** Saturday 28 Nov 2026 → Tuesday 1 Dec 2026 (PKT).

**Finale:** Wednesday 2 December 2026, Pak-China Friendship Center, Islamabad.

**Rule:** No feature work. No formulary retuning. No prompt changes. A fix lands only if the 90-second demo cannot be completed, and it is rehearsed again the same day.

## Daily drill

Run the 90-second script at least once a day, including one run with Wi-Fi disabled.

| Time | Action | Must appear |
| :--- | :--- | :--- |
| 0:00–0:15 | Show a real unreadable *parchi*. Two lines on Zubaida. Cite 79.2%, 200,000+ AMR deaths/year, 56% early stop. | Judges recognize the artifact |
| 0:15–0:30 | Judge scribbles Brufen 400 mg, Leflox 500 mg, and one unreadable squiggle. Photo taken live. | No pre-baked photo unless offline mode is already on |
| 0:30–0:50 | Result in under 10 seconds | Amber crop and pharmacist line; red Brufen + cabinet Warfarin with verbatim FDA text; Watch badge on Leflox; Urdu audio |
| 0:50–1:10 | "Dawai Check Karein" on the wrong strip, then the right strip | Red voice warning, then green, thumbnail inside Sun/Moon card |
| 1:10–1:30 | WhatsApp voice on the teammate phone (speaker up), Dev Proof for 5 seconds, judge QR | Latency, PKR cost, raw FDA JSON, 30-*parchi* table, QR that opens the deployed URL |

Pre-condition for every run: Warfarin 5 mg is active on demo patient Zubaida Bibi before the Brufen scan.

Five minutes before each timed run, ping the backend health endpoint so the first request is not a cold start.

## Stage kit

- 4G hotspot (venue Wi-Fi is not the plan)
- Black thick marker and blank white prescription pad
- Two real medicine strips: one matching strength, one wrong strength or wrong salt
- Second phone with loudspeaker for the incoming WhatsApp note
- Laptop copy of the backup video
- Printed or on-screen QR
- Charged power banks and the phone that has the offline mode gesture rehearsed (three logo taps)

## Q&A drill

Ask these out loud. Answers stay inside the security plan.

1. Misread dose and patient harm — LLM does not decide; 0.85 lock; unknown-drug lock; dose ceiling; 100% refusal on the illegible set; companion, not a prescriber.
2. Why not ChatGPT — Pakistani brand to live FDA, refusal instead of a guess, cross-doctor cabinet, physical strip check, Day-3 WhatsApp loop.
3. Pashto, Sindhi, Punjabi — safety engine is separate from voice; Urdu is the verified voice; regional audio ships only after clinical listen-test.
4. Who pays — patients do not; about PKR 1–2 per scan; OPD desks, Lady Health Workers, pharmacies, AMR grants.
5. Privacy — cabinet and WhatsApp are opt-in; one-off scan stores nothing; one-tap clear; no CNIC.
6. What the team built in-window — safety gate, resolver, FDA checker, strip verifier, PWA, WhatsApp loop, eval harness; commit history and README.
7. Wi-Fi or vendor down — local 60-pair matrix, Azure voice fallback, 5-case offline mode.

If a number is not in the committed eval table, say the measured figure or say it is not measured. Do not upgrade a target into a result.

## Done when

- Three clean timed runs exist, one of them on hotspot-only or offline mode.
- Every person who might speak can give Q1, Q2, and Q5 without the doc in hand.
- The backup video plays from the laptop with sound, from a cold open.
