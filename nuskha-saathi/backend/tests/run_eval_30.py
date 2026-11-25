"""30-parchi deterministic safety-gate, formulary, interaction, and strip-check evaluation runner.

Measures deterministic safety accuracy, safe refusal rate on ambiguous/low-confidence input,
FDA interaction recall, physical strip mismatch detection, and local processing latency across
all four Master Spec Section 6 benchmark buckets. Results reflect synthetic clinical vectors,
not physical hospital handwriting photographs.
"""

from __future__ import annotations

import asyncio
import json
import math
from pathlib import Path
from statistics import median
from time import perf_counter

from schemas.vision import ExtractedLine
from services.formulary_resolver import FormularyResolver
from services.openfda_client import OpenFdaClient
from services.safety_gate import evaluate_line
from services.strip_verifier import compare_strip

OUTPUT_PATH = Path(__file__).resolve().parent / "eval_results.json"

STANDARD_PARCHI_CASES: list[tuple[str, str, list[str], float, float, float, float, str]] = [
    ("Tab Augmentin 625mg BD pc", "Augmentin", ["amoxicillin", "clavulanate"], 625, 1, 0, 1, "after_food"),
    ("Tab Augmntin 625 BD", "Augmntin", ["amoxicillin", "clavulanate"], 625, 1, 0, 1, "after_food"),
    ("Cap Risek 40mg OD ac", "Risek", ["omeprazole"], 40, 1, 0, 0, "before_food"),
    ("Tab Panadol 500mg TDS", "Panadol", ["acetaminophen"], 500, 1, 1, 1, "after_food"),
    ("Tab Glucophage 500mg BD", "Glucophage", ["metformin"], 500, 1, 0, 1, "after_food"),
    ("Tab Concor 5mg OD", "Concor", ["bisoprolol"], 5, 1, 0, 0, "any"),
    ("Tab Leflox 500mg OD", "Leflox", ["levofloxacin"], 500, 1, 0, 0, "after_food"),
    ("Tab Flagyl 400mg TDS", "Flagyl", ["metronidazole"], 400, 1, 1, 1, "after_food"),
    ("Tab Brufen 400mg BD", "Brufen", ["ibuprofen"], 400, 1, 0, 1, "after_food"),
    ("Tab Disprin 300mg OD", "Disprin", ["aspirin"], 300, 1, 0, 0, "after_food"),
    ("Tab Arinac 200mg BD", "Arinac", ["ibuprofen", "pseudoephedrine"], 200, 1, 0, 1, "after_food"),
    ("Tab Marevan 5mg HS", "Marevan", ["warfarin"], 5, 0, 0, 1, "any"),
    ("Tab Lipitor 20mg HS", "Lipitor", ["atorvastatin"], 20, 0, 0, 1, "any"),
    ("Tab Klacid 500mg BD", "Klacid", ["clarithromycin"], 500, 1, 0, 1, "after_food"),
    ("Tab Ciproxin 500mg BD", "Ciproxin", ["ciprofloxacin"], 500, 1, 0, 1, "any"),
]

SCRIBBLE_REFUSAL_CASES: list[tuple[str, str, float]] = [
    ("Syp ??? 5ml", "???", 0.42),
    ("Tab Unclearix 250", "Unclearix", 0.74),
    ("Boundary Blur", "Brufen", 0.84),
    ("Tab Zyloxitron-X", "Zyloxitron-X", 0.94),
    ("Corrupt NaN line", "Panadol", float("nan")),
]

INTERACTION_CASES: list[tuple[str, list[str], list[str]]] = [
    ("Warfarin + Ibuprofen", ["ibuprofen"], ["warfarin"]),
    ("Ciprofloxacin + Tizanidine", ["ciprofloxacin"], ["tizanidine"]),
    ("Metronidazole + Warfarin", ["metronidazole"], ["warfarin"]),
    ("Sildenafil + Isosorbide Mononitrate", ["sildenafil"], ["isosorbide mononitrate"]),
    ("Clarithromycin + Simvastatin", ["clarithromycin"], ["simvastatin"]),
]

STRIP_AND_ANOMALY_CASES: list[dict] = [
    {
        "kind": "strip",
        "name": "Leflox 250mg strip vs 500mg rx",
        "expected_brand": "Leflox",
        "expected_salts": ["levofloxacin"],
        "expected_strength": 500.0,
        "detected_brand": "Leflox",
        "detected_salts": ["levofloxacin"],
        "detected_strength": 250.0,
        "confidence": 0.96,
        "want": "STRENGTH_MISMATCH",
    },
    {
        "kind": "strip",
        "name": "Panadol swap vs Brufen rx",
        "expected_brand": "Brufen",
        "expected_salts": ["ibuprofen"],
        "expected_strength": 400.0,
        "detected_brand": "Panadol",
        "detected_salts": ["acetaminophen"],
        "detected_strength": 500.0,
        "confidence": 0.95,
        "want": "WRONG_MEDICINE",
    },
    {
        "kind": "strip",
        "name": "Unreadable strength on strip",
        "expected_brand": "Leflox",
        "expected_salts": ["levofloxacin"],
        "expected_strength": 500.0,
        "detected_brand": "Leflox",
        "detected_salts": ["levofloxacin"],
        "detected_strength": None,
        "confidence": 0.92,
        "want": "UNREADABLE_STRIP",
    },
    {
        "kind": "dose",
        "name": "Leflox 5000mg single dose ceiling",
        "raw": "Tab Leflox 5000mg OD",
        "guess": "Leflox",
        "strength": 5000.0,
        "m": 1.0,
        "a": 0.0,
        "n": 0.0,
        "want": "REFUSED_DOSAGE_ANOMALY",
    },
    {
        "kind": "dose",
        "name": "Panadol excessive daily quantity (12/day)",
        "raw": "Tab Panadol 500mg 4+4+4",
        "guess": "Panadol",
        "strength": 500.0,
        "m": 4.0,
        "a": 4.0,
        "n": 4.0,
        "want": "REFUSED_DOSAGE_ANOMALY",
    },
]


