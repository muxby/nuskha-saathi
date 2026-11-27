# Backend panel

A private page for checking that the backend is alive, running its
self-tests, choosing the Urdu voice, and waking it before a demo.

## Opening it

There is no button or link to the panel anywhere in the app. Type the address:

| Address | What happens |
| --- | --- |
| `https://YOUR-APP.vercel.app/admin` | Wakes the backend, shows how long it took, then opens the panel sign-in. |
| `https://YOUR-API.onrender.com/admin` | The panel itself. |

Both pages ask search engines not to index them.

## Setting the password

The password is read from the backend environment variable
`ADMIN_MONITOR_PASSWORD`. It is **not** stored in the repository: this is a
public repo, and a password committed here would be readable by anyone.

1. Render → your backend service → **Environment**.
2. Add `ADMIN_MONITOR_PASSWORD` with your password (12 characters or more).
3. Save. Render redeploys, and the panel accepts that password.

Until the variable is set, sign-in is disabled. For local development put the
same line in `nuskha-saathi/.env`, which Git ignores.

Sessions last 8 hours and end on restart or when the password changes. Five
wrong attempts lock sign-in from that device for five minutes.

## Backend tests

**Run quick checks** runs inside the server. No network calls, no cost.

| Check | Proves |
| --- | --- |
| Clinical datasets | The formulary loaded with at least 200 brands. |
| Brand-to-salt resolver | A misspelt `Augmntin` resolves to Augmentin. |
| Safety refusal locks | A blurry line, an unknown brand and 5000 mg Leflox are all refused. |
| Offline interaction cache | ibuprofen + warfarin is present and HIGH with no network. |
| Database write and read | A row can be written, read back and cleared. |

**Run live checks** adds three that reach outside the server:

| Check | Proves |
| --- | --- |
| Gemini vision reader | The key and model really work: one generated test image is read. Uses one Gemini request. |
| openFDA live label | The live drug-label API answers. If it does not, the offline cache is used. |
| Urdu voice | The voice provider returns audio in the selected voice. Uses one voice request. |

A failed check names the cause and the fix. Results never include patient
data, keys or a provider's raw error text.

## Urdu voice

The app reads instructions aloud in one of four Urdu voices:

| Voice | |
| --- | --- |
| Uzma | Female · Pakistan (default) |
| Asad | Male · Pakistan |
| Gul | Female · India |
| Salman | Male · India |

Select a voice in the **Urdu voice** section. It applies to new audio straight
away. **Play sample** speaks one test sentence in that voice without changing
the selection. Audio already saved for an earlier scan keeps the voice it was
made with.

The choice is saved in the backend database. Free hosting clears that
database whenever the server restarts or sleeps, and the voice then returns
to the default. To change the default itself, set `URDU_TTS_VOICE` on the
server to `uzma`, `asad`, `gul` or `salman`.

Speech comes from freeapi.pro, which needs no key. If it does not answer, the
app falls back to the phone's own Urdu voice, and the section shows a notice
when server voice is switched off (`FREEAPI_TTS_ENABLED=0`).

## Waking the backend

Free hosting puts the backend to sleep after about 15 idle minutes. The next
request then waits for it to start, which can take most of a minute.

- **Before a demo:** open `/admin` on the frontend address. It pings until
  the backend answers and shows the wake time.
- **Ping backend now** in the panel measures the response time. Over four
  seconds is reported as a cold start.
- **Keep awake** pings every four minutes while the panel tab stays open.
- **Around the clock:** set the repository variable `BACKEND_HEALTH_URL` to
  your `/health` address. The scheduled workflow
  [`keep-awake.yml`](../.github/workflows/keep-awake.yml) then pings every
  ten minutes. Remove the variable to stop it.

Keeping an instance awake uses the host's free monthly hours.

## Urdu

**اردو** in the panel header switches the interface to Urdu, set in Gulzar: a
Nastaliq typeface drawn for screens, with the calligraphic character of film
titles and open letterforms that stay readable at small sizes. The font file
is bundled with the backend (SIL Open Font License, included), so the panel
makes no request to a font service. Technical values such as commit ids,
timings and request ids stay in Latin letters.
