"""Backend self-test for the private admin panel.

Each check exercises one real part of the engine and reports pass or fail
with a duration. Results carry no patient data, keys or provider error text.
The quick set makes no network calls and costs nothing; the live set spends
one vision request and one openFDA request.
"""

from __future__ import annotations

import inspect
import secrets
from time import perf_counter
from typing import Awaitable, Callable

Check = Callable[[], "str | Awaitable[str]"]


async def _run(name: str, label: str, check: Check) -> dict:
    started = perf_counter()
    try:
        outcome = check()
        if inspect.isawaitable(outcome):
            outcome = await outcome
        ok, detail = True, str(outcome)
    except AssertionError as exc:
        ok, detail = False, str(exc) or "Unexpected result"
    except Exception as exc:  # noqa: BLE001 — a failing check must never crash the panel
        ok, detail = False, type(exc).__name__
    return {"name": name, "label": label, "ok": ok, "detail": detail, "ms": round((perf_counter() - started) * 1000, 1)}


