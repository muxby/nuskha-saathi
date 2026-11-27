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

