"""FastAPI entrypoint for the Dawa-Guard clinical safety engine."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from routers.monitor import install_monitor
from routers.cabinet import router as cabinet_router
from routers.scan import router as scan_router
from routers.whatsapp import router as whatsapp_router, whatsapp_configured
from services.formulary_resolver import FormularyResolver
from services.local_store import LocalStore
from services.openfda_client import OpenFdaClient
from services.runtime_paths import BACKEND_ROOT, is_serverless_readonly, writable_static_root
from services.tts_stt_service import tts_configured
from services.vision_extractor import GeminiVisionExtractor

STATIC_ROOT = writable_static_root()


def load_env_file() -> None:
    for candidate in (BACKEND_ROOT.parent / ".env", BACKEND_ROOT / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def create_app(
    extractor=None,
    resolver: FormularyResolver | None = None,
    fda: OpenFdaClient | None = None,
    strip_dir: Path | None = None,
    store: LocalStore | None = None,
) -> FastAPI:
    load_env_file()
    app = FastAPI(title="Nuskha Saathi Dawa-Guard", version="0.3.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.resolver = resolver or FormularyResolver.load()
    app.state.fda = fda or OpenFdaClient.from_resolver(app.state.resolver)
    app.state.extractor = extractor or GeminiVisionExtractor()
    app.state.store = store or LocalStore()
    app.state.strip_dir = strip_dir or (STATIC_ROOT / "strips")
    app.state.audio_dir = STATIC_ROOT / "audio"
    app.state.strip_dir.mkdir(parents=True, exist_ok=True)
    app.state.audio_dir.mkdir(parents=True, exist_ok=True)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": f"HTTP_{exc.status_code}",
                "detail": exc.detail,
                "urdu_message": "Darkhwast poori nahi ho saki. Meherbani karke dobara check karein.",
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": "VALIDATION_ERROR",
                "detail": exc.errors(),
                "urdu_message": "Bheja gaya data sahih format mein nahi hai.",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception):
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": _request.state.diagnostic_request_id} if hasattr(_request.state, "diagnostic_request_id") else {},
            content={
                "error": "INTERNAL_ERROR",
                "detail": "Unexpected server error while processing clinical safety check.",
                "urdu_message": "System mein aarzi kharabi aa gayi hai. Kuch der baad dobara koshish karein.",
            },
        )

    app.include_router(scan_router)
    app.include_router(cabinet_router)
    app.include_router(whatsapp_router)
    app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "formulary_brands": len(app.state.resolver.entries),
            "interaction_pairs": len(app.state.fda.fallback),
            "capabilities": {
                "vision_configured": bool(os.getenv("GEMINI_API_KEY")),
                "tts_configured": tts_configured(),
                "openfda_live": bool(app.state.fda.live),
                "whatsapp_configured": whatsapp_configured(),
                "ephemeral_storage": is_serverless_readonly(),
            },
            "store": app.state.store.counts(),
        }

    @app.get("/api/v1/benchmark")
    def eval_benchmark():
        report_path = BACKEND_ROOT / "tests" / "eval_results.json"
        if not report_path.is_file():
            return {"available": False, "summary": None}
        import json

        return {"available": True, "summary": json.loads(report_path.read_text(encoding="utf-8"))}

    install_monitor(app, health)
    return app


app = create_app()
