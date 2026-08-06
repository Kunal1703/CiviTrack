"""Public classification endpoint — proxies to the internal ml_service.

The gateway owns no model code: it validates input, forwards to ml_service, and
degrades to 503 if that service is unavailable (never crashes).
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.schemas.classify import ClassifyRequest, ClassifyResponse

router = APIRouter(prefix="/api/v1", tags=["classification"])
logger = get_logger("gateway.classify")


@router.post("/classify", response_model=ClassifyResponse)
async def classify(
    payload: ClassifyRequest, settings: Settings = Depends(get_settings)
) -> ClassifyResponse:
    url = f"{settings.ml_service_url}/classify"
    try:
        async with httpx.AsyncClient(timeout=settings.ml_service_timeout) as client:
            resp = await client.post(url, json={"text": payload.description})
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("ml_service call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="classification service unavailable",
        ) from exc

    data = resp.json()
    return ClassifyResponse(category=data["category"], confidence=data["confidence"])
