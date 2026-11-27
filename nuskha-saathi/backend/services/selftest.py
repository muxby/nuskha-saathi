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


def _formulary(app) -> str:
    hit = app.state.resolver.resolve("Augmntin")
    assert hit is not None and hit.brand_name == "Augmentin", "Misspelt brand did not resolve"
    return f"Augmntin → {hit.brand_name} ({' + '.join(hit.generic_salts)})"


def _locks(app) -> str:
    from schemas.vision import ExtractedLine
    from services.safety_gate import evaluate_line

    resolver = app.state.resolver
    blurry = evaluate_line(ExtractedLine(brand_or_salt_guess="Panadol", strength_mg=500, ocr_confidence=0.84), resolver)
    assert blurry.status == "REFUSED_BLURRY", "Low-confidence line was not refused"
    unknown = evaluate_line(ExtractedLine(brand_or_salt_guess="Zzqxvyn", strength_mg=5, ocr_confidence=0.99), resolver)
    assert unknown.status == "REFUSED_UNKNOWN_DRUG", "Unknown brand was not refused"
    overdose = evaluate_line(
        ExtractedLine(brand_or_salt_guess="Leflox", strength_mg=5000, morning_qty=1, ocr_confidence=0.99), resolver
    )
    assert overdose.status == "REFUSED_DOSAGE_ANOMALY", "5000 mg Leflox was not refused"
    return "Blur, unknown-drug and dose-ceiling locks all refuse"


def _interactions(app) -> str:
    from services.openfda_client import _pair_key

    hit = app.state.fda.fallback.get(_pair_key("ibuprofen", "warfarin"))
    assert hit is not None and hit.severity == "HIGH", "ibuprofen + warfarin is missing from the offline cache"
    return f"{len(app.state.fda.fallback)} cached pairs; ibuprofen + warfarin is HIGH"


def _storage(app) -> str:
    store = app.state.store
    patient = f"selftest-{secrets.token_hex(6)}"
    store.add_cabinet_item(patient, brand_name="Marevan", generic_salts=["warfarin"], strength_mg=5)
    assert len(store.list_cabinet(patient)) == 1, "Written row could not be read back"
    assert store.clear_cabinet(patient) == 1, "Written row could not be cleared"
    return "Write, read and clear succeeded"


def _datasets(app) -> str:
    brands = len(app.state.resolver.entries)
    assert brands >= 200, f"Only {brands} formulary brands loaded"
    return f"{brands} formulary brands loaded"


async def _vision(app) -> str:
    from routers.diagnostics import _HINTS, _test_image
    from services.vision_extractor import VisionExtractError

    try:
        extraction = await app.state.extractor.extract(_test_image(), "image/jpeg", "parchi")
    except VisionExtractError as exc:
        code = getattr(exc, "code", "BAD_OUTPUT")
        raise AssertionError(f"{code}: {_HINTS.get(code, '')}") from exc
    model = getattr(app.state.extractor, "active_model", "reader")
    return f"{model} read {len(extraction.extracted_lines)} line(s)"


async def _openfda(app) -> str:
    assert app.state.fda.live, "Live openFDA lookups are disabled; the offline cache is used"
    label = await app.state.fda.fetch_label("ibuprofen")
    assert label, "openFDA did not return a label; the offline cache is used"
    return "openFDA returned the ibuprofen label"


