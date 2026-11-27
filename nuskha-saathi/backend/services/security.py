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

    def prune(self) -> int:
        """Drop clients with no hits inside the window. Returns clients kept."""
        now = self._clock()
        with self._lock:
            for key in list(self._hits):
                hits = self._hits[key]
                while hits and now - hits[0] >= self.window:
                    hits.popleft()
                if not hits:
                    del self._hits[key]
            return len(self._hits)


def client_key(forwarded_for: str | None, peer: str | None) -> str:
    """Rate-limit key for a request.

    Render and Vercel put the caller's address first in ``X-Forwarded-For``.
    The value is used only as a bucket key and is never stored or logged.
    """
    if forwarded_for:
        first = forwarded_for.split(",", 1)[0].strip()
        if first:
            return first[:64]
    return (peer or "unknown")[:64]


RATE_LIMITED_PATHS: frozenset[str] = frozenset({"/api/v1/scan-parchi", "/api/v1/verify-strip"})
# Each call to the self-test spends one provider request, so it is limited too.
RATE_LIMITED_ANY_METHOD: frozenset[str] = frozenset({"/api/v1/diagnostics/vision"})


def scan_rate_limit() -> int:
    """Requests per minute per client for vision routes. ``0`` disables."""
    try:
        return max(0, int(os.getenv("SCAN_RATE_LIMIT_PER_MINUTE", "30")))
    except ValueError:
        return 30


class HardeningMiddleware:
    """Pure ASGI middleware: one pass, no body buffering, upload streams intact."""

    def __init__(self, app, limiter: RateLimiter | None = None):
        self.app = app
        self.limiter = limiter if limiter is not None else RateLimiter(scan_rate_limit())

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path", "")
        extra = headers_for(path)

        limited = (scope.get("method") == "POST" and path in RATE_LIMITED_PATHS) or path in RATE_LIMITED_ANY_METHOD
        if limited and self.limiter.enabled:
            headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
            peer = scope.get("client")
            key = client_key(headers.get("x-forwarded-for"), peer[0] if peer else None)
            allowed, retry_after = self.limiter.check(key)
            if not allowed:
                await _send_rate_limited(send, retry_after, extra)
                return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                present = {name.lower() for name, _ in message.get("headers", [])}
                added = [
                    (name.encode("latin-1"), value.encode("latin-1"))
                    for name, value in extra.items()
                    if name.lower().encode("latin-1") not in present
                ]
                message = {**message, "headers": [*message.get("headers", []), *added]}
            await send(message)

        await self.app(scope, receive, send_with_headers)


async def _send_rate_limited(send, retry_after: int, extra: dict[str, str]) -> None:
    import json

    body = json.dumps(
        {
            "error": "HTTP_429",
            "detail": "Too many scans from this device. Wait a moment and try again.",
            "urdu_message": "Bohat zyada darkhwastein aa gayi hain. Thori der baad dobara koshish karein.",
        }
    ).encode("utf-8")
    headers = [
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body)).encode("ascii")),
        (b"retry-after", str(retry_after).encode("ascii")),
        (b"access-control-allow-origin", b"*"),
        *[(k.encode("latin-1"), v.encode("latin-1")) for k, v in extra.items()],
    ]
    await send({"type": "http.response.start", "status": 429, "headers": headers})
    await send({"type": "http.response.body", "body": body})
