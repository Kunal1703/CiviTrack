"""Complaint CRUD with server-side authorization.

Authorization rules (enforced here, not in the frontend):
  • Any authenticated user may create a complaint and list/read their OWN.
  • Admins may list/read ALL complaints and are the only role that can mutate a
    complaint (status, priority, category override, assignment) or add notes.
  • Internal-visibility timeline entries are never returned to citizen requests.
"""

from __future__ import annotations

from typing import Any

import httpx
import psycopg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from app.core.config import get_settings
from app.core.db import get_db, get_pool
from app.core.deps import get_current_user, require_admin
from app.core.logging import get_logger
from app.schemas.complaints import (
    ComplaintAdminPatch,
    ComplaintCreate,
    ComplaintListOut,
    ComplaintOut,
    DepartmentOut,
    MapPoint,
    NoteCreate,
    UpdateOut,
)

router = APIRouter(prefix="/api/v1", tags=["complaints"])
logger = get_logger("gateway.complaints")

# Delhi (product) embedding tags — must match ml_service.semantic_store.
_DELHI_VERSION = "delhi-v1"
_DELHI_DATA_VERSION = "delhi_demo"


def _index_complaint_embedding(complaint_id: int, text: str) -> None:
    """Best-effort: embed a new complaint (via ml_service) and store it in the
    Delhi semantic index so later duplicate/related checks can find it. Failures
    are logged and swallowed — indexing must never break complaint submission."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=settings.ml_service_timeout) as client:
            resp = client.post(f"{settings.ml_service_url}/semantic/embed", json={"texts": [text]})
            resp.raise_for_status()
        data = resp.json()
        vector = data["vectors"][0]
        model = data["model"]
        vec_literal = "[" + ",".join(f"{x:.6f}" for x in vector) + "]"
        with get_pool().connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO semantic.complaint_embeddings
                    (complaint_id, source_column, text_snippet, embedding,
                     embedding_model, embedding_version, data_version)
                VALUES (%s, 'description', %s, %s::vector, %s, %s, %s)
                ON CONFLICT (complaint_id, embedding_model, embedding_version)
                DO UPDATE SET embedding = EXCLUDED.embedding, text_snippet = EXCLUDED.text_snippet
                """,
                (str(complaint_id), text[:500], vec_literal, model,
                 _DELHI_VERSION, _DELHI_DATA_VERSION),
            )
        logger.info("indexed embedding for complaint id=%s", complaint_id)
    except Exception as exc:  # noqa: BLE001 — indexing is best-effort
        logger.warning("embed-on-create failed for complaint id=%s: %s", complaint_id, exc)

# Canonical column list (order matters: consumed positionally by _row_to_out).
_SELECT = """
    SELECT c.id, c.public_ref, c.reporter_id, c.title, c.description, c.category,
           c.category_confidence, c.category_overridden, c.status, c.priority,
           c.department_id, c.assignee_id, c.latitude, c.longitude, c.address_text,
           c.source, c.is_demo, c.created_at, c.updated_at, c.closed_at,
           u.full_name AS reporter_name, d.name AS department_name
    FROM app.complaints c
    LEFT JOIN app.users u ON u.id = c.reporter_id
    LEFT JOIN app.departments d ON d.id = c.department_id
"""

_SORTABLE = {"created_at", "updated_at", "priority", "status"}


def _row_to_out(r: tuple[Any, ...]) -> ComplaintOut:
    return ComplaintOut(
        id=r[0], public_ref=r[1], reporter_id=r[2], title=r[3], description=r[4],
        category=r[5], category_confidence=r[6], category_overridden=r[7], status=r[8],
        priority=r[9], department_id=r[10], assignee_id=r[11], latitude=r[12],
        longitude=r[13], address_text=r[14], source=r[15], is_demo=r[16],
        created_at=r[17], updated_at=r[18], closed_at=r[19],
        reporter_name=r[20], department_name=r[21],
    )


def _fetch_one(conn: psycopg.Connection, complaint_id: int) -> tuple[Any, ...] | None:
    with conn.cursor() as cur:
        cur.execute(_SELECT + " WHERE c.id = %s", (complaint_id,))
        return cur.fetchone()


