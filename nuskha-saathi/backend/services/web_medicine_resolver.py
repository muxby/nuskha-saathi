"""Live web-grounded medicine identification for clear brands missing from pk_formulary.json."""

from __future__ import annotations

import asyncio
import json
import math
import os
import re
from typing import Any

import httpx
from rapidfuzz import fuzz

from schemas.vision import ExtractedLine
from services.config import env_flag
from services.formulary_resolver import FormularyEntry, loose_key, strict_key
from services.monitoring import error_category, event
from services.vision_extractor import DEFAULT_MODEL, _openrouter_message_text, _openrouter_models

_TOPICAL_KEYWORDS = (
    "gum paint",
    "mouthwash",
    "gargle",
    "topical",
    "ointment",
    "cream",
    "lotion",
    "paste",
    "dental gel",
    "gel",
    "ear drop",
    "eye drop",
    "nasal spray",
    "spray",
    "rinse",
)

_SYSTEMIC_PREFIX_RE = re.compile(
    r"^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|susp(?:ension)?)\b",
    re.IGNORECASE,
)

_QUERY_PREFIX_RE = re.compile(
    r"^(?:adv(?:ice)?\.?:?\s+|tab(?:let)?s?\.?\s+|cap(?:sule)?s?\.?\s+|syp\.?\s+|syrup\s+|inj(?:ection)?\.?\s+|susp\.?\s+|t\.\s+|c\.\s+|s\.\s+)+",
    re.IGNORECASE,
)

_SALT_PAREN_RE = re.compile(r"\([^)]*\)")
_SALT_DOSE_RE = re.compile(r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|gm|ml|%|iu)\b", re.IGNORECASE)

_WEB_RESOLVE_PROMPT = (
    "You are a clinical pharmacology verifier. Use web search to identify each real commercial "
    "medicine/brand/dental/topical preparation listed below.\n"
    "Rules:\n"
    "1. Return ONLY a valid JSON array with one object per input query (exact same order & `query` string).\n"
    "2. Set `is_known_medicine: true` ONLY if web search confirms it is a real marketed medicine or therapeutic product "
    "(e.g., Indian/Pakistani/international brands, fixed-dose combos, dental gels/gum paints, topical creams, drops). "
    "Set `is_known_medicine: false` for gibberish, fictional names, unclear fragments, or non-medicines.\n"
    "3. Return schema for each item:\n"
    '{"query": string, "is_known_medicine": boolean, "canonical_brand": string, '
    '"generic_salts": [string], "dosage_form": string, "is_topical": boolean, '
    '"is_fixed_single_strength_combo": boolean, "common_strengths_mg": [number], '
    '"max_single_dose_mg": number|null, "max_daily_dose_mg": number|null, '
    '"is_antibiotic": boolean, "who_aware_tier": "ACCESS"|"WATCH"|"RESERVE"|"NONE", '
    '"urdu_category_note": string}\n'
    "4. `generic_salts` must be lowercase INN active ingredient names WITHOUT numbers/units "
    '(use "acetaminophen" for paracetamol).\n'
    "5. `common_strengths_mg` must be pure numbers in mg. If it is a single-strength product or a fixed-dose combination "
    'sold in only one standard strength (e.g. Enzoflam, Pan-D), set `is_fixed_single_strength_combo: true` and put '
    "the single primary active mg strength as a 1-number array `[number]` matching adult tablet ceiling rules. "
    "For topical/dental gum paints/gels/creams/drops, set `is_topical: true`, `common_strengths_mg: []`, "
    "`max_single_dose_mg: 1`, `max_daily_dose_mg: 1`.\n"
    "6. `urdu_category_note` must be 1 short Roman Urdu safety sentence.\n"
    "Queries to verify:\n"
)


def medicine_web_live_enabled() -> bool:
    if os.getenv("PYTEST_CURRENT_TEST"):
        return False
    if "MEDICINE_WEB_LIVE" in os.environ:
        return env_flag("MEDICINE_WEB_LIVE", True)
    return True


