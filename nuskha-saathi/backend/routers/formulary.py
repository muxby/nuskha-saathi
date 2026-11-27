"""Formulary lookup routes."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from services.formulary_search import MAX_LIMIT, search_formulary

router = APIRouter()


@router.get("/api/v1/formulary/search")
async def formulary_search(
    request: Request,
    q: str = Query("", max_length=60, description="Brand or salt name as printed on the strip."),
    limit: int = Query(8, ge=1, le=MAX_LIMIT),
):
    results = search_formulary(request.app.state.resolver.entries, q, limit)
    return {"query": " ".join(q.split()), "results": results}
