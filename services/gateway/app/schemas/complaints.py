"""Complaint contracts (gateway ↔ frontend)."""

from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field

Status = Literal["new", "triaged", "in_progress", "resolved", "rejected"]
Priority = Literal["low", "medium", "high"]


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    # Optional AI classification captured on the client (real M1 result). The
    # server persists it as-is; it is advisory metadata, not trusted for authz.
    category: str | None = Field(default=None, max_length=100)
    category_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    address_text: str | None = Field(default=None, max_length=300)
    priority: Priority | None = None


class ComplaintAdminPatch(BaseModel):
    status: Status | None = None
    priority: Priority | None = None
    category: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    assignee_id: int | None = None
    # Optional internal note recorded alongside the change.
    note: str | None = Field(default=None, max_length=2000)


class NoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=2000)
    visibility: Literal["public", "internal"] = "internal"


class ComplaintOut(BaseModel):
    id: int
    public_ref: str
    reporter_id: int | None
    title: str
    description: str
    category: str | None
    category_confidence: float | None
    category_overridden: bool
    status: str
    priority: str
    department_id: int | None
    assignee_id: int | None
    latitude: float | None
    longitude: float | None
    address_text: str | None
    source: str
    is_demo: bool
    created_at: dt.datetime
    updated_at: dt.datetime
    closed_at: dt.datetime | None
    # Optional joined fields (populated for admin reads).
    reporter_name: str | None = None
    department_name: str | None = None


class ComplaintListOut(BaseModel):
    items: list[ComplaintOut]
    total: int
    limit: int
    offset: int


class UpdateOut(BaseModel):
    id: int
    complaint_id: int
    author_id: int | None
    type: str
    old_status: str | None
    new_status: str | None
    note: str | None
    visibility: str
    created_at: dt.datetime


class DepartmentOut(BaseModel):
    id: int
    name: str
    slug: str


class MapPoint(BaseModel):
    """Non-PII community map point (no reporter identity)."""
    id: int
    public_ref: str
    category: str | None
    status: str
    priority: str
    title: str
    latitude: float
    longitude: float
    created_at: dt.datetime
