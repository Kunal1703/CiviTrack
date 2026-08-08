"""Phase 3/4 — embed silver complaints into pgvector.

Reproducible, resumable, versioned. Optimization: 311 `descriptor` is highly
categorical (~hundreds of distinct values over 200k rows), so we embed each
UNIQUE normalized text once and fan the vector out per complaint — turning a
200k-encode job into a few-hundred-encode job. Insertion is the real cost.

Every row records embedding_model / embedding_version / data_version so multiple
model versions coexist and re-runs are safe (resumable via existing ids).

Run from ml/:  python -m semantic.generate
"""

from __future__ import annotations

import json
import logging
import sys
import time

import mlflow
import numpy as np
import pandas as pd
import psycopg

from semantic.config import SemanticConfig
from semantic.embedder import Embedder
from semantic.normalize import embed_normalize

log = logging.getLogger("semantic.generate")
INSERT_BATCH = 2000


def _pg(cfg: SemanticConfig) -> psycopg.Connection:
    return psycopg.connect(
        host=cfg.postgres_host, port=cfg.postgres_port, dbname=cfg.postgres_db,
        user=cfg.postgres_user, password=cfg.postgres_password, autocommit=False,
    )


def _data_version() -> str:
    p = SemanticConfig().silver_path.parents[1] / "gold" / "manifest.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8")).get("content_hash", "unknown")
    return "unknown"


def _vec_literal(v: np.ndarray) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    cfg = SemanticConfig()
    df = pd.read_parquet(cfg.silver_path)[["unique_key", cfg.source_column]].dropna()
    df = df[df[cfg.source_column].str.len() > 0].drop_duplicates("unique_key").reset_index(drop=True)
    df["norm"] = df[cfg.source_column].map(embed_normalize)
    log.info("candidates: %s complaints, %s unique texts", len(df), df["norm"].nunique())

    # Resumable: skip complaints already embedded for this model+version.
    with _pg(cfg) as conn:
        existing = {
            r[0] for r in conn.execute(
                "SELECT complaint_id FROM semantic.complaint_embeddings WHERE embedding_model=%s AND embedding_version=%s",
                (cfg.model_name, cfg.embedding_version),
            ).fetchall()
        }
    if existing:
        df = df[~df["unique_key"].isin(existing)]
        log.info("resuming: %s already embedded, %s remaining", len(existing), len(df))
    if df.empty:
        log.info("nothing to embed."); return 0

    # Embed UNIQUE texts once.
    uniq = sorted(df["norm"].unique().tolist())
    emb = Embedder(cfg.model_name, normalize=cfg.normalize_embeddings)
    assert emb.dim == cfg.embedding_dim, f"dim mismatch {emb.dim} != {cfg.embedding_dim}"
    t0 = time.perf_counter()
    vectors = emb.encode(uniq, batch_size=cfg.batch_size)
    encode_s = time.perf_counter() - t0
    vec_by_text = {t: _vec_literal(vectors[i]) for i, t in enumerate(uniq)}
    log.info("encoded %s unique texts in %.1fs", len(uniq), encode_s)

    dv = _data_version()
    rows = [
        (uk, cfg.source_column, txt, vec_by_text[norm], cfg.model_name, cfg.embedding_version, dv)
        for uk, txt, norm in zip(df["unique_key"], df[cfg.source_column], df["norm"])
    ]

    sql = (
        "INSERT INTO semantic.complaint_embeddings "
        "(complaint_id, source_column, text_snippet, embedding, embedding_model, embedding_version, data_version) "
        "VALUES (%s,%s,%s,%s::vector,%s,%s,%s) ON CONFLICT (complaint_id, embedding_model, embedding_version) DO NOTHING"
    )
    t1 = time.perf_counter()
    inserted = 0
    with _pg(cfg) as conn:
        with conn.cursor() as cur:
            for i in range(0, len(rows), INSERT_BATCH):
                cur.executemany(sql, rows[i : i + INSERT_BATCH])
                inserted += len(rows[i : i + INSERT_BATCH])
                if i // INSERT_BATCH % 10 == 0:
                    log.info("  inserted %s / %s", inserted, len(rows))
        conn.commit()
    insert_s = time.perf_counter() - t1

    with _pg(cfg) as conn:
        total = conn.execute(
            "SELECT count(*) FROM semantic.complaint_embeddings WHERE embedding_model=%s AND embedding_version=%s",
            (cfg.model_name, cfg.embedding_version),
        ).fetchone()[0]

    mlflow.set_tracking_uri(cfg.mlflow_uri)
    mlflow.set_experiment(cfg.experiment_name)
    with mlflow.start_run(run_name="embed-generate"):
        mlflow.log_params({"model": cfg.model_name, "dim": cfg.embedding_dim, "version": cfg.embedding_version,
                           "source_column": cfg.source_column, "data_version": dv})
        mlflow.log_metrics({"unique_texts": len(uniq), "rows_inserted": len(rows), "total_vectors": total,
                            "encode_seconds": round(encode_s, 2), "insert_seconds": round(insert_s, 2)})
    log.info("DONE: total vectors=%s (encode %.1fs, insert %.1fs)", total, encode_s, insert_s)
    return 0


if __name__ == "__main__":
    sys.exit(run())
