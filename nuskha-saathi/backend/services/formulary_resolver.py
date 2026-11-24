"""Pakistani brand to generic salt resolver.

Exact alias hits return immediately. Fuzzy hits use RapidFuzz on a phonetic
form and refuse when two different drugs are too close to call.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from rapidfuzz import fuzz, process

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "pk_formulary.json"

_STOP = {
    "tab",
    "tablet",
    "cap",
    "capsule",
    "syp",
    "syrup",
    "inj",
    "injection",
    "mg",
    "ml",
    "od",
    "bd",
    "tds",
    "pc",
    "ac",
    "hs",
    "stat",
}


def _compact(value: str) -> str:
    text = value.casefold()
    text = text.replace("ph", "f").replace("ck", "k")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    return text.strip()


def strict_key(value: str) -> str:
    return _compact(value).replace(" ", "")


def loose_key(value: str) -> str:
    tokens = []
    for token in _compact(value).split():
        if token in _STOP or token.isdigit():
            continue
        tokens.append(token)
    return "".join(tokens)


def phonetic(value: str) -> str:
    """Loose key used for fuzzy matching after dosage words are removed."""
    return loose_key(value)


@dataclass(frozen=True)
class FormularyEntry:
    brand_name: str
    aliases: tuple[str, ...]
    generic_salts: tuple[str, ...]
    common_strengths_mg: tuple[float, ...]
    max_single_dose_mg: float
    max_daily_dose_mg: float
    is_antibiotic: bool
    who_aware_tier: str
    drap_shortage_flagged: bool
    bioequivalent_pk_brands: tuple[str, ...]
    urdu_category_note: str


@dataclass(frozen=True)
class ResolveHit:
    entry: FormularyEntry
    fuzzy_score: float

    @property
    def brand_name(self) -> str:
        return self.entry.brand_name

    @property
    def generic_salts(self) -> list[str]:
        return list(self.entry.generic_salts)


class FormularyResolver:
    def __init__(self, entries: list[FormularyEntry]):
        self.entries = entries
        self.by_exact: dict[str, FormularyEntry] = {}
        self._choices: list[str] = []
        self._choice_entry: list[FormularyEntry] = []
        for entry in entries:
            for alias in entry.aliases:
                for key in (strict_key(alias), loose_key(alias)):
                    if not key:
                        continue
                    existing = self.by_exact.get(key)
                    if existing is not None and existing.brand_name != entry.brand_name:
                        continue
                    if key not in self.by_exact:
                        self._choices.append(key)
                        self._choice_entry.append(entry)
                    self.by_exact[key] = entry
        self.salts = {salt.casefold() for entry in entries for salt in entry.generic_salts}

    @classmethod
    def load(cls, path: Path | None = None) -> "FormularyResolver":
        payload = json.loads((path or DATA_PATH).read_text(encoding="utf-8"))
        entries = [
            FormularyEntry(
                brand_name=row["brand_name"],
                aliases=tuple(row["aliases"]),
                generic_salts=tuple(row["generic_salts"]),
                common_strengths_mg=tuple(row["common_strengths_mg"]),
                max_single_dose_mg=float(row["max_single_dose_mg"]),
                max_daily_dose_mg=float(row["max_daily_dose_mg"]),
                is_antibiotic=bool(row["is_antibiotic"]),
                who_aware_tier=row["who_aware_tier"],
                drap_shortage_flagged=bool(row["drap_shortage_flagged"]),
                bioequivalent_pk_brands=tuple(row["bioequivalent_pk_brands"]),
                urdu_category_note=row["urdu_category_note"],
            )
            for row in payload
        ]
        return cls(entries)

    def resolve(self, name: str) -> ResolveHit | None:
        if not name or not str(name).strip():
            return None
        strict = strict_key(name)
        loose = loose_key(name)
        exact = self.by_exact.get(strict) or self.by_exact.get(loose)
        if exact is not None:
            return ResolveHit(entry=exact, fuzzy_score=100.0)
        key = loose or strict
        if len(key) < 5 or not self._choices:
            return None
        ranked = process.extract(
            key,
            self._choices,
            scorer=fuzz.WRatio,
            limit=8,
            score_cutoff=82,
        )
        if not ranked:
            return None
        best_by_brand: dict[str, tuple[float, FormularyEntry]] = {}
        for _choice, score, index in ranked:
            entry = self._choice_entry[index]
            current = best_by_brand.get(entry.brand_name)
            if current is None or score > current[0]:
                best_by_brand[entry.brand_name] = (float(score), entry)
        ordered = sorted(best_by_brand.values(), key=lambda item: item[0], reverse=True)
        best_score, best_entry = ordered[0]
        if len(ordered) > 1 and best_score - ordered[1][0] < 4:
            return None
        return ResolveHit(entry=best_entry, fuzzy_score=best_score)
