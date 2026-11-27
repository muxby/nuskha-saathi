"""FreeAPI MedSter client for Pakistani medicine search, pricing, and monograph details."""

from __future__ import annotations

import os
import re
from typing import Any

import httpx

from services.config import env_flag
from services.monitoring import error_category, event

_FROALA_RE = re.compile(r"Powered by Froala Editor", re.IGNORECASE)


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(_FROALA_RE.sub("", str(value)).split())


def medster_live_enabled() -> bool:
    if "MEDSTER_LIVE" in os.environ:
        return env_flag("MEDSTER_LIVE", True)
    return not bool(os.getenv("PYTEST_CURRENT_TEST"))


class MedSterClient:
    """Async client for https://freeapi.pro/medster (/api/search and /api/details)."""

    def __init__(
        self,
        base_url: str | None = None,
        *,
        live: bool | None = None,
        fetcher=None,
        timeout: float = 6.0,
    ):
        self._explicit_base_url = base_url
        self._explicit_live = live
        self.fetcher = fetcher
        self.timeout = timeout
        self._search_cache: dict[str, list[dict[str, Any]]] = {}
        self._details_cache: dict[str, dict[str, Any] | None] = {}

    @property
    def base_url(self) -> str:
        raw = self._explicit_base_url or os.getenv("FREEAPI_BASE_URL") or "https://freeapi.pro"
        return raw.rstrip("/")

    @property
    def live(self) -> bool:
        if self._explicit_live is not None:
            return self._explicit_live
        return medster_live_enabled()

    async def _get_json(self, path: str, params: dict[str, str]) -> dict | None:
        if self.fetcher is not None:
            return await self.fetcher(f"{self.base_url}{path}", params)
        if not self.live:
            return None
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.base_url}{path}",
                    params=params,
                    headers={"User-Agent": "nuskha-saathi"},
                )
                resp.raise_for_status()
                data = resp.json()
                return data if isinstance(data, dict) else None
        except Exception as exc:
            event("medster_lookup", "failed", error=error_category(exc))
            return None

    async def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        clean = " ".join((query or "").strip().split())
        if not clean:
            return []
        cache_key = clean.casefold()
        if cache_key in self._search_cache:
            return self._search_cache[cache_key][:limit]

        payload = await self._get_json("/api/search", {"q": clean})
        raw_results = (payload or {}).get("results") or []
        results: list[dict[str, Any]] = []
        for row in raw_results:
            if not isinstance(row, dict) or not row.get("id"):
                continue
            results.append(
                {
                    "id": str(row["id"]),
                    "name": _clean_text(str(row.get("name") or "")),
                    "price": _clean_text(str(row.get("price") or "")) or None,
                    "source": "MedSter",
                }
            )
        self._search_cache[cache_key] = results
        return results[:limit]

    async def details(self, med_id: str) -> dict[str, Any] | None:
        clean_id = (med_id or "").strip()
        if not clean_id:
            return None
        if clean_id in self._details_cache:
            return self._details_cache[clean_id]

        payload = await self._get_json("/api/details", {"id": clean_id})
        med = (payload or {}).get("medicine")
        if not isinstance(med, dict):
            self._details_cache[clean_id] = None
            return None

        sections: list[dict[str, str]] = []
        section_map: dict[str, str] = {}
        for item in med.get("details") or []:
            if not isinstance(item, dict):
                continue
            sec = str(item.get("section") or "").strip()
            title = _clean_text(str(item.get("title") or sec))
            content = _clean_text(str(item.get("content") or ""))
            if not sec or not content:
                continue
            sections.append({"section": sec, "title": title, "content": content})
            section_map[sec] = content

        normalized = {
            "id": str(med.get("id") or clean_id),
            "name": _clean_text(str(med.get("name") or "")),
            "price": _clean_text(str(med.get("price") or "")) or None,
            "discount": _clean_text(str(med.get("discount") or "")) or None,
            "ingredients": section_map.get("ingredients") or None,
            "dosage_form": section_map.get("dosage_form") or None,
            "drug_class": section_map.get("drug_class") or None,
            "drug_interactions": section_map.get("drug_interactions") or None,
            "dose": section_map.get("dose") or None,
            "over_dose": section_map.get("over_dose") or None,
            "side_effects": section_map.get("side_effects") or None,
            "precautions": section_map.get("precautions") or None,
            "sections": sections,
            "source": "MedSter",
        }
        self._details_cache[clean_id] = normalized
        return normalized

    async def lookup_brand_summary(self, brand_name: str) -> dict[str, Any] | None:
        matches = await self.search(brand_name, limit=5)
        if not matches:
            return None
        target = brand_name.casefold().strip()
        for row in matches:
            if row["name"].casefold().startswith(target):
                return row
        return matches[0]
