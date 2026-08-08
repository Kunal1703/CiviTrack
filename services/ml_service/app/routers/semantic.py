"""Semantic endpoints: search, related, duplicate-check (M3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app import semantic_store as store
from app.core.config import Settings, get_settings
from app.schemas.semantic import (
    DuplicateCheckRequest,
    DuplicateMatch,
    DuplicateResponse,
    Neighbor,
    RelatedRequest,
    SearchRequest,
    SearchResponse,
)

router = APIRouter(prefix="/semantic", tags=["semantic"])

DISPLAY_FLOOR = 0.5  # don't surface very weak matches


def _ready(request: Request):
    emb = getattr(request.app.state, "embedder", None)
    pool = getattr(request.app.state, "db_pool", None)
    if emb is None or pool is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "semantic layer not ready")
    return emb, pool


def _neighbor(r: dict) -> dict:
    return {
        "complaint_id": r["complaint_id"],
        "category": r.get("category"),
        "similarity": round(float(r["similarity"]), 4),
        "text": r["text"],
        "borough": r.get("borough"),
        "created_at": str(r["created_date"]) if r.get("created_date") else None,
    }


@router.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest, request: Request, settings: Settings = Depends(get_settings)) -> SearchResponse:
    emb, pool = _ready(request)
    qv = emb.encode_one(payload.query)
    with pool.connection() as conn:
        rows = store.search(conn, settings, qv, payload.top_k, payload.category, payload.min_similarity)
    return SearchResponse(query=payload.query, model=settings.embedding_model,
                          results=[Neighbor(**_neighbor(r)) for r in rows])


@router.post("/related", response_model=SearchResponse)
def related(payload: RelatedRequest, request: Request, settings: Settings = Depends(get_settings)) -> SearchResponse:
    _, pool = _ready(request)
    with pool.connection() as conn:
        rows = store.related(conn, settings, payload.complaint_id, payload.top_k)
    return SearchResponse(query=payload.complaint_id, model=settings.embedding_model,
                          results=[Neighbor(**_neighbor(r)) for r in rows])


@router.post("/duplicate-check", response_model=DuplicateResponse)
def duplicate_check(
    payload: DuplicateCheckRequest, request: Request, settings: Settings = Depends(get_settings)
) -> DuplicateResponse:
    emb, pool = _ready(request)
    qv = emb.encode_one(payload.description)
    with pool.connection() as conn:
        rows = store.duplicate_candidates(conn, settings, qv, payload.latitude, payload.longitude,
                                          settings.dup_radius_m, top_k=5)
    matches: list[DuplicateMatch] = []
    is_dup = False
    for r in rows:
        sim = float(r["similarity"])
        if sim < DISPLAY_FLOOR:
            continue
        dist = r.get("distance_m")
        gated = dist is not None and dist <= settings.dup_radius_m
        if sim >= settings.dup_threshold:
            is_dup = True
            relation = "near-duplicate" if gated else "related"
        else:
            relation = "similar"
        matches.append(DuplicateMatch(**_neighbor(r), relation=relation,
                                      distance_m=(round(float(dist), 1) if dist is not None else None)))
    return DuplicateResponse(is_potential_duplicate=is_dup, threshold=settings.dup_threshold, matches=matches)
