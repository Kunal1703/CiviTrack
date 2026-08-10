"""pgvector query helpers (vendored from ml/semantic/vector_store.py).

Parameterized queries only — no user input is ever concatenated into SQL, and
no user-controlled vector expressions are accepted.
"""

from __future__ import annotations

import numpy as np

from app.core.config import Settings

_TABLE = "semantic.complaint_embeddings"
_SILVER = "silver.complaints_311"
_APP = "app.complaints"

# Delhi (product) embeddings live in the SAME embeddings table but are tagged with
# a distinct version + data_version, so NYC queries (which filter on version 'v1')
# never see them and vice-versa. This is the dataset boundary.
DELHI_VERSION = "delhi-v1"
DELHI_DATA_VERSION = "delhi_demo"


def _vec(v: np.ndarray | list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def _dicts(cur) -> list[dict]:
    cols = [d.name for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def search(conn, s: Settings, qv, top_k: int, category: str | None, min_similarity: float) -> list[dict]:
    vec = _vec(qv)
    cat = "AND c.complaint_type ILIKE %s" if category else ""
    sql = f"""
        SELECT e.complaint_id, c.complaint_type AS category, c.borough, c.created_date,
               e.text_snippet AS text, 1 - (e.embedding <=> %s::vector) AS similarity
        FROM {_TABLE} e JOIN {_SILVER} c ON c.unique_key = e.complaint_id
        WHERE e.embedding_model = %s AND e.embedding_version = %s {cat}
        ORDER BY e.embedding <=> %s::vector LIMIT %s
    """
    params = [vec, s.embedding_model, s.embedding_version]
    if category:
        params.append(category)
    params += [vec, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = _dicts(cur)
    return [r for r in rows if r["similarity"] >= min_similarity]


def related(conn, s: Settings, complaint_id: str, top_k: int) -> list[dict]:
    sql = f"""
        WITH t AS (SELECT embedding FROM {_TABLE}
                   WHERE complaint_id=%s AND embedding_model=%s AND embedding_version=%s LIMIT 1)
        SELECT e.complaint_id, c.complaint_type AS category, c.borough, c.created_date,
               e.text_snippet AS text, 1 - (e.embedding <=> (SELECT embedding FROM t)) AS similarity
        FROM {_TABLE} e JOIN {_SILVER} c ON c.unique_key = e.complaint_id
        WHERE e.embedding_model=%s AND e.embedding_version=%s AND e.complaint_id <> %s
          AND (SELECT embedding FROM t) IS NOT NULL
        ORDER BY e.embedding <=> (SELECT embedding FROM t) LIMIT %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, [complaint_id, s.embedding_model, s.embedding_version,
                          s.embedding_model, s.embedding_version, complaint_id, top_k])
        return _dicts(cur)


def duplicate_candidates(conn, s: Settings, qv, lat, lon, radius_m, top_k: int) -> list[dict]:
    vec = _vec(qv)
    spatial = lat is not None and lon is not None
    dist = "ST_Distance(c.geom::geography, ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography)" if spatial else "NULL"
    geo = ("AND c.geom IS NOT NULL AND ST_DWithin(c.geom::geography, "
           "ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography, %s)") if spatial else ""
    sql = f"""
        SELECT e.complaint_id, c.complaint_type AS category, c.borough, c.created_date,
               e.text_snippet AS text, 1 - (e.embedding <=> %s::vector) AS similarity, {dist} AS distance_m
        FROM {_TABLE} e JOIN {_SILVER} c ON c.unique_key = e.complaint_id
        WHERE e.embedding_model=%s AND e.embedding_version=%s {geo}
        ORDER BY e.embedding <=> %s::vector LIMIT %s
    """
    params: list = [vec]
    if spatial:
        params += [lon, lat]
    params += [s.embedding_model, s.embedding_version]
    if spatial:
        params += [lon, lat, radius_m]
    params += [vec, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return _dicts(cur)


# ── Delhi (product) corpus: app.complaints, tagged delhi-v1 / delhi_demo ──────
# These mirror the NYC helpers but JOIN app.complaints and filter on the Delhi
# version/data_version, so citizen complaints never touch the NYC corpus.

def search_delhi(conn, s: Settings, qv, top_k: int, category: str | None, min_similarity: float) -> list[dict]:
    vec = _vec(qv)
    cat = "AND c.category ILIKE %s" if category else ""
    sql = f"""
        SELECT e.complaint_id, c.category, c.status, c.public_ref AS location,
               c.title AS text, c.created_at,
               1 - (e.embedding <=> %s::vector) AS similarity
        FROM {_TABLE} e JOIN {_APP} c ON c.id::text = e.complaint_id
        WHERE e.embedding_version = %s AND e.data_version = %s {cat}
        ORDER BY e.embedding <=> %s::vector LIMIT %s
    """
    params = [vec, DELHI_VERSION, DELHI_DATA_VERSION]
    if category:
        params.append(category)
    params += [vec, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = _dicts(cur)
    return [r for r in rows if r["similarity"] >= min_similarity]


def related_delhi(conn, s: Settings, complaint_id: str, top_k: int) -> list[dict]:
    sql = f"""
        WITH t AS (SELECT embedding FROM {_TABLE}
                   WHERE complaint_id=%s AND embedding_version=%s AND data_version=%s LIMIT 1)
        SELECT e.complaint_id, c.category, c.status, c.public_ref AS location,
               c.title AS text, c.created_at,
               1 - (e.embedding <=> (SELECT embedding FROM t)) AS similarity
        FROM {_TABLE} e JOIN {_APP} c ON c.id::text = e.complaint_id
        WHERE e.embedding_version=%s AND e.data_version=%s AND e.complaint_id <> %s
          AND (SELECT embedding FROM t) IS NOT NULL
        ORDER BY e.embedding <=> (SELECT embedding FROM t) LIMIT %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, [complaint_id, DELHI_VERSION, DELHI_DATA_VERSION,
                          DELHI_VERSION, DELHI_DATA_VERSION, complaint_id, top_k])
        return _dicts(cur)


def duplicate_candidates_delhi(conn, s: Settings, qv, lat, lon, radius_m, top_k: int) -> list[dict]:
    """Citizen-facing 'similar reports' for the Delhi product corpus.

    Unlike the NYC research path, this does NOT hard-exclude far complaints: it
    ranks by semantic similarity and *computes* distance when coordinates are
    given, so the caller can DISPLAY nearby similar reports and flag a true
    near-duplicate (within radius) while still surfacing merely-similar ones.
    """
    vec = _vec(qv)
    spatial = lat is not None and lon is not None
    dist = "ST_Distance(c.geom::geography, ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography)" if spatial else "NULL"
    sql = f"""
        SELECT e.complaint_id, c.category, c.status, c.public_ref AS location,
               c.title AS text, c.created_at,
               1 - (e.embedding <=> %s::vector) AS similarity, {dist} AS distance_m
        FROM {_TABLE} e JOIN {_APP} c ON c.id::text = e.complaint_id
        WHERE e.embedding_version=%s AND e.data_version=%s
        ORDER BY e.embedding <=> %s::vector LIMIT %s
    """
    params: list = [vec]
    if spatial:
        params += [lon, lat]
    params += [DELHI_VERSION, DELHI_DATA_VERSION, vec, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return _dicts(cur)
