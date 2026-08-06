"""Request/response models for the classify endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    # Accepts arbitrary, unrestricted natural-language complaint text.
    text: str = Field(min_length=1, max_length=5000, description="Free-text complaint")


class CategoryScore(BaseModel):
    category: str
    score: float


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    model_version: str
    top_k: list[CategoryScore]
