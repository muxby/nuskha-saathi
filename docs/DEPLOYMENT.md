# Deployment guide

How to put the backend online, put the frontend online, and connect the two.
Follow the steps in order: the frontend needs the backend's address at build
time, so the backend goes first.

```text
 Phone / browser ──► Frontend (Next.js on Vercel) ──► Backend (FastAPI on Render) ──► Gemini, openFDA
                         NEXT_PUBLIC_API_BASE_URL          GEMINI_API_KEY
```

## What you need

| Item | Where to get it | Used by |
| --- | --- | --- |
| GitHub repository access | this repository | Render and Vercel |
| Gemini API key | Google AI Studio → *Get API key* | backend |
| Render account | render.com | backend hosting |
| Vercel account | vercel.com | frontend hosting |

Optional: an openFDA key (higher rate limit) and Uplift / Azure / Google
speech keys for server-generated Urdu audio. Without a speech key the app
uses the phone's own Urdu voice.

## Step 1 — Backend on Render

**Blueprint (fastest).** The repository includes [`render.yaml`](../render.yaml).

1. Render dashboard → **New** → **Blueprint** → select this repository.
2. Render reads `render.yaml` and proposes one service, `nuskha-saathi-api`.
3. When asked, paste `GEMINI_API_KEY`. Leave `FRONTEND_BASE_URL` and
   `ALLOWED_ORIGINS` empty for now; you will fill them in Step 3.
4. **Apply**. The first build takes a few minutes.

**Manual setup**, if you prefer not to use the blueprint:

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Branch | `main` |
| Root directory | `nuskha-saathi/backend` |
| Runtime | Docker (`Dockerfile`) |
| Health check path | `/health` |

Backend environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Reads the prescription photo. Without it every scan is refused. |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash`. If that id is retired the server falls back to a current Flash model. |
| `FRONTEND_BASE_URL` | yes, after Step 2 | Origin printed into the audio QR code. |
| `ALLOWED_ORIGINS` | recommended | Comma-separated origins allowed to call the API. Unset means any origin. |
| `SCAN_RATE_LIMIT_PER_MINUTE` | no | Scans per client per minute. Default `30`, `0` disables. |
| `OPENFDA_API_KEY` | no | Raises the openFDA rate limit. |
| `UPLIFT_API_KEY`, `UPLIFT_VOICE_ID`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `GOOGLE_TTS_API_KEY` | no | Server Urdu audio. |
| `ADMIN_MONITOR_PASSWORD` | no | Enables the private `/admin` diagnostics panel (16+ characters). |

### Check the backend before going further

Replace the host with your Render URL.

```bash
curl https://YOUR-API.onrender.com/health
```

Expect `"status":"ok"` and `"vision_configured":true`.

`vision_configured` only says a key is present. This proves the key and model
actually work by sending one generated test image through the reader:

```bash
curl https://YOUR-API.onrender.com/api/v1/diagnostics/vision
```

| `status` | Meaning | Fix |
| --- | --- | --- |
| `OK` | The reader answered. | Nothing. |
| `NOT_CONFIGURED` | No key on the server. | Add `GEMINI_API_KEY`, redeploy. |
| `UPSTREAM_REJECTED` | Google refused the request. | Key invalid, out of quota, or `GEMINI_MODEL` not available to it. |
| `UPSTREAM_UNAVAILABLE` | Timeout or network failure. | Retry; check the host allows outbound HTTPS. |

Do not continue until this returns `"ok": true`.

## Step 2 — Frontend on Vercel

1. Vercel dashboard → **Add New** → **Project** → import this repository.
2. **Root Directory**: `nuskha-saathi/frontend`. Framework preset: Next.js.
3. **Environment Variables** → add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |

4. **Deploy**.

> `NEXT_PUBLIC_API_BASE_URL` is compiled into the JavaScript bundle. Changing
> it later has no effect until you **redeploy**. A site built without it
> points at `http://localhost:8000` and cannot scan; the app shows
> "This app is not connected to a server" when that happens.

## Step 3 — Connect the two

Back in Render → your service → **Environment**:

| Variable | Value |
| --- | --- |
| `FRONTEND_BASE_URL` | `https://YOUR-APP.vercel.app` |
| `ALLOWED_ORIGINS` | `https://YOUR-APP.vercel.app` |

Save. Render redeploys the backend.

If you use Vercel preview deployments, add their origins to
`ALLOWED_ORIGINS` too, separated by commas, or leave it unset while testing.

## Step 4 — Confirm it works end to end

Open the Vercel URL on a phone using mobile data.

1. **Settings** shows a green *Connected to the safety engine* with your API host.
2. **Scan prescription** shows no warning banner above the camera.
3. Photograph a prescription. Within about 10–20 seconds you see the result
   summary, the day plan and the dose cards.
4. **My medicines** → type `aug` → *Augmentin* is suggested.
5. Add `?demo=offline` to the URL: the five demo cases open with no network.

## Troubleshooting

| What you see | Cause | Fix |
| --- | --- | --- |
| "This app is not connected to a server" | Frontend built without `NEXT_PUBLIC_API_BASE_URL`, or it is `http://` on an `https://` site. | Set it to the `https://` backend URL in Vercel, then redeploy. |
| "The server is not answering" | Backend asleep (free tier), crashed, or the URL is wrong. | Open `/health` in a browser. A free Render service takes up to a minute to wake. |
| "Live reading is switched off on the server" | `GEMINI_API_KEY` missing. | Add it on the backend and redeploy. |
| "Your photo was not read. This is not a problem with your photo." | Gemini rejected or timed out. | Run `/api/v1/diagnostics/vision` and follow its `hint`. |
| Every photo is "needs confirmation" | The reader works but confidence is under 0.85. | Better light, whole page in frame. This is the safety gate doing its job. |
| Browser console shows a CORS error | `ALLOWED_ORIGINS` does not include the frontend origin. | Add the exact origin (scheme + host, no path). |
| "Too many scans in a short time" | Rate limit reached. | Wait a minute, or raise `SCAN_RATE_LIMIT_PER_MINUTE`. |
| QR code opens the wrong site | `FRONTEND_BASE_URL` unset or stale. | Set it to the frontend origin. |
| First scan after a quiet period is slow | Cold start. | Open `/health` a few minutes before a demo. |

### Photo size

The app downsizes every photo to 2000 px on the long edge and re-encodes it
as JPEG in the browser before uploading, typically under 1 MB. This keeps
scans fast on mobile data and well inside host request limits. The backend
still accepts files up to 8 MB from other clients.

## Alternative — backend on Vercel

The backend also runs as a Vercel project (root directory
`nuskha-saathi/backend`, same environment variables). Know the limits first:

- **Request body limit.** Vercel Functions reject request bodies over 4.5 MB.
  The app's own uploads are compressed below that; other clients must do the same.
- **Execution time.** A scan waits on Gemini, openFDA and optional speech.
  If scans end in a timeout, raise the function's maximum duration in the
  Vercel project settings.
- **Storage is temporary.** SQLite, generated audio and strip thumbnails live
  in `/tmp` and disappear between invocations. Saved prescriptions stay on
  the patient's device; the server cabinet does not persist.

Render with Docker is the recommended backend host because it keeps one
long-lived process and includes `ffmpeg`.

## Run everything locally

```bash
make setup
```

```bash
cp nuskha-saathi/.env.example nuskha-saathi/.env
```

Put `GEMINI_API_KEY` in `nuskha-saathi/.env`, then start each server in its
own terminal:

```bash
make api
```

```bash
make web
```

Open `http://localhost:3000`. Camera capture needs `localhost` or HTTPS.