async def run_benchmark() -> dict:
    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, live=False)
    latencies_ms: list[float] = []

    std_pass = 0
    std_misses: list[str] = []
    for raw, guess, salts, strength, m, a, n, meal in STANDARD_PARCHI_CASES:
        t0 = perf_counter()
        dec = evaluate_line(
            ExtractedLine(
                raw_text=raw,
                brand_or_salt_guess=guess,
                strength_mg=strength,
                morning_qty=m,
                afternoon_qty=a,
                night_qty=n,
                meal_timing=meal,
                duration_days=5,
                ocr_confidence=0.95,
            ),
            resolver,
        )
        latencies_ms.append((perf_counter() - t0) * 1000.0)
        ok = (
            dec.status == "VERIFIED"
            and dec.resolved is not None
            and list(dec.resolved.generic_salts) == salts
        )
        if ok:
            std_pass += 1
        else:
            std_misses.append(raw)

    scribble_pass = 0
    scribble_misses: list[str] = []
    for raw, guess, conf in SCRIBBLE_REFUSAL_CASES:
        t0 = perf_counter()
        safe_conf = 0.0 if (isinstance(conf, float) and math.isnan(conf)) else conf
        line = ExtractedLine(
            raw_text=raw,
            brand_or_salt_guess=guess,
            strength_mg=500,
            ocr_confidence=conf,
        )
        dec = evaluate_line(line, resolver)
        latencies_ms.append((perf_counter() - t0) * 1000.0)
        if dec.status in {"REFUSED_BLURRY", "REFUSED_UNKNOWN_DRUG"} and safe_conf <= 0.94:
            scribble_pass += 1
        else:
            scribble_misses.append(raw)

    interaction_pass = 0
    interaction_misses: list[str] = []
    for name, parchi_salts, cab_salts in INTERACTION_CASES:
        t0 = perf_counter()
        hits = await fda.check_medications(
            current=[{"brand_name": "RxMed", "generic_salts": parchi_salts, "source_label": "current parchi"}],
            cabinet=[{"brand_name": "CabinetMed", "generic_salts": cab_salts, "source_label": "Active Cabinet"}],
        )
        latencies_ms.append((perf_counter() - t0) * 1000.0)
        if len(hits) == 1 and hits[0].fda_verbatim_excerpt:
            interaction_pass += 1
        else:
            interaction_misses.append(name)

    strip_pass = 0
    strip_misses: list[str] = []
    for case in STRIP_AND_ANOMALY_CASES:
        t0 = perf_counter()
        if case["kind"] == "strip":
            verdict = compare_strip(
                expected_brand=case["expected_brand"],
                expected_salts=case["expected_salts"],
                expected_strength=case["expected_strength"],
                detected_brand=case["detected_brand"],
                detected_salts=case["detected_salts"],
                detected_strength=case["detected_strength"],
                detected_confidence=case["confidence"],
                resolver=resolver,
            )
            ok = verdict.status == case["want"]
        else:
            dec = evaluate_line(
                ExtractedLine(
                    raw_text=case["raw"],
                    brand_or_salt_guess=case["guess"],
                    strength_mg=case["strength"],
                    morning_qty=case["m"],
                    afternoon_qty=case["a"],
                    night_qty=case["n"],
                    ocr_confidence=0.96,
                ),
                resolver,
            )
            ok = dec.status == case["want"]
        latencies_ms.append((perf_counter() - t0) * 1000.0)
        if ok:
            strip_pass += 1
        else:
            strip_misses.append(case["name"])

    total = len(STANDARD_PARCHI_CASES) + len(SCRIBBLE_REFUSAL_CASES) + len(INTERACTION_CASES) + len(STRIP_AND_ANOMALY_CASES)
    passed = std_pass + scribble_pass + interaction_pass + strip_pass
    report = {
        "mode": "deterministic_offline_harness",
        "note": "Measures deterministic clinical engine across 30 curated test vectors (non-VLM latency); real-world handwriting photos also require Gemini Vision calls.",
        "total_cases": total,
        "total_passed": passed,
        "p50_engine_ms": round(median(latencies_ms), 3),
        "subsets": [
            {"name": "Standard Pakistani Brands", "passed": std_pass, "total": len(STANDARD_PARCHI_CASES), "misses": std_misses},
            {"name": "Illegible & Low-Confidence Refusals", "passed": scribble_pass, "total": len(SCRIBBLE_REFUSAL_CASES), "misses": scribble_misses},
            {"name": "High-Risk Drug Interactions", "passed": interaction_pass, "total": len(INTERACTION_CASES), "misses": interaction_misses},
            {"name": "Strip Swaps & Overdose Ceilings", "passed": strip_pass, "total": len(STRIP_AND_ANOMALY_CASES), "misses": strip_misses},
        ],
    }
    return report


def main() -> int:
    report = asyncio.run(run_benchmark())
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Nuskha Saathi 30-Case Deterministic Evaluation ({report['total_passed']}/{report['total_cases']} passed, p50={report['p50_engine_ms']}ms)")
    for row in report["subsets"]:
        print(f"  - {row['name']}: {row['passed']}/{row['total']}")
    return 0 if report["total_passed"] == report["total_cases"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
