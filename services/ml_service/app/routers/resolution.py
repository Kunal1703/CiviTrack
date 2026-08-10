"""Resolution-time endpoints (M4). Predict + explain, and expose UI options."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.schemas.resolution import ResolutionMeta, ResolutionRequest, ResolutionResponse

router = APIRouter(prefix="/resolution-time", tags=["resolution"])


def _ready(request: Request):
    pred = getattr(request.app.state, "resolution", None)
    if pred is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "resolution model not ready")
    return pred


@router.post("", response_model=ResolutionResponse)
def predict(payload: ResolutionRequest, request: Request) -> ResolutionResponse:
    pred = _ready(request)
    return ResolutionResponse(**pred.predict(payload.model_dump()))


@router.get("/meta", response_model=ResolutionMeta)
def meta(request: Request) -> ResolutionMeta:
    return ResolutionMeta(**_ready(request).meta_info())
