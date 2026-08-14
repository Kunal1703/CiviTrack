"""Resolution-time endpoints (M4) — admin-only proxy to ml_service.

The regressor is trained on NYC 311 operational data; the product's live data is
Delhi demo data. So this is surfaced as an admin 'resolution insights' tool
(global drivers + try-it), clearly labeled NYC-trained — never as a per-Delhi-
complaint forecast. Access is admin-only, enforced server-side.
"""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.deps import require_admin
from app.core.logging import get_logger
from app.schemas.resolution import ResolutionMeta, ResolutionRequest, ResolutionResponse

router = APIRouter(prefix="/api/v1/resolution-time", tags=["resolution"])
logger = get_logger("gateway.resolution")


async def _proxy(settings: Settings, method: str, path: str, body: dict | None = None) -> dict:
    url = f"{settings.ml_service_url}/resolution-time{path}"
    try:
        async with httpx.AsyncClient(timeout=settings.ml_service_timeout) as client:
            resp = await client.request(method, url, json=body)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("resolution proxy failed (%s): %s", path, exc)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "resolution service unavailable") from exc
    return resp.json()


@router.post("", response_model=ResolutionResponse)
async def predict(
    payload: ResolutionRequest,
    _admin: dict[str, Any] = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> ResolutionResponse:
    return ResolutionResponse(**await _proxy(settings, "POST", "", payload.model_dump()))


@router.get("/meta", response_model=ResolutionMeta)
async def meta(
    _admin: dict[str, Any] = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> ResolutionMeta:
    return ResolutionMeta(**await _proxy(settings, "GET", "/meta"))
