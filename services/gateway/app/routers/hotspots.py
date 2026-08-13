"""Admin-only geospatial hotspot endpoints (M5).

Read-only projection of `geo.hotspots` — Getis-Ord Gi* results precomputed by the
offline batch job `ml.geo.run` on the **real NYC 311** corpus. The gateway owns no
spatial-statistics code (no libpysal/esda here); it just serves precomputed rows.

Every route depends on `require_admin`, so a citizen or unauthenticated caller is
rejected server-side. These results are NYC 311 spatial analysis and must be
labeled as such in the UI — they are never presented as Delhi hotspots (the Delhi
demo data is far too sparse for valid Gi*, and its product map is unchanged).
"""

from __future__ import annotations

from typing import Any

import psycopg
from fastapi import APIRouter, Depends, Query

from app.core.db import get_db
from app.core.deps import require_admin
from app.schemas.hotspots import HotspotCell, HotspotMeta, SignificanceBucket

router = APIRouter(prefix="/api/v1/hotspots", tags=["hotspots"])

# Mirrors ml/geo/config.py (the pipeline that writes geo.hotspots). Surfaced in
# /meta so the UI can state the method honestly.
_METHOD = "getis_ord_gi_star"
_SPATIAL_UNIT = "grid_1km"
_CELL_SIZE_DEG = 0.009
_PERMUTATIONS = 999
_FDR_ALPHA = 0.05

# `significance` filter → SQL predicate (fixed fragments, never interpolated user
# input). Explicit band lists rather than LIKE 'hot_%' — a literal % in the query
# collides with psycopg's %(name)s parameter formatting. Bands:
# hot_99|hot_95|hot_90|cold_99|cold_95|cold_90|ns.
_SIG_FILTERS: dict[str, str] = {
    "all": "TRUE",
    "significant": "significance <> 'ns'",
    "hot": "significance IN ('hot_99', 'hot_95', 'hot_90')",
    "cold": "significance IN ('cold_99', 'cold_95', 'cold_90')",
}


@router.get("", response_model=list[HotspotCell])
def hotspots(
    category: str | None = Query(None, description="NYC complaint_type; omit for overall (all complaints)"),
    window: str = Query("all", description="Time window label: 'all' or 'YYYY-MM'"),
    significance: str = Query("significant", description="all | significant | hot | cold"),
    limit: int = Query(2000, ge=1, le=5000),
    _admin: dict[str, Any] = Depends(require_admin),
    conn: psycopg.Connection = Depends(get_db),
) -> list[HotspotCell]:
    """Precomputed Gi* cells for a category/window, filtered by significance.

    `category` omitted → the overall (all-complaints) surface (category IS NULL).
    Cells are returned with their centroid and a lat/lon bounding box so the map
    can draw each as a rectangle shaded by confidence band.
    """
    sig_sql = _SIG_FILTERS.get(significance, _SIG_FILTERS["significant"])
    where = ["window_label = %(window)s", sig_sql]
    params: dict[str, Any] = {"window": window, "limit": limit}
    if category is None:
        where.append("category IS NULL")
    else:
        where.append("category = %(category)s")
        params["category"] = category

    sql = f"""
        SELECT cell_key, category, window_label, count, gi_z, p_value, significance,
               ST_Y(centroid) AS lat, ST_X(centroid) AS lon,
               ST_YMin(cell) AS south, ST_XMin(cell) AS west,
               ST_YMax(cell) AS north, ST_XMax(cell) AS east
        FROM geo.hotspots
        WHERE {' AND '.join(where)}
        ORDER BY gi_z DESC NULLS LAST
        LIMIT %(limit)s
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return [
        HotspotCell(
            cell_key=r[0], category=r[1], window_label=r[2], count=int(r[3]),
            gi_z=float(r[4]) if r[4] is not None else None,
            p_value=float(r[5]) if r[5] is not None else None,
            significance=r[6], lat=float(r[7]), lon=float(r[8]),
            south=float(r[9]), west=float(r[10]), north=float(r[11]), east=float(r[12]),
        )
        for r in rows
    ]


@router.get("/meta", response_model=HotspotMeta)
def meta(
    _admin: dict[str, Any] = Depends(require_admin),
    conn: psycopg.Connection = Depends(get_db),
) -> HotspotMeta:
    """Filter options + method metadata for the admin hotspot view.

    `available` is False when the pipeline has never been run (geo.hotspots empty),
    so the UI can show an honest empty state rather than an error.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM geo.hotspots")
        total = int(cur.fetchone()[0])
        if total == 0:
            return HotspotMeta(
                available=False, method=_METHOD, spatial_unit=_SPATIAL_UNIT,
                cell_size_deg=_CELL_SIZE_DEG, permutations=_PERMUTATIONS, fdr_alpha=_FDR_ALPHA,
                categories=[], windows=[], total_cells=0, significant=[], computed_at=None,
            )

        cur.execute(
            "SELECT DISTINCT category FROM geo.hotspots WHERE category IS NOT NULL ORDER BY 1")
        categories = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT window_label FROM geo.hotspots ORDER BY 1")
        windows = [r[0] for r in cur.fetchall()]

        # Significance breakdown for the headline overall/all surface.
        cur.execute(
            "SELECT significance, count(*) FROM geo.hotspots "
            "WHERE category IS NULL AND window_label = 'all' GROUP BY 1 ORDER BY 1")
        significant = [SignificanceBucket(band=b, count=int(n)) for b, n in cur.fetchall()]

        cur.execute("SELECT max(computed_at) FROM geo.hotspots")
        computed = cur.fetchone()[0]

    return HotspotMeta(
        available=True, method=_METHOD, spatial_unit=_SPATIAL_UNIT,
        cell_size_deg=_CELL_SIZE_DEG, permutations=_PERMUTATIONS, fdr_alpha=_FDR_ALPHA,
        categories=categories, windows=windows, total_cells=total,
        significant=significant, computed_at=computed.isoformat() if computed else None,
    )
