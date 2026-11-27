# Backend panel

A private page for checking that the backend is alive, running its
self-tests, and waking it before a demo.

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

**Run live checks** adds two that reach outside the server:

| Check | Proves |
| --- | --- |
| Gemini vision reader | The key and model really work: one generated test image is read. Uses one Gemini request. |
| openFDA live label | The live drug-label API answers. If it does not, the offline cache is used. |

A failed check names the cause and the fix. Results never include patient
data, keys or a provider's raw error text.

