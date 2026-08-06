"""Public classify contract (gateway ↔ frontend)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    # Unrestricted natural-language complaint text from the citizen.
    description: str = Field(min_length=1, max_length=5000)


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
