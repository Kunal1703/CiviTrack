"""Public semantic contracts (gateway ↔ frontend)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["nyc", "delhi"]


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(5, ge=1, le=50)
    category: str | None = Field(None, max_length=120)
    min_similarity: float = Field(0.0, ge=0.0, le=1.0)
    dataset: Dataset = "nyc"


class RelatedRequest(BaseModel):
    complaint_id: str = Field(min_length=1, max_length=64)
    top_k: int = Field(5, ge=1, le=50)
    dataset: Dataset = "nyc"


class DuplicateCheckRequest(BaseModel):
    description: str = Field(min_length=1, max_length=2000)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    dataset: Dataset = "nyc"


class Neighbor(BaseModel):
    complaint_id: str
    category: str | None = None
    similarity: float
    text: str
    borough: str | None = None
    location: str | None = None
    status: str | None = None
    created_at: str | None = None


class SearchResponse(BaseModel):
    query: str
    model: str
    results: list[Neighbor]


class DuplicateMatch(Neighbor):
    relation: str
    distance_m: float | None = None


class DuplicateResponse(BaseModel):
    is_potential_duplicate: bool
    threshold: float
    matches: list[DuplicateMatch]
