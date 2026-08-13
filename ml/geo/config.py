"""M5 configuration — grid, study area, Gi* parameters."""

from __future__ import annotations

import os
from pathlib import Path

PKG = Path(__file__).resolve().parent
REPORT_DIR = PKG / "reports"

SEED = 42
SPATIAL_UNIT = "grid_1km"
CELL_SIZE_DEG = 0.009           # ~1 km (lat); slightly narrower in lon at NYC latitude
# NYC-proper bounding box (trims stray/mis-geocoded points).
BBOX = {"minx": -74.30, "miny": 40.45, "maxx": -73.65, "maxy": 40.95}

PERMUTATIONS = 999              # conditional randomization for Gi* p-values
FDR_ALPHA = 0.05               # Benjamini–Hochberg level for significance
TOP_CATEGORIES = 6             # per-category hotspots for the busiest complaint types
MONTHS = [f"2024-{m:02d}" for m in range(1, 13)]  # per-month windows (stability)

# DBSCAN incident clustering (optional)
DBSCAN_EPS_M = 200.0           # meters
DBSCAN_MIN_SAMPLES = 20


def db_dsn() -> dict:
    return dict(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5433")),
        dbname=os.getenv("POSTGRES_DB", "civitrack"),
        user=os.getenv("POSTGRES_USER", "civitrack"),
        password=os.getenv("POSTGRES_PASSWORD", "civitrack_dev_pw"),
    )
