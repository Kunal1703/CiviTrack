"""Admin-only analytics endpoints.

Every route here depends on `require_admin`, so a citizen (or an unauthenticated
caller) is rejected server-side regardless of what the frontend shows. All
figures are computed from real app.complaints data — no ML predictions and no
invented numbers (resolution-time prediction is M4, not built).
"""

from __future__ import annotations

from typing import Any

import psycopg
from fastapi import APIRouter, Depends

from app.core.db import get_db
from app.core.deps import require_admin
from app.schemas.admin import AdminStats, Assignee, Bucket, VolumePoint

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _buckets(cur, sql: str) -> list[Bucket]:
    cur.execute(sql)
    return [Bucket(key=str(k) if k is not None else "Unassigned", count=int(n)) for k, n in cur.fetchall()]


@router.get("/stats", response_model=AdminStats)
def stats(
    _admin: dict[str, Any] = Depends(require_admin),
    conn: psycopg.Connection = Depends(get_db),
) -> AdminStats:
    with conn.cursor() as cur:
        # Status counts (single pass).
        cur.execute("SELECT status, count(*) FROM app.complaints GROUP BY status")
        by_status_map = {s: int(n) for s, n in cur.fetchall()}
        total = sum(by_status_map.values())

        def g(s: str) -> int:
            return by_status_map.get(s, 0)

        open_count = g("new") + g("triaged") + g("in_progress")

        cur.execute(
            "SELECT count(*) FROM app.complaints "
            "WHERE priority = 'high' AND status IN ('new','triaged','in_progress')"
        )
        high_priority_open = int(cur.fetchone()[0])

        cur.execute("SELECT count(*) FROM app.complaints WHERE created_at::date = CURRENT_DATE")
        new_today = int(cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM app.complaints WHERE closed_at::date = CURRENT_DATE")
        resolved_today = int(cur.fetchone()[0])

        cur.execute(
            "SELECT avg(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600.0) "
            "FROM app.complaints WHERE status = 'resolved' AND closed_at IS NOT NULL"
        )
        avg_row = cur.fetchone()[0]
        avg_resolution_hours = round(float(avg_row), 1) if avg_row is not None else None

        # Potential-duplicate heuristic (PostGIS spatial + temporal + same category).
        cur.execute(
            """
            SELECT count(DISTINCT a.id)
            FROM app.complaints a
            JOIN app.complaints b
              ON a.id <> b.id
             AND a.category IS NOT DISTINCT FROM b.category
             AND a.geom IS NOT NULL AND b.geom IS NOT NULL
             AND ST_DWithin(a.geom::geography, b.geom::geography, 250)
             AND abs(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 7 * 86400
            """
        )
        potential_duplicates = int(cur.fetchone()[0])

        by_status = [Bucket(key=k, count=v) for k, v in sorted(by_status_map.items())]
        by_category = _buckets(
            cur, "SELECT COALESCE(category,'Uncategorized'), count(*) FROM app.complaints "
                 "GROUP BY 1 ORDER BY 2 DESC")
        by_priority = _buckets(
            cur, "SELECT priority, count(*) FROM app.complaints GROUP BY 1 ORDER BY 2 DESC")
        by_department = _buckets(
            cur,
            "SELECT d.name, count(*) FROM app.complaints c "
            "LEFT JOIN app.departments d ON d.id = c.department_id GROUP BY d.name ORDER BY 2 DESC")

        # 30-day daily volume (gap-filled with a date series).
        cur.execute(
            """
            SELECT to_char(gs.day, 'YYYY-MM-DD'), COALESCE(cnt, 0)
            FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') gs(day)
            LEFT JOIN (
                SELECT created_at::date AS d, count(*) AS cnt
                FROM app.complaints
                WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
                GROUP BY 1
            ) t ON t.d = gs.day::date
            ORDER BY gs.day
            """
        )
        volume_30d = [VolumePoint(date=d, count=int(n)) for d, n in cur.fetchall()]

    return AdminStats(
        total=total, open=open_count, new=g("new"), triaged=g("triaged"),
        in_progress=g("in_progress"), resolved=g("resolved"), rejected=g("rejected"),
        high_priority_open=high_priority_open, new_today=new_today, resolved_today=resolved_today,
        avg_resolution_hours=avg_resolution_hours, potential_duplicates=potential_duplicates,
        by_category=by_category, by_status=by_status, by_priority=by_priority,
        by_department=by_department, volume_30d=volume_30d,
    )


@router.get("/assignees", response_model=list[Assignee])
def assignees(
    _admin: dict[str, Any] = Depends(require_admin),
    conn: psycopg.Connection = Depends(get_db),
) -> list[Assignee]:
    """Users a complaint can be assigned to (admins/officials)."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, full_name, email FROM app.users WHERE role = 'admin' ORDER BY full_name")
        return [Assignee(id=r[0], full_name=r[1], email=r[2]) for r in cur.fetchall()]
