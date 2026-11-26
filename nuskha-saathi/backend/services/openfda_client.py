"""Live openFDA label lookup with a local verified fallback.

Queries accept generic salts only. A Pakistani brand name is rejected before
any HTTP call.
"""

from __future__ import annotations

from services.monitoring import event, error_category

import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode

import httpx

from services.formulary_resolver import FormularyResolver

FALLBACK_PATH = Path(__file__).resolve().parents[1] / "data" / "pk_interactions_fallback.json"
LABEL_URL = "https://api.fda.gov/drug/label.json"


@dataclass(frozen=True)
class InteractionHit:
    salt_a: str
    salt_b: str
    severity: str
    source: str
    fda_verbatim_excerpt: str
    urdu_warning: str
    raw_fda_json: dict | None = None


def build_label_url(salt: str, api_key: str | None = None, search: str | None = None) -> str:
    query = search or f'openfda.generic_name:"{salt}"'
    params = {"search": query, "limit": "1"}
    if api_key:
        params["api_key"] = api_key
    return f"{LABEL_URL}?{urlencode(params)}"


def _pair_key(salt_a: str, salt_b: str) -> tuple[str, str]:
    left, right = sorted((salt_a.casefold().strip(), salt_b.casefold().strip()))
    return left, right


def _label_blob(result: dict) -> str:
    chunks: list[str] = []
    for field in ("drug_interactions", "boxed_warning", "contraindications"):
        values = result.get(field) or []
        if isinstance(values, str):
            values = [values]
        chunks.extend(str(value) for value in values)
    return "\n".join(chunks)


_SALT_SYNONYMS: dict[str, tuple[str, ...]] = {
    "acetylsalicylic acid": ("acetylsalicylic acid", "aspirin", "salicylate"),
    "aspirin": ("aspirin", "acetylsalicylic acid", "salicylate"),
    "amoxicillin + clavulanic acid": ("amoxicillin + clavulanic acid", "clavulanic acid", "clavulanate", "amoxicillin"),
    "clavulanate": ("clavulanate", "clavulanic acid"),
    "isosorbide mononitrate": ("isosorbide mononitrate", "isosorbide", "nitrates", "nitrate"),
    "isosorbide dinitrate": ("isosorbide dinitrate", "isosorbide", "nitrates", "nitrate"),
}

_NON_RETRYABLE_STATUSES = frozenset({400, 401, 403, 404})


def _terms_for_salt(salt: str) -> tuple[str, ...]:
    key = salt.casefold().strip()
    return _SALT_SYNONYMS.get(key, (key,))


def _excerpt_mentioning(text: str, needle: str) -> str | None:
    if not text or not needle:
        return None
    lowered = text.lower()
    for term in _terms_for_salt(needle):
        index = lowered.find(term.lower())
        if index < 0:
            continue
        start = text.rfind(".", 0, index)
        start = 0 if start < 0 else start + 1
        end = text.find(".", index)
        end = len(text) if end < 0 else end + 1
        snippet = " ".join(text[start:end].split())
        if 40 <= len(snippet) <= 700:
            return snippet
        window = " ".join(text[max(0, index - 220) : index + len(term) + 280].split())
        if window:
            return window
    return None


