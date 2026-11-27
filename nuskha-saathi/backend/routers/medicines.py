"""Medicine search and monograph endpoints combining pk_formulary and FreeAPI MedSter."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter()


def _search_local_formulary(resolver, query: str, limit: int = 10) -> list[dict]:
    needle = query.casefold().strip()
    if not needle:
        return []
    matches: list[tuple[int, dict]] = []
    for entry in resolver.entries:
        brand_fold = entry.brand_name.casefold()
        salts_fold = [s.casefold() for s in entry.generic_salts]
        aliases_fold = [a.casefold() for a in entry.aliases]
        score = 0
        if brand_fold == needle:
            score = 100
        elif brand_fold.startswith(needle):
            score = 90
        elif needle in brand_fold or any(needle in s for s in salts_fold):
            score = 80
        elif any(needle in a for a in aliases_fold):
            score = 70
        if score > 0:
            matches.append(
                (
                    score,
                    {
                        "brand_name": entry.brand_name,
                        "generic_salts": list(entry.generic_salts),
                        "common_strengths_mg": list(entry.common_strengths_mg),
                        "max_single_dose_mg": entry.max_single_dose_mg,
                        "max_daily_dose_mg": entry.max_daily_dose_mg,
                        "is_antibiotic": entry.is_antibiotic,
                        "who_aware_tier": entry.who_aware_tier,
                        "bioequivalent_pk_brands": list(entry.bioequivalent_pk_brands),
                        "source": "Pakistani Formulary",
                    },
                )
            )
    if not matches:
        fuzzy = resolver.resolve(query)
        if fuzzy is not None:
            entry = fuzzy.entry
            matches.append(
                (
                    int(fuzzy.fuzzy_score),
                    {
                        "brand_name": entry.brand_name,
                        "generic_salts": list(entry.generic_salts),
                        "common_strengths_mg": list(entry.common_strengths_mg),
                        "max_single_dose_mg": entry.max_single_dose_mg,
                        "max_daily_dose_mg": entry.max_daily_dose_mg,
                        "is_antibiotic": entry.is_antibiotic,
                        "who_aware_tier": entry.who_aware_tier,
                        "bioequivalent_pk_brands": list(entry.bioequivalent_pk_brands),
                        "source": "Pakistani Formulary",
                    },
                )
            )
    matches.sort(key=lambda item: (-item[0], item[1]["brand_name"]))
    return [row for _, row in matches[:limit]]


@router.get("/api/v1/medicines/search")
async def search_medicines(request: Request, q: str = Query(..., min_length=1, max_length=120)):
    clean = " ".join(q.strip().split())
    if not clean:
        raise HTTPException(status_code=400, detail="Search query q is required.")

    local_matches = _search_local_formulary(request.app.state.resolver, clean)
    if not local_matches:
        web_resolver = getattr(request.app.state, "web_resolver", None)
        if web_resolver is not None and getattr(web_resolver, "live", False):
            entry = await web_resolver.search_single(clean)
            if entry is not None:
                local_matches.append(
                    {
                        "brand_name": entry.brand_name,
                        "generic_salts": list(entry.generic_salts),
                        "common_strengths_mg": list(entry.common_strengths_mg),
                        "max_single_dose_mg": entry.max_single_dose_mg,
                        "max_daily_dose_mg": entry.max_daily_dose_mg,
                        "is_antibiotic": entry.is_antibiotic,
                        "who_aware_tier": entry.who_aware_tier,
                        "bioequivalent_pk_brands": list(entry.bioequivalent_pk_brands),
                        "source": "Web Search Formulary",
                    }
                )
    medster = getattr(request.app.state, "medster", None)
    medster_matches = await medster.search(clean) if medster is not None else []
    return {
        "query": clean,
        "local_matches": local_matches,
        "medster_matches": medster_matches,
    }


@router.get("/api/v1/medicines/details")
async def medicine_details(
    request: Request,
    id: str = Query("", max_length=160),
    brand: str = Query("", max_length=120),
):
    med_id = id.strip()
    brand_query = brand.strip()
    if not med_id and not brand_query:
        raise HTTPException(status_code=400, detail="Provide either 'id' or 'brand'.")

    medster = getattr(request.app.state, "medster", None)
    medster_profile = None
    if medster is not None:
        if not med_id and brand_query:
            summary = await medster.lookup_brand_summary(brand_query)
            if summary:
                med_id = summary["id"]
        if med_id:
            medster_profile = await medster.details(med_id)

    lookup_name = brand_query or (medster_profile or {}).get("name") or med_id
    resolved = request.app.state.resolver.resolve(lookup_name)
    if resolved is None and brand_query:
        resolved = request.app.state.resolver.resolve(brand_query)
    entry = resolved.entry if resolved is not None else None
    if entry is None:
        web_resolver = getattr(request.app.state, "web_resolver", None)
        if web_resolver is not None:
            entry = web_resolver.get_cached(lookup_name) or (web_resolver.get_cached(brand_query) if brand_query else None)
            if entry is None and getattr(web_resolver, "live", False) and brand_query:
                entry = await web_resolver.search_single(brand_query)
    local_profile = None
    if entry is not None:
        local_profile = {
            "brand_name": entry.brand_name,
            "generic_salts": list(entry.generic_salts),
            "common_strengths_mg": list(entry.common_strengths_mg),
            "max_single_dose_mg": entry.max_single_dose_mg,
            "max_daily_dose_mg": entry.max_daily_dose_mg,
            "is_antibiotic": entry.is_antibiotic,
            "who_aware_tier": entry.who_aware_tier,
            "drap_shortage_flagged": entry.drap_shortage_flagged,
            "bioequivalent_pk_brands": list(entry.bioequivalent_pk_brands),
            "urdu_category_note": entry.urdu_category_note,
        }

    if medster_profile is None and local_profile is None:
        raise HTTPException(status_code=404, detail="Medicine details not found.")

    return {
        "medster": medster_profile,
        "formulary": local_profile,
    }
