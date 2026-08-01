"""Render a human-readable data-quality report (Markdown + JSON)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .config import PipelineConfig

logger = logging.getLogger("pipeline.report")


def build_report(
    df_silver: pd.DataFrame,
    ingest_meta: dict,
    clean_stats: dict,
    validation: dict,
    load_result: dict,
    cfg: PipelineConfig,
) -> tuple[str, str]:
    cfg.reports_dir.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(timezone.utc).isoformat()

    # ── missing-value table ──
    missing = (
        df_silver.isna().sum().sort_values(ascending=False).rename("missing").to_frame()
    )
    missing["pct"] = (missing["missing"] / len(df_silver) * 100).round(2)
    missing_md = missing.to_markdown()

    # ── top categories / boroughs ──
    top_types = df_silver["complaint_type"].value_counts().head(10).to_markdown()
    borough_dist = df_silver["borough"].value_counts(dropna=False).to_markdown()

    res = df_silver["resolution_hours"].dropna()
    res_summary = (
        res.describe().round(2).to_markdown() if not res.empty else "_no closed complaints_"
    )

    payload = {
        "generated_at": generated,
        "ingest": ingest_meta,
        "cleaning": clean_stats,
        "validation": validation,
        "load": load_result,
        "date_range": {
            "min": str(df_silver["created_date"].min()),
            "max": str(df_silver["created_date"].max()),
        },
    }
    json_path = cfg.reports_dir / "data_quality_report.json"
    json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")

    md = f"""# NYC 311 — Data Quality Report

_Generated: {generated}_

## Pipeline summary
| Stage | Metric | Value |
|-------|--------|-------|
| Ingest | Rows fetched | {ingest_meta['row_count']:,} |
| Ingest | Requested limit | {ingest_meta['requested_limit']:,} |
| Ingest | Since date | {ingest_meta['since_date']} |
| Clean | Input rows | {clean_stats['input_rows']:,} |
| Clean | Dropped (missing created_date) | {clean_stats['dropped_missing_created_date']:,} |
| Clean | Dropped (duplicates) | {clean_stats['dropped_duplicates']:,} |
| Clean | Output rows | {clean_stats['output_rows']:,} |
| Clean | Rows missing geo | {clean_stats['rows_missing_geo']:,} |
| Clean | Rows geo out-of-bounds | {clean_stats['rows_geo_out_of_bounds']:,} |
| Clean | Rows with resolution time | {clean_stats['rows_with_resolution']:,} |
| Validate | Passed | {validation['passed']} |
| Validate | Failure cases | {validation['failure_cases']:,} |
| Load | Table | `{load_result['table']}` |
| Load | Rows loaded | {load_result['rows_loaded']:,} |
| Load | Rows with geometry | {load_result['rows_with_geometry']:,} |

**Date range:** {payload['date_range']['min']} → {payload['date_range']['max']}

## Missing values (silver)
{missing_md}

## Top 10 complaint types
{top_types}

## Borough distribution
{borough_dist}

## Resolution time (hours) — closed complaints
{res_summary}
"""
    md_path = cfg.reports_dir / "data_quality_report.md"
    md_path.write_text(md, encoding="utf-8")
    logger.info("Data-quality report written: %s", md_path)
    return str(md_path), str(json_path)
