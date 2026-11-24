"""FastAPI entrypoint for the Dawa-Guard clinical safety engine."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers.scan import router as scan_router
from services.formulary_resolver import FormularyResolver
from services.openfda_client import OpenFdaClient
from services.vision_extractor import GeminiVisionExtractor

BACKEND_ROOT = Path(__file__).resolve().parent
STATIC_ROOT = BACKEND_ROOT / "static"


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
) -> FastAPI:
    load_env_file()
    app = FastAPI(title="Nuskha Saathi Dawa-Guard", version="0.2.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.resolver = resolver or FormularyResolver.load()
    app.state.fda = fda or OpenFdaClient.from_resolver(app.state.resolver)
    app.state.extractor = extractor or GeminiVisionExtractor()
    app.state.strip_dir = strip_dir or (STATIC_ROOT / "strips")
    app.state.strip_dir.mkdir(parents=True, exist_ok=True)
    (STATIC_ROOT / "audio").mkdir(parents=True, exist_ok=True)
    app.include_router(scan_router)
    app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "formulary_brands": len(app.state.resolver.entries),
            "interaction_pairs": len(app.state.fda.fallback),
        }

    return app


app = create_app()
