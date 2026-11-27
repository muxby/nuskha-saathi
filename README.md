# Nuskha Saathi — نسخہ ساتھی

A bilingual prescription companion for patients in Pakistan. Photograph a
handwritten prescription and the app shows what was read, flags dangerous
combinations with the source wording, lays out when to take each medicine,
and reads the instructions aloud in Urdu.

**The vision model only reads. A deterministic safety engine decides.**
Unclear handwriting, unknown brands and doses above the listed ceiling are
refused, never guessed.

## What it does

- **Reads the parchi.** Each line is matched to a curated Pakistani formulary
  (327 brands). Low-confidence lines are cropped and sent back for a pharmacist.
- **Checks interactions** against openFDA drug labels, with 73 cached pairs for
  when the network is down, including medicines from earlier doctors.
- **Shows the day.** A morning / afternoon / night plan built only from
  verified lines, plus per-medicine dose cards that can be printed.
- **Speaks Urdu.** Fixed Urdu sentences in a natural Urdu voice, replayable from a QR code.
- **Checks the strip.** Compares the medicine in hand with the prescription.
- **Works offline.** Five demo cases and saved prescriptions open with no network.

## Repository

| Path | Contents |
| --- | --- |
| [`nuskha-saathi/backend`](nuskha-saathi/backend) | FastAPI safety engine, formulary and interaction data, tests |
| [`nuskha-saathi/frontend`](nuskha-saathi/frontend) | Next.js PWA in English and Urdu |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Put the backend and frontend online and connect them |
| [`docs/ADMIN_PANEL.md`](docs/ADMIN_PANEL.md) | Private backend panel: self-tests, wake and keep-awake |
| [`docs/SECURITY_PLAN.md`](docs/SECURITY_PLAN.md) | Clinical safety boundary and privacy rules |
| [`docs/phases`](docs/phases) | Sprint plan |
| [`nuskha-saathi/README.md`](nuskha-saathi/README.md) | API contracts, disclosed models and datasets, limits |

## Quick start

```bash
make setup
```

```bash
cp nuskha-saathi/.env.example nuskha-saathi/.env
```

Add `GEMINI_API_KEY` or `OPENROUTER_API_KEY` to that file, then in two terminals:

```bash
make api
```

```bash
make web
```

Open `http://localhost:3000`. No key? Open `http://localhost:3000/?demo=offline`.

`./nuskha-saathi/start.sh` (or `start.ps1` on Windows) starts both servers in
one step. The optional third-party services and what they receive are listed
in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Tests

| Command | Covers |
| --- | --- |
| `make test-backend` | 174 backend tests: safety gate, routes, data integrity, hardening, providers, reminders, Urdu voice |
| `make eval` | 30-case deterministic safety benchmark |
| `make test-frontend` | Type check and 60 unit tests |
| `make test-ui` | 20 browser and accessibility checks with mocked API states |
| `make test-e2e` | 12 browser checks against the real backend |

The two browser suites need the API on port 8000 and a production frontend
build on port 3000.

## Clinical boundary

Nuskha Saathi helps a patient understand a prescription and raises safety
flags. It does not diagnose, prescribe, or authorise changing a medicine.
Follow the treating clinician and ask a pharmacist about anything unclear.
