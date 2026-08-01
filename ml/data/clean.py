"""Silver layer — clean & standardize the bronze snapshot.

Transformations (all deterministic, all documented):
  * parse timestamps; drop rows without a valid ``created_date``
  * de-duplicate on ``unique_key``
  * coerce numeric lat/lon; flag coordinates outside the NYC bounding box
  * derive ``resolution_hours`` for closed complaints
  * normalize categorical text (borough, status, complaint_type)
A cleaning-stats dict is returned for the data-quality report.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger("pipeline.clean")

# Rough NYC bounding box — used only to *flag* implausible coordinates.
NYC_LAT_MIN, NYC_LAT_MAX = 40.40, 41.10
NYC_LON_MIN, NYC_LON_MAX = -74.30, -73.60

CANONICAL_COLUMNS = [
    "unique_key",
    "created_date",
    "closed_date",
    "resolution_hours",
    "agency",
    "agency_name",
    "complaint_type",
    "descriptor",
    "status",
    "borough",
    "incident_zip",
    "incident_address",
    "city",
    "latitude",
    "longitude",
    "geo_valid",
]


def clean_bronze(df_raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    stats: dict[str, object] = {"input_rows": int(len(df_raw))}
    df = df_raw.copy()

    # ── timestamps ──
    for col in ("created_date", "closed_date"):
        df[col] = pd.to_datetime(df.get(col), errors="coerce", utc=False)

    missing_created = int(df["created_date"].isna().sum())
    df = df[df["created_date"].notna()].copy()
    stats["dropped_missing_created_date"] = missing_created

    # ── de-duplicate ──
    before = len(df)
    df = df.drop_duplicates(subset=["unique_key"], keep="first")
    stats["dropped_duplicates"] = int(before - len(df))

    # ── numeric coordinates + validity flag ──
    for col in ("latitude", "longitude"):
        df[col] = pd.to_numeric(df.get(col), errors="coerce")
    df["geo_valid"] = (
        df["latitude"].between(NYC_LAT_MIN, NYC_LAT_MAX)
        & df["longitude"].between(NYC_LON_MIN, NYC_LON_MAX)
    )
    stats["rows_missing_geo"] = int(df["latitude"].isna().sum())
    stats["rows_geo_out_of_bounds"] = int((~df["geo_valid"] & df["latitude"].notna()).sum())

    # ── resolution time (closed only, non-negative) ──
    delta = (df["closed_date"] - df["created_date"]).dt.total_seconds() / 3600.0
    df["resolution_hours"] = np.where((delta >= 0) & df["closed_date"].notna(), delta, np.nan)
    stats["rows_with_resolution"] = int(df["resolution_hours"].notna().sum())

    # ── normalize categorical text ──
    for col in ("borough", "status", "complaint_type", "descriptor", "agency", "city"):
        if col in df.columns:
            df[col] = df[col].astype("string").str.strip()
    df["borough"] = df["borough"].str.upper().replace({"": pd.NA, "UNSPECIFIED": pd.NA})
    df["incident_zip"] = df.get("incident_zip").astype("string").str.strip()

    # ── canonical projection ──
    for col in CANONICAL_COLUMNS:
        if col not in df.columns:
            df[col] = pd.NA
    df = df[CANONICAL_COLUMNS].reset_index(drop=True)

    stats["output_rows"] = int(len(df))
    logger.info(
        "Cleaned: %s -> %s rows (dropped %s missing-date, %s duplicates)",
        stats["input_rows"],
        stats["output_rows"],
        stats["dropped_missing_created_date"],
        stats["dropped_duplicates"],
    )
    return df, stats
