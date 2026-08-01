"""Bronze layer — ingest NYC 311 data from the Socrata Open Data API.

Fetches a *bounded* development slice (paginated) and writes an immutable raw
snapshot to ``data/bronze/`` as parquet. No transformation happens here — the
bronze layer is a faithful copy of what the API returned.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd
import requests

from .config import PipelineConfig

logger = logging.getLogger("pipeline.ingest")

# Columns we request from Socrata (keeps payloads small and stable).
SELECT_FIELDS = [
    "unique_key",
    "created_date",
    "closed_date",
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
]


def _fetch_page(cfg: PipelineConfig, offset: int, limit: int) -> list[dict]:
    params = {
        "$select": ",".join(SELECT_FIELDS),
        "$where": f"created_date >= '{cfg.since_date}'",
        "$order": cfg.order,
        "$limit": limit,
        "$offset": offset,
    }
    headers = {"X-App-Token": cfg.app_token} if cfg.app_token else {}
    resp = requests.get(
        cfg.resource_url, params=params, headers=headers, timeout=cfg.request_timeout
    )
    resp.raise_for_status()
    return resp.json()


def fetch_bronze(cfg: PipelineConfig) -> tuple[pd.DataFrame, dict]:
    """Fetch up to ``cfg.fetch_limit`` rows and persist the bronze snapshot.

    Returns the raw DataFrame and a metadata dict describing the pull.
    """
    logger.info(
        "Fetching NYC 311 (dataset=%s, limit=%s, since=%s)",
        cfg.dataset_id,
        cfg.fetch_limit,
        cfg.since_date,
    )
    rows: list[dict] = []
    offset = 0
    while len(rows) < cfg.fetch_limit:
        page_limit = min(cfg.page_size, cfg.fetch_limit - len(rows))
        page = _fetch_page(cfg, offset, page_limit)
        if not page:
            logger.info("API returned no more rows at offset %s; stopping early.", offset)
            break
        rows.extend(page)
        offset += page_limit
        logger.info("  fetched %s / %s rows", len(rows), cfg.fetch_limit)

    df = pd.DataFrame(rows)

    cfg.bronze_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    bronze_path = cfg.bronze_dir / f"nyc311_raw_{stamp}.parquet"
    df.to_parquet(bronze_path, index=False)

    meta = {
        "fetched_at": stamp,
        "dataset_id": cfg.dataset_id,
        "row_count": len(df),
        "requested_limit": cfg.fetch_limit,
        "since_date": cfg.since_date,
        "bronze_path": str(bronze_path),
        "columns": list(df.columns),
    }
    logger.info("Bronze snapshot written: %s (%s rows)", bronze_path, len(df))
    return df, meta
