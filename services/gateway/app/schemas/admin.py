"""Admin analytics contracts (gateway ↔ admin frontend)."""

from __future__ import annotations

from pydantic import BaseModel


class Bucket(BaseModel):
    key: str
    count: int


class VolumePoint(BaseModel):
    date: str
    count: int


class AdminStats(BaseModel):
    # Headline "what needs attention" numbers.
    total: int
    open: int  # new + triaged + in_progress
    new: int
    triaged: int
    in_progress: int
    resolved: int
    rejected: int
    high_priority_open: int
    new_today: int
    resolved_today: int
    avg_resolution_hours: float | None
    # Heuristic count of complaints that look like potential duplicates
    # (same category, within ~250m, within 7 days) — PostGIS self-join.
    potential_duplicates: int
    # Distributions for charts.
    by_category: list[Bucket]
    by_status: list[Bucket]
    by_priority: list[Bucket]
    by_department: list[Bucket]
    volume_30d: list[VolumePoint]


class Assignee(BaseModel):
    id: int
    full_name: str
    email: str