# ── Create ────────────────────────────────────────────────────────────────
@router.post("/complaints", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    background: BackgroundTasks,
    user: dict[str, Any] = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_db),
) -> ComplaintOut:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO app.complaints
                (reporter_id, title, description, category, category_confidence,
                 priority, latitude, longitude, address_text, geom, source)
            VALUES
                (%(reporter_id)s, %(title)s, %(description)s, %(category)s, %(conf)s,
                 COALESCE(%(priority)s, 'medium'),
                 %(lat)s::double precision, %(lon)s::double precision, %(address)s,
                 CASE WHEN %(lat)s::double precision IS NOT NULL
                       AND %(lon)s::double precision IS NOT NULL
                      THEN ST_SetSRID(
                          ST_MakePoint(%(lon)s::double precision, %(lat)s::double precision), 4326)
                      END,
                 'web')
            RETURNING id
            """,
            {
                "reporter_id": user["id"],
                "title": payload.title.strip(),
                "description": payload.description.strip(),
                "category": payload.category,
                "conf": payload.category_confidence,
                "priority": payload.priority,
                "lat": payload.latitude,
                "lon": payload.longitude,
                "address": payload.address_text,
            },
        )
        new_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO app.complaint_updates
                (complaint_id, author_id, type, new_status, note, visibility)
            VALUES (%s, %s, 'created', 'new', 'Complaint submitted', 'public')
            """,
            (new_id, user["id"]),
        )
    logger.info("complaint created id=%s by user=%s", new_id, user["id"])
    # Add to the Delhi semantic index (best-effort, off the response path).
    background.add_task(_index_complaint_embedding, new_id, payload.description.strip())
    return _row_to_out(_fetch_one(conn, new_id))


# ── List ──────────────────────────────────────────────────────────────────
@router.get("/complaints", response_model=ComplaintListOut)
def list_complaints(
    user: dict[str, Any] = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_db),
    status_f: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    priority: str | None = None,
    department_id: int | None = None,
    source: str | None = None,
    q: str | None = Query(default=None, max_length=200),
    sort: str = "created_at",
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ComplaintListOut:
    where: list[str] = []
    params: dict[str, Any] = {}

    # Ownership scoping: citizens are hard-limited to their own complaints.
    if user["role"] != "admin":
        where.append("c.reporter_id = %(uid)s")
        params["uid"] = user["id"]

    if status_f:
        where.append("c.status = %(status)s")
        params["status"] = status_f
    if category:
        where.append("c.category = %(category)s")
        params["category"] = category
    if priority:
        where.append("c.priority = %(priority)s")
        params["priority"] = priority
    if q:
        where.append("(c.title ILIKE %(q)s OR c.description ILIKE %(q)s OR c.public_ref ILIKE %(q)s)")
        params["q"] = f"%{q}%"
    # Admin-only filters.
    if user["role"] == "admin":
        if department_id is not None:
            where.append("c.department_id = %(dept)s")
            params["dept"] = department_id
        if source:
            where.append("c.source = %(source)s")
            params["source"] = source

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    sort_col = sort if sort in _SORTABLE else "created_at"
    order_sql = "ASC" if order == "asc" else "DESC"

    with conn.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM app.complaints c{where_sql}", params)
        total = cur.fetchone()[0]
        cur.execute(
            f"{_SELECT}{where_sql} ORDER BY c.{sort_col} {order_sql} "
            "LIMIT %(limit)s OFFSET %(offset)s",
            {**params, "limit": limit, "offset": offset},
        )
        items = [_row_to_out(r) for r in cur.fetchall()]

    return ComplaintListOut(items=items, total=total, limit=limit, offset=offset)