def _clean_salt_name(raw: str) -> str:
    text = _SALT_PAREN_RE.sub(" ", str(raw or ""))
    text = _SALT_DOSE_RE.sub(" ", text)
    text = " ".join(text.replace(",", " ").split()).strip(" -+:;.").casefold()
    if not text:
        return ""
    if text == "paracetamol":
        return "acetaminophen"
    return text


def _extract_json_value(text: str) -> Any:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    for opener, closer in (("[", "]"), ("{", "}")):
        start = cleaned.find(opener)
        end = cleaned.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError("Web medicine lookup response did not contain valid JSON")


def _extract_numbers(raw: Any) -> list[float]:
    values: list[float] = []
    if isinstance(raw, list):
        items = raw
    elif raw is None:
        items = []
    else:
        items = re.findall(r"\d+(?:\.\d+)?", str(raw))
    for item in items:
        try:
            num = float(item)
        except (TypeError, ValueError):
            continue
        if math.isfinite(num) and num > 0:
            values.append(num)
    return values


def _line_query(line: ExtractedLine) -> str:
    guess = " ".join((line.brand_or_salt_guess or "").strip().split())
    raw = " ".join((line.raw_text or "").strip().split())
    clean_raw = _QUERY_PREFIX_RE.sub("", raw).strip()
    return guess or clean_raw or raw


def _is_topical_candidate(dosage_form: str, query_text: str, raw_text: str) -> bool:
    combined = f"{dosage_form} {query_text} {raw_text}".casefold()
    if any(kw in combined for kw in _TOPICAL_KEYWORDS):
        # A topical gel/gum paint is topical even if no tablet/cap prefix exists.
        if not _SYSTEMIC_PREFIX_RE.match(raw_text.strip()):
            return True
        return dosage_form.casefold() in _TOPICAL_KEYWORDS
    return False


def _entry_from_web_item(item: dict[str, Any], line: ExtractedLine | None = None) -> FormularyEntry | None:
    if not isinstance(item, dict) or item.get("is_known_medicine") is not True:
        return None
    brand = " ".join(str(item.get("canonical_brand") or "").strip().split())
    if not brand:
        return None

    raw_salts = item.get("generic_salts") or []
    if isinstance(raw_salts, str):
        raw_salts = [part.strip() for part in raw_salts.split(",")]
    salts: list[str] = []
    for salt in raw_salts:
        cleaned = _clean_salt_name(str(salt))
        if cleaned and cleaned not in salts:
            salts.append(cleaned)
    if not salts:
        return None

    dosage_form = " ".join(str(item.get("dosage_form") or "").strip().split())
    query_text = str(item.get("query") or "")
    raw_text = line.raw_text if line is not None else query_text
    is_topical = bool(item.get("is_topical")) or _is_topical_candidate(dosage_form, query_text, raw_text)

    strengths = _extract_numbers(item.get("common_strengths_mg"))
    if (bool(item.get("is_fixed_single_strength_combo")) or len(salts) > 1) and len(strengths) > 1:
        strengths = [strengths[0]]
    if not is_topical and not strengths and line is not None and line.strength_mg is not None and line.strength_mg > 0:
        strengths = [float(line.strength_mg)]

    if is_topical:
        max_single = 1.0
        max_daily = 1.0
        strengths = []
    else:
        single_nums = _extract_numbers(item.get("max_single_dose_mg"))
        daily_nums = _extract_numbers(item.get("max_daily_dose_mg"))
        fallback_base = max(strengths) if strengths else 500.0
        max_single = single_nums[0] if single_nums else max(fallback_base * 2.0, fallback_base)
        max_daily = daily_nums[0] if daily_nums else max(max_single * 3.0, max_single)
        if max_daily < max_single:
            max_daily = max_single
        if strengths and max(strengths) > max_single:
            max_single = max(strengths)
            if max_daily < max_single:
                max_daily = max_single

    aware = str(item.get("who_aware_tier") or "NONE").strip().upper()
    if aware not in {"ACCESS", "WATCH", "RESERVE", "NONE"}:
        aware = "NONE"
    is_antibiotic = bool(item.get("is_antibiotic")) or aware in {"ACCESS", "WATCH", "RESERVE"}
    urdu_note = " ".join(str(item.get("urdu_category_note") or "").strip().split())
    if not urdu_note:
        urdu_note = f"Yeh {brand} hai. Doctor ya pharmacist ki batayi hui hidayat ke mutabiq istemal karein."

    return FormularyEntry(
        brand_name=brand,
        aliases=(brand,),
        generic_salts=tuple(salts),
        common_strengths_mg=tuple(strengths),
        max_single_dose_mg=float(max_single),
        max_daily_dose_mg=float(max_daily),
        is_antibiotic=is_antibiotic,
        who_aware_tier=aware,
        drap_shortage_flagged=False,
        bioequivalent_pk_brands=(),
        urdu_category_note=urdu_note,
        is_topical=is_topical,
    )


