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