# ── Community map (Delhi) ─────────────────────────────────────────────────
# NOTE: registered before /complaints/{complaint_id} so the literal "map" segment
# isn't captured by the typed int path param.
@router.get("/complaints/map", response_model=list[MapPoint])
def complaints_map(
    user: dict[str, Any] = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_db),
    limit: int = Query(default=1000, ge=1, le=5000),
) -> list[MapPoint]:
    """Non-PII community complaint points for the citizen map. Returns coordinates,
    category, status and reference only — never reporter identity. This is a shared
    community view (distinct from 'my reports'), so it is not scoped to the caller."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, public_ref, category, status, priority, title,
                   latitude, longitude, created_at
            FROM app.complaints
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        return [
            MapPoint(
                id=r[0], public_ref=r[1], category=r[2], status=r[3], priority=r[4],
                title=r[5], latitude=r[6], longitude=r[7], created_at=r[8],
            )
            for r in cur.fetchall()
        ]


# ── Read one ──────────────────────────────────────────────────────────────
@router.get("/complaints/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: int,
    user: dict[str, Any] = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_db),
) -> ComplaintOut:
    row = _fetch_one(conn, complaint_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint not found")
    # Citizens may only read their own. Return 404 (not 403) so existence isn't leaked.
    if user["role"] != "admin" and row[2] != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint not found")
    return _row_to_out(row)


# ── Admin: update ─────────────────────────────────────────────────────────
@router.patch("/complaints/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: int,
    patch: ComplaintAdminPatch,
    admin: dict[str, Any] = Depends(require_admin),
    conn: psycopg.Connection = Depends(get_db),
) -> ComplaintOut:
    current = _fetch_one(conn, complaint_id)
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint not found")
    old_status, old_category = current[8], current[5]
    old_dept, old_assignee = current[10], current[11]

    sets: list[str] = []
    params: dict[str, Any] = {"id": complaint_id}
    if patch.status is not None:
        sets.append("status = %(status)s")
        params["status"] = patch.status
        sets.append("closed_at = CASE WHEN %(status)s IN ('resolved','rejected') THEN now() ELSE NULL END")
    if patch.priority is not None:
        sets.append("priority = %(priority)s")
        params["priority"] = patch.priority
    if patch.category is not None:
        sets.append("category = %(category)s")
        sets.append("category_overridden = true")
        params["category"] = patch.category
    if patch.department_id is not None:
        sets.append("department_id = %(dept)s")
        params["dept"] = patch.department_id
    if patch.assignee_id is not None:
        sets.append("assignee_id = %(assignee)s")
        params["assignee"] = patch.assignee_id

    if sets:
        sets.append("updated_at = now()")
        try:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE app.complaints SET {', '.join(sets)} WHERE id = %(id)s", params)
        except psycopg.errors.ForeignKeyViolation as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="invalid department_id or assignee_id") from exc

    # Append timeline rows describing what changed.
    with conn.cursor() as cur:
        if patch.status is not None and patch.status != old_status:
            cur.execute(
                "INSERT INTO app.complaint_updates "
                "(complaint_id, author_id, type, old_status, new_status, note, visibility) "
                "VALUES (%s, %s, 'status_change', %s, %s, %s, 'public')",
                (complaint_id, admin["id"], old_status, patch.status,
                 f"Status changed to {patch.status}"),
            )
        if patch.category is not None and patch.category != old_category:
            cur.execute(
                "INSERT INTO app.complaint_updates "
                "(complaint_id, author_id, type, note, visibility) "
                "VALUES (%s, %s, 'category_override', %s, 'internal')",
                (complaint_id, admin["id"], f"Category overridden to {patch.category}"),
            )
        if (patch.department_id is not None and patch.department_id != old_dept) or (
            patch.assignee_id is not None and patch.assignee_id != old_assignee
        ):
            cur.execute(
                "INSERT INTO app.complaint_updates "
                "(complaint_id, author_id, type, note, visibility) "
                "VALUES (%s, %s, 'assignment', %s, 'internal')",
                (complaint_id, admin["id"], "Assignment updated"),
            )
        if patch.note:
            cur.execute(
                "INSERT INTO app.complaint_updates "
                "(complaint_id, author_id, type, note, visibility) "
                "VALUES (%s, %s, 'note', %s, 'internal')",
                (complaint_id, admin["id"], patch.note),
            )

    return _row_to_out(_fetch_one(conn, complaint_id))


# ── Timeline ──────────────────────────────────────────────────────────────
@router.get("/complaints/{complaint_id}/updates", response_model=list[UpdateOut])
def list_updates(
    complaint_id: int,
    user: dict[str, Any] = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_db),
) -> list[UpdateOut]:
    row = _fetch_one(conn, complaint_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint not found")
    is_owner = row[2] == user["id"]
    if user["role"] != "admin" and not is_owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint not found")

    vis_filter = "" if user["role"] == "admin" else " AND visibility = 'public'"
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, complaint_id, author_id, type, old_status, new_status, note, "
            "visibility, created_at FROM app.complaint_updates "
            f"WHERE complaint_id = %s{vis_filter} ORDER BY created_at ASC",
            (complaint_id,),
        )
        return [
            UpdateOut(id=r[0], complaint_id=r[1], author_id=r[2], type=r[3], old_status=r[4],
                      new_status=r[5], note=r[6], visibility=r[7], created_at=r[8])
            for r in cur.fetchall()
        ]


@router.post("/complaints/{complaint_id}/updates", response_model=UpdateOut,
             status_code=status.HTTP_201_CREATED)
def add_note(
    complaint_id: int,
    payload: NoteCreate,
    admin: dict[str, Any] = Depends(require_admin),
    conn: psycopg.Connection = Depends(get_db),
) -> UpdateOut:
    if _fetch_one(conn, complaint_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint not found")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO app.complaint_updates "
            "(complaint_id, author_id, type, note, visibility) "
            "VALUES (%s, %s, 'note', %s, %s) "
            "RETURNING id, complaint_id, author_id, type, old_status, new_status, note, "
            "visibility, created_at",
            (complaint_id, admin["id"], payload.note, payload.visibility),
        )
        r = cur.fetchone()
    return UpdateOut(id=r[0], complaint_id=r[1], author_id=r[2], type=r[3], old_status=r[4],
                     new_status=r[5], note=r[6], visibility=r[7], created_at=r[8])


# ── Departments (for admin assignment UI) ─────────────────────────────────
@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    user: dict[str, Any] = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_db),
) -> list[DepartmentOut]:
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, slug FROM app.departments ORDER BY name")
        return [DepartmentOut(id=r[0], name=r[1], slug=r[2]) for r in cur.fetchall()]
