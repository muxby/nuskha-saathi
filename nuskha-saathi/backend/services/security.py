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

