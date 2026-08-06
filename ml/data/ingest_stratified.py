"""Temporally-stratified NYC 311 ingestion (M1 training data).

The M0 ingester pulls a single continuous window (fast, but seasonally biased —
our first slice was 6 winter days). For training a classifier we want the label
distribution to reflect the whole year, so this fetches a fixed number of rows
from **each month** and concatenates them. Reuses the M0 field selection.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd
import requests

from .config import PipelineConfig
from .ingest import SELECT_FIELDS

logger = logging.getLogger("pipeline.ingest_stratified")


def _month_bounds(year: int, month: int) -> tuple[str, str]:
    start = f"{year}-{month:02d}-01T00:00:00"
    ny, nm = (year + 1, 1) if month == 12 else (year, month + 1)
    end = f"{ny}-{nm:02d}-01T00:00:00"
    return start, end


def fetch_stratified(
    cfg: PipelineConfig, year: int, rows_per_month: int
) -> tuple[pd.DataFrame, dict]:
    """Fetch ``rows_per_month`` rows from each month of ``year``."""
    headers = {"X-App-Token": cfg.app_token} if cfg.app_token else {}
    frames: list[pd.DataFrame] = []

    for month in range(1, 13):
        start, end = _month_bounds(year, month)
        rows: list[dict] = []
        offset = 0
        while len(rows) < rows_per_month:
            page_limit = min(cfg.page_size, rows_per_month - len(rows))
            params = {
                "$select": ",".join(SELECT_FIELDS),
                "$where": f"created_date >= '{start}' AND created_date < '{end}'",
                "$order": "created_date ASC",
                "$limit": page_limit,
                "$offset": offset,
            }
            resp = requests.get(
                cfg.resource_url, params=params, headers=headers, timeout=cfg.request_timeout
            )
            resp.raise_for_status()
            page = resp.json()
            if not page:
                break
            rows.extend(page)
            offset += page_limit
        frames.append(pd.DataFrame(rows))
        logger.info("month %04d-%02d: %s rows", year, month, len(rows))

    df = pd.concat(frames, ignore_index=True)

    cfg.bronze_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = cfg.bronze_dir / f"nyc311_stratified_{year}_{stamp}.parquet"
    df.to_parquet(path, index=False)

    meta = {
        "fetched_at": stamp,
        "strategy": "stratified_monthly",
        "year": year,
        "rows_per_month": rows_per_month,
        "row_count": len(df),
        "bronze_path": str(path),
    }
    logger.info("Stratified bronze written: %s (%s rows)", path, len(df))
    return df, meta
