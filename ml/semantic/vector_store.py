"""pgvector query helpers: similarity search, related, duplicate candidates.

All queries are parameterized (no string-built SQL from user input). Cosine
distance operator `<=>`; similarity = 1 - distance. The caller supplies an
already-embedded query vector (query embedding happens in the embedder/service).
"""

from __future__ import annotations

import numpy as np
import psycopg

from .config import SemanticConfig


def vec_literal(v: np.ndarray | list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def _rows_to_dicts(cur) -> list[dict]:
    cols = [d.name for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def search(
    conn: psycopg.Connection,
    cfg: SemanticConfig,
    query_vec,
    top_k: int = 5,
    category: str | None = None,
    min_similarity: float = 0.0,
) -> list[dict]:
    """Semantic nearest neighbors, optionally filtered by category."""
    vec = vec_literal(query_vec)
    cat_clause = "AND c.complaint_type ILIKE %s" if category else ""
    sql = f"""
        SELECT e.complaint_id, c.complaint_type AS category, c.borough,
               c.created_date, e.text_snippet AS text,
               1 - (e.embedding <=> %s::vector) AS similarity
        FROM semantic.complaint_embeddings e
        JOIN silver.complaints_311 c ON c.unique_key = e.complaint_id
        WHERE e.embedding_model = %s AND e.embedding_version = %s {cat_clause}
        ORDER BY e.embedding <=> %s::vector
        LIMIT %s
    """
    params = [vec, cfg.model_name, cfg.embedding_version]
    if category:
        params.append(category)
    params += [vec, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = _rows_to_dicts(cur)
    return [r for r in rows if r["similarity"] >= min_similarity]


def related(conn: psycopg.Connection, cfg: SemanticConfig, complaint_id: str, top_k: int = 5) -> list[dict]:
    """Neighbors of an existing complaint (excludes itself)."""
    sql = """
        WITH target AS (
            SELECT embedding FROM semantic.complaint_embeddings
            WHERE complaint_id = %s AND embedding_model = %s AND embedding_version = %s
            LIMIT 1
        )
        SELECT e.complaint_id, c.complaint_type AS category, c.borough,
               c.created_date, e.text_snippet AS text,
               1 - (e.embedding <=> (SELECT embedding FROM target)) AS similarity
        FROM semantic.complaint_embeddings e
        JOIN silver.complaints_311 c ON c.unique_key = e.complaint_id
        WHERE e.embedding_model = %s AND e.embedding_version = %s
          AND e.complaint_id <> %s
          AND (SELECT embedding FROM target) IS NOT NULL
        ORDER BY e.embedding <=> (SELECT embedding FROM target)
        LIMIT %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, [complaint_id, cfg.model_name, cfg.embedding_version,
                          cfg.model_name, cfg.embedding_version, complaint_id, top_k])
        return _rows_to_dicts(cur)


def duplicate_candidates(
    conn: psycopg.Connection,
    cfg: SemanticConfig,
    query_vec,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_m: float | None = None,
    top_k: int = 5,
) -> list[dict]:
    """Nearest neighbors, optionally spatially gated (PostGIS ST_DWithin).

    Returns candidates + distance_m; the *duplicate verdict* (threshold + gate)
    is applied by the caller, not here.
    """
    vec = vec_literal(query_vec)
    r = radius_m if radius_m is not None else cfg.dup_radius_m
    spatial = latitude is not None and longitude is not None
    dist_expr = (
        "ST_Distance(c.geom::geography, ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography)"
        if spatial else "NULL"
    )
    where_geo = (
        "AND c.geom IS NOT NULL AND ST_DWithin(c.geom::geography, "
        "ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography, %s)"
        if spatial else ""
    )
    sql = f"""
        SELECT e.complaint_id, c.complaint_type AS category, c.borough,
               c.created_date, e.text_snippet AS text,
               1 - (e.embedding <=> %s::vector) AS similarity,
               {dist_expr} AS distance_m
        FROM semantic.complaint_embeddings e
        JOIN silver.complaints_311 c ON c.unique_key = e.complaint_id
        WHERE e.embedding_model = %s AND e.embedding_version = %s {where_geo}
        ORDER BY e.embedding <=> %s::vector
        LIMIT %s
    """
    params: list = [vec]
    if spatial:
        params += [longitude, latitude]          # dist_expr
    params += [cfg.model_name, cfg.embedding_version]
    if spatial:
        params += [longitude, latitude, r]        # ST_DWithin
    params += [vec, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return _rows_to_dicts(cur)
