"""FastAPI entrypoint for the Dawa-Guard clinical safety engine."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.config import cors_origins, env_flag, env_int, load_env_files

load_env_files(override_external=not bool(os.getenv("PYTEST_CURRENT_TEST")))

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from routers.cabinet import router as cabinet_router
from routers.diagnostics import router as diagnostics_router
from routers.formulary import router as formulary_router
from routers.medicines import router as medicines_router
from routers.monitor import MIN_PASSWORD_LENGTH, install_monitor
from routers.scan import router as scan_router
from routers.whatsapp import configured_whatsapp_provider, router as whatsapp_router, whatsapp_configured
from services.formulary_resolver import FormularyResolver
from services.local_store import LocalStore
from services.medster_client import MedSterClient
from services.openfda_client import OpenFdaClient
from services.security import HardeningMiddleware, allowed_origins
from services.runtime_paths import is_serverless_readonly, writable_static_root
from services.web_medicine_resolver import WebMedicineResolver
from services.tts_stt_service import (
    configured_stt_provider,
    configured_tts_provider,
    freeapi_transcribe_enabled,
    stt_configured,
    tts_configured,
)
from services.vision_extractor import (
    DEFAULT_MODEL,
    DEFAULT_OPENROUTER_MODEL,
    GeminiVisionExtractor,
    configured_vision_provider,
    freeapi_imgchat_enabled,
    vision_configured,
)


def load_env_file() -> list[Path]:
    return load_env_files(force=True, override_external=not bool(os.getenv("PYTEST_CURRENT_TEST")))


def create_app(
    extractor=None,
    resolver: FormularyResolver | None = None,
    fda: OpenFdaClient | None = None,
    strip_dir: Path | None = None,
    store: LocalStore | None = None,
    medster: MedSterClient | None = None,
    web_resolver: WebMedicineResolver | None = None,
) -> FastAPI:
    load_env_files()
    static_root = writable_static_root()

    app = FastAPI(title="Nuskha Saathi Dawa-Guard", version="0.4.0")
    app.add_middleware(HardeningMiddleware)
    app.add_middleware(
        CORSMiddleware,
        # ALLOWED_ORIGINS (deployments) wins; CORS_ORIGINS is the local .env name.
        allow_origins=allowed_origins() if os.getenv("ALLOWED_ORIGINS", "").strip() else cors_origins(),
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )
    app.state.resolver = resolver or FormularyResolver.load()
    app.state.fda = fda or OpenFdaClient.from_resolver(
        app.state.resolver,
        live=env_flag("OPENFDA_LIVE", True),
    )
    app.state.medster = medster or MedSterClient()
    app.state.store = store or LocalStore()
    app.state.web_resolver = web_resolver or WebMedicineResolver(store=app.state.store)
    app.state.extractor = extractor or GeminiVisionExtractor()
    app.state.strip_dir = strip_dir or (static_root / "strips")
    app.state.audio_dir = static_root / "audio"
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
            headers={"X-Request-ID": _request.state.diagnostic_request_id}
            if hasattr(_request.state, "diagnostic_request_id")
            else {},
            content={
                "error": "INTERNAL_ERROR",
                "detail": "Unexpected server error while processing clinical safety check.",
                "urdu_message": "System mein aarzi kharabi aa gayi hai. Kuch der baad dobara koshish karein.",
            },
        )

    app.include_router(scan_router)
    app.include_router(cabinet_router)
    app.include_router(formulary_router)
    app.include_router(diagnostics_router)
    app.include_router(medicines_router)
    app.include_router(whatsapp_router)
    app.mount("/static", StaticFiles(directory=static_root), name="static")

    @app.get("/health")
    def health():
        v_provider = configured_vision_provider()
        v_model = (
            (os.getenv("OPENROUTER_MODEL") or DEFAULT_OPENROUTER_MODEL)
            if v_provider == "openrouter"
            else ("imgchat" if v_provider == "imgchat" else (os.getenv("GEMINI_MODEL") or DEFAULT_MODEL))
        )
        return {
            "status": "ok",
            "formulary_brands": len(app.state.resolver.entries),
            "interaction_pairs": len(app.state.fda.fallback),
            "capabilities": {
                "vision_configured": vision_configured(),
                "vision_provider": v_provider,
                # The model that last answered a scan, else the configured one.
                "vision_model": (
                    getattr(app.state.extractor, "active_model", None)
                    if getattr(app.state.extractor, "last_provider", None) or v_provider in (None, "gemini")
                    else v_model
                )
                or v_model,
                "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
                "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
                "freeapi_imgchat_enabled": freeapi_imgchat_enabled(),
                "freeapi_transcribe_enabled": freeapi_transcribe_enabled(),
                "medster_live": bool(app.state.medster.live),
                "medicine_web_live": bool(app.state.web_resolver.live),
                "tts_configured": tts_configured(),
                "tts_provider": configured_tts_provider(),
                "stt_configured": stt_configured(),
                "stt_provider": configured_stt_provider(),
                "openfda_live": bool(app.state.fda.live),
                "openfda_key_configured": bool(os.getenv("OPENFDA_API_KEY")),
                "whatsapp_configured": whatsapp_configured(),
                "whatsapp_provider": configured_whatsapp_provider(),
                "admin_monitor_configured": len(os.getenv("ADMIN_MONITOR_PASSWORD", "")) >= MIN_PASSWORD_LENGTH,
                "ephemeral_storage": is_serverless_readonly(),
            },
            "store": app.state.store.counts(),
        }

    @app.get("/")
    def root():
        return {
            "service": app.title,
            "version": app.version,
            "status": "ok",
            "docs": "/docs",
            "health": "/health",
            "admin": "/admin",
        }

    @app.get("/api/v1/benchmark")
    def eval_benchmark():
        report_path = BACKEND_ROOT / "tests" / "eval_results.json"
        if not report_path.is_file():
            return {"available": False, "summary": None}
        return {"available": True, "summary": json.loads(report_path.read_text(encoding="utf-8"))}

    install_monitor(app, health)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=env_int("PORT", 8000),
        reload=env_flag("UVICORN_RELOAD", False),
    )
