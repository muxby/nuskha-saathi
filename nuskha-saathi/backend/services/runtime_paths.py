"""Writable runtime path resolution for local, Docker, and read-only serverless hosts."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def is_serverless_readonly() -> bool:
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return True
    try:
        return not os.access(BACKEND_ROOT, os.W_OK)
    except OSError:
        return True


def writable_root() -> Path:
    if is_serverless_readonly():
        root = Path(tempfile.gettempdir()) / "nuskha-saathi"
        root.mkdir(parents=True, exist_ok=True)
        return root
    return BACKEND_ROOT


def writable_static_root() -> Path:
    override = os.environ.get("NUSKHA_STATIC_DIR", "").strip()
    root = Path(override) if override else (writable_root() / "static")
    (root / "strips").mkdir(parents=True, exist_ok=True)
    (root / "audio").mkdir(parents=True, exist_ok=True)
    return root


def writable_db_path() -> Path:
    override = os.environ.get("NUSKHA_DB_PATH", "").strip()
    if override:
        return Path(override)
    if is_serverless_readonly():
        return writable_root() / "nuskha_local.db"
    return BACKEND_ROOT / "data" / "nuskha_local.db"
