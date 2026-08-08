"""Public semantic endpoints — validate + proxy to ml_service."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.schemas.semantic import (
    DuplicateCheckRequest,
    DuplicateResponse,
    RelatedRequest,
    SearchResponse,
    SemanticSearchRequest,
)

router = APIRouter(prefix="/api/v1/semantic", tags=["semantic"])
logger = get_logger("gateway.semantic")


async def _proxy(settings: Settings, path: str, body: dict) -> dict:
    url = f"{settings.ml_service_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=settings.ml_service_timeout) as client:
            resp = await client.post(url, json=body)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("ml_service semantic call failed (%s): %s", path, exc)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "semantic service unavailable") from exc
    return resp.json()


@router.post("/search", response_model=SearchResponse)
async def search(payload: SemanticSearchRequest, settings: Settings = Depends(get_settings)) -> SearchResponse:
    return SearchResponse(**await _proxy(settings, "/semantic/search", payload.model_dump()))


@router.post("/related", response_model=SearchResponse)
async def related(payload: RelatedRequest, settings: Settings = Depends(get_settings)) -> SearchResponse:
    return SearchResponse(**await _proxy(settings, "/semantic/related", payload.model_dump()))


@router.post("/duplicate-check", response_model=DuplicateResponse)
async def duplicate_check(
    payload: DuplicateCheckRequest, settings: Settings = Depends(get_settings)
) -> DuplicateResponse:
    return DuplicateResponse(**await _proxy(settings, "/semantic/duplicate-check", payload.model_dump()))
