"""Load the silver dataset into PostgreSQL and derive a PostGIS geometry.

Strategy: write tabular columns with pandas ``to_sql`` (fast, simple), then add
a ``geom`` Point column populated from lat/lon via ``ST_MakePoint`` and index it
with GiST. This keeps the pipeline free of heavy geo dependencies (no geopandas
/ GDAL) while still exercising PostGIS end-to-end.

The persisted parquet copy of silver is written alongside for the EDA notebook.
"""

from __future__ import annotations

import logging

import pandas as pd
from sqlalchemy import create_engine, text

from .config import PipelineConfig

logger = logging.getLogger("pipeline.load")


def write_silver_parquet(df: pd.DataFrame, cfg: PipelineConfig) -> str:
    cfg.silver_dir.mkdir(parents=True, exist_ok=True)
    path = cfg.silver_dir / "nyc311_clean.parquet"
    df.to_parquet(path, index=False)
    logger.info("Silver parquet written: %s", path)
    return str(path)


def load_to_postgres(df: pd.DataFrame, cfg: PipelineConfig) -> dict:
    engine = create_engine(cfg.database_url)
    schema, table = cfg.target_schema, cfg.target_table
    fqtn = f"{schema}.{table}"

    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))

    # Replace the table each run (idempotent dev pipeline).
    df.to_sql(
        table,
        engine,
        schema=schema,
        if_exists="replace",
        index=False,
        # method="multi" batches rows into one INSERT; keep chunksize * ncols
        # under Postgres's 65535-parameter cap (16 cols → 2000 is safe).
        chunksize=2_000,
        method="multi",
    )
    logger.info("Loaded %s rows into %s", len(df), fqtn)

    # Add + populate geometry, then index it.
    with engine.begin() as conn:
        conn.execute(
            text(f"ALTER TABLE {fqtn} ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)")
        )
        conn.execute(
            text(
                f"UPDATE {fqtn} "
                "SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) "
                "WHERE longitude IS NOT NULL AND latitude IS NOT NULL AND geo_valid IS TRUE"
            )
        )
        conn.execute(
            text(f"CREATE INDEX IF NOT EXISTS ix_{table}_geom ON {fqtn} USING GIST (geom)")
        )
        conn.execute(
            text(f"CREATE INDEX IF NOT EXISTS ix_{table}_created ON {fqtn} (created_date)")
        )
        row_count = conn.execute(text(f"SELECT COUNT(*) FROM {fqtn}")).scalar_one()
        geom_count = conn.execute(
            text(f"SELECT COUNT(geom) FROM {fqtn}")
        ).scalar_one()

    engine.dispose()
    result = {"table": fqtn, "rows_loaded": int(row_count), "rows_with_geometry": int(geom_count)}
    logger.info("Load complete: %s", result)
    return result
