"""Spatial grid + complaint counts (fast integer bucketing, not a spatial join)."""

from __future__ import annotations

import psycopg

from . import config


def load_counts(conn, category: str | None = None, month: str | None = None) -> dict[tuple[int, int], int]:
    """Complaint counts per ~1km grid cell as {(i, j): count} (non-empty cells only)."""
    b, s = config.BBOX, config.CELL_SIZE_DEG
    where = ["geo_valid",
             "longitude BETWEEN %(minx)s AND %(maxx)s",
             "latitude BETWEEN %(miny)s AND %(maxy)s"]
    params: dict = dict(b, size=s)
    if category:
        where.append("complaint_type = %(cat)s")
        params["cat"] = category
    if month:
        where.append("to_char(created_date, 'YYYY-MM') = %(mon)s")
        params["mon"] = month
    sql = f"""
        SELECT floor((longitude - %(minx)s) / %(size)s)::int AS i,
               floor((latitude  - %(miny)s) / %(size)s)::int AS j,
               count(*) AS n
        FROM silver.complaints_311
        WHERE {' AND '.join(where)}
        GROUP BY 1, 2
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return {(int(i), int(j)): int(n) for i, j, n in cur.fetchall()}


def _centroid(i: int, j: int) -> tuple[float, float]:
    b, s = config.BBOX, config.CELL_SIZE_DEG
    return (b["minx"] + (i + 0.5) * s, b["miny"] + (j + 0.5) * s)


def _cell_wkt(i: int, j: int) -> str:
    b, s = config.BBOX, config.CELL_SIZE_DEG
    x0, y0 = b["minx"] + i * s, b["miny"] + j * s
    x1, y1 = x0 + s, y0 + s
    return f"POLYGON(({x0} {y0},{x1} {y0},{x1} {y1},{x0} {y1},{x0} {y0}))"


def build_cells(counts: dict[tuple[int, int], int]) -> list[dict]:
    """Study area = non-empty cells + their 8-neighbours, so hot cells get their
    zero-count context without pulling in distant water. Returns ordered cell dicts."""
    study: set[tuple[int, int]] = set(counts)
    for (i, j) in list(counts):
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                study.add((i + di, j + dj))
    cells = []
    for (i, j) in sorted(study):
        cx, cy = _centroid(i, j)
        cells.append({"i": i, "j": j, "key": f"{i}:{j}", "count": counts.get((i, j), 0),
                      "cx": cx, "cy": cy, "wkt": _cell_wkt(i, j)})
    return cells


def top_categories(conn, n: int) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT complaint_type FROM silver.complaints_311 WHERE geo_valid "
            "GROUP BY 1 ORDER BY count(*) DESC LIMIT %s", (n,))
        return [r[0] for r in cur.fetchall()]
