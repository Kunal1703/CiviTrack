"""Request/response models for the semantic endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Which corpus a semantic query runs against:
#   'nyc'   → silver.complaints_311 (the M3 analytical corpus)   [default, unchanged]
#   'delhi' → app.complaints tagged data_version='delhi_demo'    [citizen product data]
Dataset = Literal["nyc", "delhi"]


class SearchRequest(BaseModel):
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


class EmbedRequest(BaseModel):
    """Internal utility: turn texts into embedding vectors (used by seeding /
    embed-on-create). Not exposed publicly through the gateway."""

    texts: list[str] = Field(min_length=1, max_length=512)


class EmbedResponse(BaseModel):
    model: str
    dim: int
    vectors: list[list[float]]


class Neighbor(BaseModel):
    complaint_id: str
    category: str | None = None
    similarity: float
    text: str
    borough: str | None = None      # NYC: borough. Delhi: unused (see `location`).
    location: str | None = None     # Delhi: human location label / public_ref.
    status: str | None = None       # Delhi: current complaint status.
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