def _entry_to_dict(entry: FormularyEntry) -> dict[str, Any]:
    return {
        "brand_name": entry.brand_name,
        "aliases": list(entry.aliases),
        "generic_salts": list(entry.generic_salts),
        "common_strengths_mg": list(entry.common_strengths_mg),
        "max_single_dose_mg": entry.max_single_dose_mg,
        "max_daily_dose_mg": entry.max_daily_dose_mg,
        "is_antibiotic": entry.is_antibiotic,
        "who_aware_tier": entry.who_aware_tier,
        "drap_shortage_flagged": entry.drap_shortage_flagged,
        "bioequivalent_pk_brands": list(entry.bioequivalent_pk_brands),
        "urdu_category_note": entry.urdu_category_note,
        "is_topical": entry.is_topical,
    }


def _entry_from_dict(data: dict[str, Any]) -> FormularyEntry | None:
    try:
        return FormularyEntry(
            brand_name=str(data["brand_name"]),
            aliases=tuple(data.get("aliases") or [data["brand_name"]]),
            generic_salts=tuple(data["generic_salts"]),
            common_strengths_mg=tuple(float(x) for x in (data.get("common_strengths_mg") or [])),
            max_single_dose_mg=float(data["max_single_dose_mg"]),
            max_daily_dose_mg=float(data["max_daily_dose_mg"]),
            is_antibiotic=bool(data.get("is_antibiotic", False)),
            who_aware_tier=str(data.get("who_aware_tier") or "NONE"),
            drap_shortage_flagged=bool(data.get("drap_shortage_flagged", False)),
            bioequivalent_pk_brands=tuple(data.get("bioequivalent_pk_brands") or []),
            urdu_category_note=str(data.get("urdu_category_note") or ""),
            is_topical=bool(data.get("is_topical", False)),
        )
    except Exception:
        return None


