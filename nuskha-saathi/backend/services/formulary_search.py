"""Read-only brand lookup over the curated formulary.

Used by the cabinet form so a patient types the name printed on the strip and
picks a listed brand instead of free text. This is a lookup, not a resolver:
it never guesses a salt for a name that is not in the formulary.
"""

from __future__ import annotations

from services.formulary_resolver import FormularyEntry

MAX_LIMIT = 20
MIN_QUERY_LENGTH = 2


def to_result(entry: FormularyEntry) -> dict:
    return {
        "brand_name": entry.brand_name,
        "generic_salts": list(entry.generic_salts),
        "common_strengths_mg": list(entry.common_strengths_mg),
        "is_antibiotic": entry.is_antibiotic,
        "who_aware_tier": entry.who_aware_tier,
    }


