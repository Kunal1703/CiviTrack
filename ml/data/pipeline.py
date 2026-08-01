"""Pipeline entrypoint: ingest → clean → validate → load → report.

Run from the ``ml/`` directory:

    python -m data.pipeline

Configuration is environment-driven (see ``config.PipelineConfig``).
"""

from __future__ import annotations

import logging
import sys

from .clean import clean_bronze
from .config import PipelineConfig
from .ingest import fetch_bronze
from .load import load_to_postgres, write_silver_parquet
from .report import build_report
from .validate import validate_silver


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        stream=sys.stdout,
    )


def run() -> int:
    _configure_logging()
    log = logging.getLogger("pipeline")
    cfg = PipelineConfig()

    log.info("=== CiviTrack AI — NYC 311 data pipeline ===")
    df_raw, ingest_meta = fetch_bronze(cfg)
    if df_raw.empty:
        log.error("No data fetched — aborting.")
        return 1

    df_silver, clean_stats = clean_bronze(df_raw)
    validation = validate_silver(df_silver)
    write_silver_parquet(df_silver, cfg)
    load_result = load_to_postgres(df_silver, cfg)
    md_path, json_path = build_report(
        df_silver, ingest_meta, clean_stats, validation, load_result, cfg
    )

    log.info("=== Pipeline complete ===")
    log.info("Silver rows: %s | Loaded: %s | Report: %s", clean_stats["output_rows"],
             load_result["rows_loaded"], md_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