class WebMedicineResolver:
    """Resolve legible unknown prescriptions via web/AI pharmacology search + SQLite cache."""

    def __init__(self, *, live: bool | None = None, fetcher=None, timeout: float = 20.0, store=None):
        self._explicit_live = live
        self.fetcher = fetcher
        self.timeout = timeout
        self.store = store
        self._cache: dict[str, FormularyEntry | None] = {}

    @property
    def live(self) -> bool:
        if self._explicit_live is not None:
            return self._explicit_live
        return medicine_web_live_enabled()

    def get_cached(self, query: str) -> FormularyEntry | None:
        keys = [k for k in (strict_key(query), loose_key(query)) if k]
        for key in keys:
            if key in self._cache:
                return self._cache[key]
            if self.store is not None:
                raw = self.store.get_web_medicine(key)
                if raw is not None:
                    loaded = _entry_from_dict(raw)
                    if loaded is not None:
                        self._cache[key] = loaded
                        return loaded
        # Lightweight fuzzy hit against previously cached web-resolved entries (>=86 WRatio)
        probe = keys[-1] if keys else ""
        if len(probe) >= 5:
            pool: list[tuple[str, FormularyEntry]] = [
                (k, v) for k, v in self._cache.items() if v is not None and len(k) >= 4
            ]
            if self.store is not None:
                for db_key, raw in self.store.list_web_medicines():
                    if db_key not in self._cache:
                        loaded = _entry_from_dict(raw)
                        if loaded is not None:
                            self._cache[db_key] = loaded
                            pool.append((db_key, loaded))
            best_score = 0.0
            best_entry: FormularyEntry | None = None
            for k, entry in pool:
                score = float(fuzz.WRatio(probe, k))
                if score >= 86.0 and score > best_score:
                    best_score = score
                    best_entry = entry
            if best_entry is not None:
                return best_entry
        return None

    def _cache_store(self, key_str: str, entry: FormularyEntry | None) -> None:
        payload = _entry_to_dict(entry) if entry is not None else None
        for key in (strict_key(key_str), loose_key(key_str)):
            if key:
                self._cache[key] = entry
                if payload is not None and self.store is not None:
                    self.store.save_web_medicine(key, entry.brand_name, payload)
        if entry is not None:
            for key in (strict_key(entry.brand_name), loose_key(entry.brand_name)):
                if key:
                    self._cache[key] = entry
                    if payload is not None and self.store is not None:
                        self.store.save_web_medicine(key, entry.brand_name, payload)

    async def _fetch_gemini_web(self, prompt: str) -> list[dict[str, Any]]:
        key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        model = os.environ.get("GEMINI_MODEL", "").strip() or DEFAULT_MODEL
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "tools": [{"google_search": {}}],
            "generationConfig": {"temperature": 0.0, "thinkingConfig": {"thinkingBudget": 0}},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            payload = resp.json()
        candidates = payload.get("candidates") or []
        parts = ((candidates[0].get("content") or {}).get("parts")) or [] if candidates else []
        text = "\n".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict) and not part.get("thought")
        ).strip()
        if not text:
            raise RuntimeError("Gemini web search returned empty text")
        parsed = _extract_json_value(text)
        if isinstance(parsed, dict) and isinstance(parsed.get("medicines"), list):
            parsed = parsed["medicines"]
        if not isinstance(parsed, list):
            raise RuntimeError("Gemini web search response was not a JSON array")
        return [item for item in parsed if isinstance(item, dict)]

    async def _fetch_openrouter_web(self, prompt: str) -> list[dict[str, Any]]:
        key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if not key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        last_error: Exception | None = None
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for model in _openrouter_models():
                try:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {key}",
                            "Content-Type": "application/json",
                            "X-Title": "Nuskha Saathi",
                        },
                        json={
                            "model": model,
                            "temperature": 0.0,
                            "max_tokens": 1600,
                            "reasoning": {"enabled": False},
                            "messages": [{"role": "user", "content": prompt}],
                        },
                    )
                    resp.raise_for_status()
                    text = _openrouter_message_text(resp.json())
                    if not text:
                        raise RuntimeError(f"OpenRouter web search {model} returned empty content")
                    parsed = _extract_json_value(text)
                    if isinstance(parsed, dict) and isinstance(parsed.get("medicines"), list):
                        parsed = parsed["medicines"]
                    if not isinstance(parsed, list):
                        raise RuntimeError("OpenRouter web search response was not a JSON array")
                    return [item for item in parsed if isinstance(item, dict)]
                except Exception as exc:  # noqa: BLE001 — rotate fallback models
                    last_error = exc
                    continue
        raise RuntimeError(str(last_error or "OpenRouter web search failed")) from last_error

    async def _query_providers(self, queries: list[str]) -> list[dict[str, Any]]:
        if self.fetcher is not None:
            result = await self.fetcher(queries)
            if isinstance(result, list):
                return [item for item in result if isinstance(item, dict)]
            return []
        if not self.live or not queries:
            return []

        prompt = _WEB_RESOLVE_PROMPT + "\n".join(f"- {q}" for q in queries)
        primary = os.getenv("VISION_PRIMARY", "auto").strip().lower()
        providers = (
            ("openrouter", "gemini")
            if primary == "openrouter"
            else ("gemini", "openrouter")
        )
        for provider in providers:
            try:
                if provider == "gemini" and os.environ.get("GEMINI_API_KEY", "").strip():
                    return await self._fetch_gemini_web(prompt)
                if provider == "openrouter" and os.environ.get("OPENROUTER_API_KEY", "").strip():
                    return await self._fetch_openrouter_web(prompt)
            except Exception as exc:  # noqa: BLE001 — fall through to secondary web provider
                event("medicine_web_lookup", "failed", provider=provider, error=error_category(exc))
                continue
        return []

    async def resolve_lines(self, lines: list[ExtractedLine]) -> dict[int, FormularyEntry]:
        """Resolve legible unknown lines via web search and return mapping line_index -> FormularyEntry."""
        resolved: dict[int, FormularyEntry] = {}
        pending: list[tuple[int, str, ExtractedLine]] = []
        pending_queries: list[str] = []
        seen_query_keys: set[str] = set()

        for idx, line in enumerate(lines):
            raw = " ".join((line.raw_text or "").strip().split())
            guess = " ".join((line.brand_or_salt_guess or "").strip().split())
            if line.ocr_confidence < 0.85 or "?" in raw or "?" in guess:
                continue
            query = _line_query(line)
            if not query:
                continue
            cached = self.get_cached(query) or (self.get_cached(raw) if raw else None)
            if cached is not None:
                resolved[idx] = cached
                continue
            key = loose_key(query) or strict_key(query) or query.casefold()
            if key in self._cache:
                continue
            pending.append((idx, query, line))
            if key not in seen_query_keys:
                seen_query_keys.add(key)
                pending_queries.append(raw if raw else query)

        if not pending_queries:
            return resolved

        items = await self._query_providers(pending_queries)
        by_query_key: dict[str, dict[str, Any]] = {}
        for pos, item in enumerate(items):
            q_val = str(item.get("query") or "").strip()
            for candidate in (q_val, _QUERY_PREFIX_RE.sub("", q_val).strip()):
                c_key = loose_key(candidate) or strict_key(candidate) or candidate.casefold()
                if c_key:
                    by_query_key[c_key] = item
            if not q_val and pos < len(pending_queries):
                fallback_q = pending_queries[pos]
                f_key = loose_key(fallback_q) or strict_key(fallback_q) or fallback_q.casefold()
                by_query_key.setdefault(f_key, item)

        for idx, query, line in pending:
            raw_clean = _QUERY_PREFIX_RE.sub("", " ".join((line.raw_text or "").split())).strip()
            matched_item = None
            for cand in (line.raw_text, raw_clean, query, line.brand_or_salt_guess):
                c_key = loose_key(cand or "") or strict_key(cand or "") or (cand or "").casefold()
                if c_key and c_key in by_query_key:
                    matched_item = by_query_key[c_key]
                    break
            entry = _entry_from_web_item(matched_item, line) if matched_item else None
            self._cache_store(query, entry)
            if entry is not None:
                resolved[idx] = entry
        return resolved

    async def search_single(self, query: str) -> FormularyEntry | None:
        clean = " ".join((query or "").strip().split())
        if not clean or len(clean) < 2:
            return None
        cached = self.get_cached(clean)
        if cached is not None:
            return cached
        key = loose_key(clean) or strict_key(clean) or clean.casefold()
        if key in self._cache:
            return self._cache[key]
        items = await self._query_providers([clean])
        entry = _entry_from_web_item(items[0]) if items else None
        self._cache_store(clean, entry)
        return entry
