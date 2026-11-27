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


