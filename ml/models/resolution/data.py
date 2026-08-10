"""Load closed complaints from Postgres (the only rows with a target)."""

from __future__ import annotations

import pandas as pd
import psycopg

from . import config

_COLS = [
    "unique_key", "created_date", "agency", "complaint_type", "descriptor",
    "borough", "incident_zip", "city", "latitude", "longitude", "geo_valid",
    "resolution_hours",
]


def load_closed() -> pd.DataFrame:
    """Closed complaints with a valid non-negative resolution_hours.

    NOTE: open complaints (closed_date IS NULL, ~1.9%) are right-censored and are
    deliberately excluded — the model describes *closed* complaints (see M4_DESIGN §2).
    """
    sql = (
        f"SELECT {', '.join(_COLS)} FROM silver.complaints_311 "
        "WHERE closed_date IS NOT NULL AND resolution_hours >= 0"
    )
    with psycopg.connect(**config.db_dsn()) as conn, conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        cols = [d.name for d in cur.description]
    df = pd.DataFrame(rows, columns=cols)
    df["created_date"] = pd.to_datetime(df["created_date"])
    df["resolution_hours"] = pd.to_numeric(df["resolution_hours"], errors="coerce")
    return df.dropna(subset=["resolution_hours"]).reset_index(drop=True)