class OpenFdaClient:
    def __init__(
        self,
        fallback: list[dict],
        allowed_salts: set[str],
        api_key: str | None = None,
        fetcher=None,
        live: bool = True,
    ):
        self.allowed_salts = {salt.casefold() for salt in allowed_salts}
        self.api_key = api_key if api_key is not None else os.environ.get("OPENFDA_API_KEY") or None
        self.fetcher = fetcher
        self.live = live
        self.fallback: dict[tuple[str, str], InteractionHit] = {}
        for row in fallback:
            key = _pair_key(row["salt_a"], row["salt_b"])
            self.fallback[key] = InteractionHit(
                salt_a=row["salt_a"],
                salt_b=row["salt_b"],
                severity=row["severity"],
                source=row["source"],
                fda_verbatim_excerpt=row["fda_verbatim_excerpt"],
                urdu_warning=row["urdu_warning"],
            )
        self._label_cache: dict[str, dict | None] = {}

    @classmethod
    def from_resolver(
        cls,
        resolver: FormularyResolver,
        path: Path | None = None,
        fetcher=None,
        live: bool = True,
    ) -> "OpenFdaClient":
        payload = json.loads((path or FALLBACK_PATH).read_text(encoding="utf-8"))
        return cls(fallback=payload, allowed_salts=resolver.salts, fetcher=fetcher, live=live)

    def assert_salt(self, salt: str) -> str:
        key = salt.casefold().strip()
        if key not in self.allowed_salts:
            raise ValueError(f"openFDA queries accept generic salts only, not {salt!r}")
        return key

    async def fetch_label(self, salt: str) -> dict | None:
        key = self.assert_salt(salt)
        if key in self._label_cache:
            return self._label_cache[key]
        if not self.live:
            self._label_cache[key] = None
            return None
        result = None
        for search in (f'openfda.generic_name:"{key}"', f"openfda.generic_name:{key}*"):
            payload = await self._get_json(build_label_url(key, self.api_key, search))
            results = (payload or {}).get("results") or []
            if results and isinstance(results[0], dict):
                result = results[0]
                break
        self._label_cache[key] = result
        return result

    async def _get_json(self, url: str) -> dict | None:
        delay = 0.4
        for attempt in range(3):
            try:
                if self.fetcher is not None:
                    data = await self.fetcher(url)
                    return data if isinstance(data, dict) else None
                async with httpx.AsyncClient(timeout=8.0) as client:
                    response = await client.get(url, headers={"User-Agent": "nuskha-saathi"})
                    if response.status_code in _NON_RETRYABLE_STATUSES:
                        event("openfda_lookup", "no_labels" if response.status_code == 404 else "failed", error=f"HTTP_{response.status_code}")
                        return None
                    response.raise_for_status()
                    data = response.json()
                    return data if isinstance(data, dict) else None
            except httpx.HTTPStatusError as exc:
                if exc.response is not None and exc.response.status_code in _NON_RETRYABLE_STATUSES:
                    event("openfda_lookup", "no_labels" if exc.response.status_code == 404 else "failed", error=error_category(exc))
                    return None
                if attempt == 2:
                    event("openfda_lookup", "failed", error=error_category(exc))
                    return None
                await asyncio.sleep(delay)
                delay *= 2
            except Exception as exc:
                if attempt == 2:
                    event("openfda_lookup", "failed", error=error_category(exc))
                    return None
                await asyncio.sleep(delay)
                delay *= 2
        return None

    async def lookup_pair(self, salt_a: str, salt_b: str) -> InteractionHit | None:
        key_a = self.assert_salt(salt_a)
        key_b = self.assert_salt(salt_b)
        if key_a == key_b:
            return None
        cached = self.fallback.get(_pair_key(key_a, key_b))
        live_evidence = await self._live_excerpt(key_a, key_b) if self.live else None
        if live_evidence and cached is not None:
            return InteractionHit(
                salt_a=cached.salt_a,
                salt_b=cached.salt_b,
                severity=cached.severity,
                source="openFDA Drug Label API",
                fda_verbatim_excerpt=live_evidence[0],
                urdu_warning=cached.urdu_warning,
                raw_fda_json=live_evidence[1],
            )
        if live_evidence and cached is None:
            return InteractionHit(
                salt_a=key_a,
                salt_b=key_b,
                severity="HIGH",
                source="openFDA Drug Label API",
                fda_verbatim_excerpt=live_evidence[0],
                urdu_warning=(
                    f"Khabardar! {key_a} aur {key_b} ka sang milakar istemal nuqsan deh ho sakta hai. "
                    "Lene se pehle apne doctor se foran rabta karein."
                ),
                raw_fda_json=live_evidence[1],
            )
        return cached

    async def _live_excerpt(self, salt_a: str, salt_b: str) -> tuple[str, dict] | None:
        for source, needle in ((salt_a, salt_b), (salt_b, salt_a)):
            label = await self.fetch_label(source)
            if not label:
                continue
            excerpt = _excerpt_mentioning(_label_blob(label), needle)
            if excerpt:
                return excerpt, label
        return None

    async def _prefetch_salts(self, salts: set[str]) -> None:
        if not self.live or not salts:
            return
        sem = asyncio.Semaphore(5)

        async def _load(salt: str) -> None:
            async with sem:
                try:
                    await self.fetch_label(salt)
                except ValueError:
                    return

        await asyncio.gather(*(_load(salt) for salt in sorted(salts)), return_exceptions=True)

    async def check_medications(self, current: list[dict], cabinet: list[dict]) -> list[InteractionHit]:
        """Pair drugs on this parchi with each other and with the active cabinet.

        Cabinet-only pairs are not re-reported. Each drug pair keeps one hit,
        the fallback row when several salt combinations match.
        """
        pool: list[tuple[str, dict]] = [("parchi", med) for med in current]
        pool.extend(("cabinet", med) for med in cabinet)
        unique_salts: set[str] = set()
        for _, med in pool:
            for salt in med.get("generic_salts") or []:
                if salt:
                    key = salt.casefold().strip()
                    if key in self.allowed_salts:
                        unique_salts.add(key)
        await self._prefetch_salts(unique_salts)

        found: dict[tuple[int, int], InteractionHit] = {}
        for i in range(len(pool)):
            for j in range(i + 1, len(pool)):
                origin_i, med_i = pool[i]
                origin_j, med_j = pool[j]
                if origin_i == "cabinet" and origin_j == "cabinet":
                    continue
                salts_i = [salt for salt in med_i.get("generic_salts") or [] if salt]
                salts_j = [salt for salt in med_j.get("generic_salts") or [] if salt]
                for salt_i in salts_i:
                    for salt_j in salts_j:
                        if salt_i.casefold() == salt_j.casefold():
                            continue
                        try:
                            hit = await self.lookup_pair(salt_i, salt_j)
                        except ValueError:
                            continue
                        if hit is None:
                            continue
                        found[(i, j)] = hit
                        break
                    else:
                        continue
                    break
        return list(found.values())
