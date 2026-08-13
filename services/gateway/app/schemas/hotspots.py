"""Geospatial hotspot contracts (gateway ↔ admin frontend).

Read-only projection of `geo.hotspots` — Getis-Ord Gi* results computed offline
(`ml.geo.run`) on the real NYC 311 corpus. Cells are axis-aligned ~1 km grid
squares, so each carries its centroid plus a lat/lon bounding box the frontend
draws directly with a Leaflet rectangle.
"""

from __future__ import annotations

from pydantic import BaseModel


class HotspotCell(BaseModel):
    cell_key: str            # grid 'i:j'
    category: str | None     # None = all complaints (overall)
    window_label: str        # 'all' | '2024-06' …
    count: int
    gi_z: float | None       # Gi* z-score
    p_value: float | None    # BH-FDR corrected
    significance: str        # hot_99|hot_95|hot_90|cold_*|ns
    lat: float               # centroid
    lon: float
    # Cell bounding box (regular grid → an axis-aligned rectangle).
    south: float
    west: float
    north: float
    east: float


class SignificanceBucket(BaseModel):
    band: str
    count: int


class HotspotMeta(BaseModel):
    # False when the pipeline has never been run (geo.hotspots empty) — lets the
    # admin view show an honest "not computed yet" state instead of erroring.
    available: bool
    method: str
    spatial_unit: str
    cell_size_deg: float
    permutations: int
    fdr_alpha: float
    # Data-driven filter options (NYC complaint types, not the Delhi app taxonomy).
    categories: list[str]
    windows: list[str]
    total_cells: int
    significant: list[SignificanceBucket]  # band → count, for the overall/all view
    computed_at: str | None
