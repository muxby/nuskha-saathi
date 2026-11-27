"""HTTP hardening for the public API: response headers, origins, rate limits.

Nothing here touches clinical logic. These controls bound abuse of the costly
vision endpoints and keep API responses from being framed or sniffed.
"""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque

SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

# Scan, strip and cabinet responses describe one patient's medicines.
NO_STORE_PREFIXES: tuple[str, ...] = ("/api/v1/",)


def headers_for(path: str) -> dict[str, str]:
    """Headers added to every response for ``path``."""
    headers = dict(SECURITY_HEADERS)
    if path.startswith(NO_STORE_PREFIXES):
        headers["Cache-Control"] = "no-store"
    return headers


def allowed_origins() -> list[str]:
    """Origins allowed by CORS.

    ``ALLOWED_ORIGINS`` is a comma-separated list. Unset keeps the API open,
    which the public demo relies on; a deployment that stores patient data
    should set it to the frontend origin.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw:
        return ["*"]
    origins = [origin.strip().rstrip("/") for origin in raw.split(",")]
    return [origin for origin in origins if origin] or ["*"]


class RateLimiter:
    """Sliding-window limiter keyed by client. Process-local by design.

    A single instance bounds one process. It is a cost guard for the vision
    endpoints, not an account system, and it resets on restart.
    """

    def __init__(self, limit: int, window_seconds: float = 60.0, clock=time.monotonic):
        self.limit = max(0, int(limit))
        self.window = float(window_seconds)
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        return self.limit > 0

    def check(self, key: str) -> tuple[bool, int]:
        """Record a hit. Returns ``(allowed, retry_after_seconds)``."""
        if not self.enabled:
            return True, 0
        now = self._clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry = max(1, int(self.window - (now - hits[0]) + 0.999))
                return False, retry
            hits.append(now)
            return True, 0

