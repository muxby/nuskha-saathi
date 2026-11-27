"""Centralized .env configuration loader and runtime environment helpers."""

from __future__ import annotations

import os
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


def _parse_env_line(raw_line: str) -> tuple[str, str] | None:
    line = raw_line.strip()
    if not line or line.startswith("#"):
        return None
    if line.startswith("export "):
        line = line[7:].strip()
    if "=" not in line:
        return None
    key, raw_value = line.split("=", 1)
    key = key.strip()
    if not key:
        return None
    val = raw_value.strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in {'"', "'"}:
        val = val[1:-1]
    elif " #" in val:
        val = val.split(" #", 1)[0].rstrip()
    return key, val


def load_env_files(
    paths: tuple[Path, ...] | list[Path] | None = None,
    *,
    force: bool = False,
    override_external: bool = False,
) -> list[Path]:
    """Load .env files into os.environ without leaking live keys into pytest runs.

    Non-empty shell environment variables already set always take precedence.
    Empty values in an earlier file do not block non-empty values in a later file.
    """
    if not force and ("pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST")):
        return []

    candidates = (
        tuple(paths)
        if paths is not None
        else (
            PROJECT_ROOT / ".env",
            BACKEND_ROOT / ".env",
            BACKEND_ROOT / ".env.local",
        )
    )
    loaded: list[Path] = []
    external_nonempty = set() if override_external else {k for k, v in os.environ.items() if v != ""}
    for candidate in candidates:
        if not candidate.is_file():
            continue
        for raw_line in candidate.read_text(encoding="utf-8").splitlines():
            parsed = _parse_env_line(raw_line)
            if parsed is None:
                continue
            key, value = parsed
            if key in external_nonempty or (override_external and value == ""):
                continue
            current = os.environ.get(key)
            if current is None or (current == "" and value != "") or value != "":
                os.environ[key] = value
        loaded.append(candidate)
    return loaded


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    cleaned = raw.strip().lower()
    if cleaned in {"1", "true", "yes", "on"}:
        return True
    if cleaned in {"0", "false", "no", "off"}:
        return False
    return default


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw.strip())
    except ValueError:
        return default


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    items = [item.strip() for item in raw.split(",") if item.strip()]
    return items or ["*"]


@lru_cache(maxsize=1)
def git_commit_short() -> str:
    for var in ("APP_COMMIT", "GIT_COMMIT", "VERCEL_GIT_COMMIT_SHA", "RENDER_GIT_COMMIT"):
        value = os.getenv(var, "").strip()
        if value:
            return value[:12]
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=2,
            check=True,
        )
        commit = proc.stdout.strip()
        if commit:
            return commit[:12]
    except Exception:
        pass
    return "local"
