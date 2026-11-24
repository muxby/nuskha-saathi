"""Write pk_formulary.json and pk_interactions_fallback.json.

Interaction excerpts are copied from openFDA label text. The script refuses to
invent a sentence when the label does not mention the other drug.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from catalog import GROUPS, NEEDLES, PAIRS, urdu_warning  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CACHE_PATH = DATA / "_fda_label_cache.json"
USER_AGENT = "nuskha-saathi-dataset/1.0"


def urdu_category_note(brand: str, salts: list[str], antibiotic: bool, aware: str) -> str:
    if any(salt.startswith("insulin") for salt in salts):
        return (
            "Insulin ki dose is app se tay nahi hoti. "
            "Meharbani kar ke doctor ya pharmacist se tasdeeq karein."
        )
    if aware == "WATCH":
        return (
            "Yeh ek taqatwar Watch-group antibiotic hai. "
            "Doctor ke bataye huay poore din mukammal karein, beech mein na chorein."
        )
    if aware == "RESERVE":
        return (
            "Yeh Reserve-group antibiotic hai. Poora course doctor ke bataye mutabiq "
            "mukammal karein aur beech mein na chorein."
        )
    if aware == "ACCESS":
        return "Yeh Access-group antibiotic hai. Doctor ke bataye huay poore din dawai mukammal karein."
    if antibiotic:
        return "Yeh antibiotic hai. Course beech mein na chorein."
    return f"Yeh {brand} hai. Doctor ki batayi hui miqdar se zyada na lein."


def build_formulary() -> list[dict]:
    rows: list[dict] = []
    seen_brands: set[str] = set()
    seen_aliases: set[str] = set()
    allowed_tiers = {"ACCESS", "WATCH", "RESERVE", "NONE"}
    mono_owner: dict[str, str] = {}
    for group in GROUPS:
        if len(group["salts"]) == 1:
            mono_owner.setdefault(group["salts"][0].casefold(), group["brands"][0])
    for group in GROUPS:
        salts = group["salts"]
        brands = group["brands"]
        strengths = group["strengths"]
        if strengths and max(strengths) > group["max_single"]:
            raise SystemExit(f"{brands[0]} strength exceeds max_single")
        if group["max_daily"] < group["max_single"]:
            raise SystemExit(f"{brands[0]} max_daily below max_single")
        if group["aware"] not in allowed_tiers:
            raise SystemExit(f"bad tier {group['aware']}")
        if not group["antibiotic"] and group["aware"] != "NONE":
            raise SystemExit(f"non-antibiotic has tier {brands[0]}")
        if group["antibiotic"] and group["aware"] not in allowed_tiers:
            raise SystemExit(brands[0])
        for brand in brands:
            key = brand.casefold()
            if key in seen_brands:
                raise SystemExit(f"duplicate brand {brand}")
            seen_brands.add(key)
            extras = list(group["aliases"].get(brand, []))
            alias_values = [brand, *extras]
            # A bare salt maps to the single-ingredient brand, not a combination.
            for salt in salts:
                if mono_owner.get(salt.casefold()) == brand:
                    alias_values.append(salt)
            cleaned: list[str] = []
            local_seen: set[str] = set()
            for alias in alias_values:
                token = alias.strip()
                if not token:
                    continue
                fold = token.casefold()
                if fold in local_seen:
                    continue
                if fold in seen_aliases:
                    raise SystemExit(f"alias collision {token} on {brand}")
                local_seen.add(fold)
                seen_aliases.add(fold)
                cleaned.append(token)
            others = [other for other in brands if other != brand]
            rows.append(
                {
                    "brand_name": brand,
                    "aliases": cleaned,
                    "generic_salts": salts,
                    "common_strengths_mg": strengths,
                    "max_single_dose_mg": group["max_single"],
                    "max_daily_dose_mg": group["max_daily"],
                    "is_antibiotic": group["antibiotic"],
                    "who_aware_tier": group["aware"],
                    "drap_shortage_flagged": False,
                    "bioequivalent_pk_brands": others,
                    "urdu_category_note": urdu_category_note(brand, salts, group["antibiotic"], group["aware"]),
                }
            )
    rows.sort(key=lambda row: row["brand_name"].casefold())
    if len(rows) < 200:
        raise SystemExit(f"formulary has {len(rows)} brands, need 200")
    return rows


def _get(url: str) -> dict | None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 — retry, then record the miss
            print(f"fetch failed attempt {attempt + 1} {url[:110]} :: {exc}", flush=True)
            time.sleep(1.5 * (attempt + 1))
    return None


def _search_url(search: str) -> str:
    return "https://api.fda.gov/drug/label.json?" + urllib.parse.urlencode({"search": search, "limit": 3})


_LABEL_CACHE: dict[str, str] = {}


def _persist_cache() -> None:
    CACHE_PATH.write_text(json.dumps(_LABEL_CACHE, ensure_ascii=False), encoding="utf-8")


def label_text(salt: str) -> str:
    cached = _LABEL_CACHE.get(salt)
    if cached:
        return cached
    queries = [
        f'openfda.generic_name:"{salt}"',
        f'openfda.substance_name:"{salt}"',
        f'openfda.generic_name:{salt}*',
    ]
    chunks: list[str] = []
    for query in queries:
        payload = _get(_search_url(query))
        if not payload:
            continue
        for result in payload.get("results") or []:
            for field in ("drug_interactions", "boxed_warning", "contraindications", "warnings"):
                values = result.get(field) or []
                if isinstance(values, str):
                    values = [values]
                chunks.extend(str(value) for value in values)
        if chunks:
            break
    text = "\n".join(chunks)
    _LABEL_CACHE[salt] = text
    _persist_cache()
    print(f"label {salt} chars={len(text)}", flush=True)
    return text


def _needles(salt: str) -> list[str]:
    values = NEEDLES.get(salt, [salt])
    if salt not in values:
        values = [salt, *values]
    return values


def _snippet(text: str, needle: str) -> str | None:
    if not text:
        return None
    lowered = text.lower()
    index = lowered.find(needle.lower())
    if index < 0:
        return None
    # Prefer a sentence-sized verbatim span around the hit.
    start = text.rfind(".", 0, index)
    start = 0 if start < 0 else start + 1
    end = text.find(".", index)
    end = len(text) if end < 0 else end + 1
    snippet = " ".join(text[start:end].split())
    if 40 <= len(snippet) <= 700:
        return snippet
    window_start = max(0, index - 220)
    window_end = min(len(text), index + len(needle) + 280)
    window = " ".join(text[window_start:window_end].split())
    return window or None


def excerpt_for(salt_a: str, salt_b: str) -> str | None:
    best: tuple[int, str] | None = None
    for source_salt, other in ((salt_a, salt_b), (salt_b, salt_a)):
        text = label_text(source_salt)
        for needle in _needles(other):
            snippet = _snippet(text, needle)
            if not snippet:
                continue
            lowered = snippet.lower()
            score = 0
            if "contraindicat" in lowered:
                score += 5
            if "synergistic" in lowered:
                score += 4
            if "should not" in lowered or "avoid" in lowered or "do not" in lowered:
                score += 3
            if needle.lower() == other.lower():
                score += 2
            if best is None or score > best[0]:
                best = (score, snippet)
    return None if best is None else best[1]


def build_interactions(formulary_salts: set[str]) -> list[dict]:
    rows: list[dict] = []
    seen: set[frozenset[str]] = set()
    missing: list[tuple[str, str]] = []
    for left, right in PAIRS:
        key = frozenset({left, right})
        if left == right or key in seen:
            continue
        seen.add(key)
        if left not in formulary_salts or right not in formulary_salts:
            raise SystemExit(f"pair salt missing from formulary: {left} + {right}")
        excerpt = excerpt_for(left, right)
        if not excerpt:
            missing.append((left, right))
            print(f"NO EXCERPT {left} + {right}", flush=True)
            continue
        salt_a, salt_b = sorted((left, right))
        rows.append(
            {
                "salt_a": salt_a,
                "salt_b": salt_b,
                "severity": "HIGH",
                "source": "openFDA Drug Label (Cached Verified Excerpt)",
                "fda_verbatim_excerpt": excerpt,
                "urdu_warning": urdu_warning(salt_a, salt_b),
            }
        )
        print(f"OK {salt_a} + {salt_b} ({len(excerpt)} chars)", flush=True)
    if missing:
        print(f"missing excerpts: {len(missing)}", flush=True)
    if len(rows) < 60:
        raise SystemExit(f"only {len(rows)} interaction excerpts, need 60")
    rows.sort(key=lambda row: (row["salt_a"], row["salt_b"]))
    return rows[:80]


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    formulary = build_formulary()
    salts: set[str] = set()
    for row in formulary:
        salts.update(row["generic_salts"])
    (DATA / "pk_formulary.json").write_text(
        json.dumps(formulary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(formulary)} brands", flush=True)
    if CACHE_PATH.exists():
        _LABEL_CACHE.update(json.loads(CACHE_PATH.read_text(encoding="utf-8")))
    needed = sorted({salt for pair in PAIRS for salt in pair})
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(label_text, salt) for salt in needed]
        for future in as_completed(futures):
            future.result()
    interactions = build_interactions(salts)
    (DATA / "pk_interactions_fallback.json").write_text(
        json.dumps(interactions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(interactions)} interactions")


if __name__ == "__main__":
    main()
