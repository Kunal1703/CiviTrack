"""Inference + health endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import Settings, get_settings
from app.schemas.classify import CategoryScore, ClassifyRequest, ClassifyResponse

router = APIRouter(tags=["inference"])


@router.get("/health")
def health(request: Request, settings: Settings = Depends(get_settings)) -> dict:
    loaded = getattr(request.app.state, "classifier", None) is not None
    return {
        "status": "ok" if loaded else "degraded",
        "service": settings.app_name,
        "version": settings.app_version,
        "model_loaded": loaded,
        "model_version": settings.model_version,
    }


@router.post("/classify", response_model=ClassifyResponse)
def classify(
    payload: ClassifyRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> ClassifyResponse:
    clf = getattr(request.app.state, "classifier", None)
    if clf is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="model not loaded"
        )
    result = clf.predict(payload.text, top_k=settings.top_k)
    return ClassifyResponse(
        category=result["category"],
        confidence=result["confidence"],
        model_version=settings.model_version,
        top_k=[CategoryScore(**t) for t in result["top_k"]],
    )
