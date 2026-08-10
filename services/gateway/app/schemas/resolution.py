"""Public resolution-time contracts (gateway ↔ admin frontend)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ResolutionRequest(BaseModel):
    agency: str | None = Field(None, max_length=32)
    complaint_type: str | None = Field(None, max_length=120)
    descriptor: str | None = Field(None, max_length=200)
    borough: str | None = Field(None, max_length=40)
    incident_zip: str | None = Field(None, max_length=12)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    created_at: str | None = None


class Factor(BaseModel):
    feature: str
    value: Any | None = None
    effect: str


class ResolutionResponse(BaseModel):
    point_hours: float
    low_hours: float
    high_hours: float
    model_version: str
    factors: list[Factor]


class Driver(BaseModel):
    feature: str
    weight: float


class ResolutionMeta(BaseModel):
    model_version: str
    options: dict
    drivers: list[Driver] = []
