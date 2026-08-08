"""Phase 5/6/8 — quantitative semantic evaluation (real numbers, MLflow-tracked).

Three evaluations, each honest about what it measures:

  1. RETRIEVAL (pgvector): Precision@K for same-category retrieval on a sample.
     (Incident-level retrieval is impossible on categorical descriptors — all
     complaints with a descriptor share one vector — so we measure topical P@K.)

  2. DUPLICATE, natural-language (curated): TF-IDF vs MiniLM similarity, threshold
     sweep → best-F1 P/R/F1. Shows embeddings beat classical NLP on real phrasing.

  3. DUPLICATE, derived-real (categorical): similarity-only vs similarity+spatial
     gate → P/R/F1. The headline ablation: identical-text positives and
     same-category-FAR negatives are separable only by the geo gate.

Run from ml/ (after embeddings loaded):  python -m semantic.evaluation.evaluate
"""

from __future__ import annotations

import json
import logging
import sys

import mlflow
import numpy as np
import psycopg
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import precision_recall_fscore_support
from sklearn.metrics.pairwise import cosine_similarity

from semantic import vector_store as vs
from semantic.config import SemanticConfig
from semantic.embedder import Embedder
from semantic.normalize import embed_normalize

log = logging.getLogger("semantic.evaluate")


def _pg(cfg):
    return psycopg.connect(host=cfg.postgres_host, port=cfg.postgres_port, dbname=cfg.postgres_db,
                           user=cfg.postgres_user, password=cfg.postgres_password)


def _load(path):
    return [json.loads(x) for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]


def _prf(labels, preds):
    p, r, f, _ = precision_recall_fscore_support(labels, preds, average="binary", zero_division=0)
    return round(float(p), 4), round(float(r), 4), round(float(f), 4)


def _sweep(sims, labels, gate_ok=None):
    """Best-F1 threshold sweep. gate_ok: optional bool mask ANDed into the positive prediction."""
    best = {"f1": -1}
    for thr in np.linspace(0.3, 0.95, 66):
        pred = sims >= thr
        if gate_ok is not None:
            pred = pred & gate_ok
        p, r, f = _prf(labels, pred.astype(int))
        if f > best["f1"]:
            best = {"threshold": round(float(thr), 3), "precision": p, "recall": r, "f1": f}
    return best


def eval_retrieval(cfg, emb, conn, sample=200, k=5) -> dict:
    ids = [r[0] for r in conn.execute(
        "SELECT complaint_id FROM semantic.complaint_embeddings WHERE embedding_model=%s AND embedding_version=%s "
        "ORDER BY random() LIMIT %s", (cfg.model_name, cfg.embedding_version, sample)).fetchall()]
    cat = {r[0]: r[1] for r in conn.execute(
        "SELECT unique_key, complaint_type FROM silver.complaints_311 WHERE unique_key = ANY(%s)", (ids,)).fetchall()}
    p_at_k, rr = [], []
    for cid in ids:
        res = vs.related(conn, cfg, cid, top_k=k)
        if not res:
            continue
        same = [1 if r["category"] == cat.get(cid) else 0 for r in res]
        p_at_k.append(np.mean(same))
        first = next((i + 1 for i, s in enumerate(same) if s), None)
        rr.append(1.0 / first if first else 0.0)
    return {"precision_at_%d" % k: round(float(np.mean(p_at_k)), 4), "mrr": round(float(np.mean(rr)), 4),
            "n": len(p_at_k)}


def eval_dup_natural(cfg, emb) -> dict:
    curated = _load(cfg.eval_dir.parent / "curated_pairs.jsonl")
    a = [p["text_a"] for p in curated]
    b = [p["text_b"] for p in curated]
    labels = np.array([1 if p["label"] == "duplicate" else 0 for p in curated])
    # TF-IDF baseline
    vec = TfidfVectorizer(ngram_range=(1, 2)).fit([embed_normalize(t) for t in a + b])
    ta, tb = vec.transform([embed_normalize(t) for t in a]), vec.transform([embed_normalize(t) for t in b])
    tfidf_sims = np.array([cosine_similarity(ta[i], tb[i])[0, 0] for i in range(len(a))])
    # MiniLM
    ea, eb = emb.encode(a), emb.encode(b)
    minilm_sims = np.sum(ea * eb, axis=1)
    return {"tfidf": _sweep(tfidf_sims, labels), "minilm": _sweep(minilm_sims, labels)}


def eval_dup_derived(cfg, emb) -> dict:
    pairs = _load(cfg.eval_dir / "dup_pairs.jsonl")
    a = [p["text_a"] for p in pairs]
    b = [p["text_b"] for p in pairs]
    labels = np.array([1 if p["label"] == "duplicate" else 0 for p in pairs])
    dist = np.array([p.get("distance_m", np.inf) if p.get("distance_m") is not None else np.inf for p in pairs])
    gate_ok = dist <= cfg.dup_radius_m
    ea, eb = emb.encode(a), emb.encode(b)
    sims = np.sum(ea * eb, axis=1)
    return {
        "similarity_only": _sweep(sims, labels),
        "similarity_plus_spatial_gate": _sweep(sims, labels, gate_ok=gate_ok),
        "radius_m": cfg.dup_radius_m,
    }


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    cfg = SemanticConfig()
    emb = Embedder(cfg.model_name, normalize=cfg.normalize_embeddings)

    with _pg(cfg) as conn:
        retrieval = eval_retrieval(cfg, emb, conn)
    dup_nat = eval_dup_natural(cfg, emb)
    dup_der = eval_dup_derived(cfg, emb)

    report = {"model": cfg.model_name, "retrieval": retrieval, "duplicate_natural": dup_nat, "duplicate_derived": dup_der}
    cfg.reports_dir.mkdir(parents=True, exist_ok=True)
    (cfg.reports_dir / "evaluation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    mlflow.set_tracking_uri(cfg.mlflow_uri)
    mlflow.set_experiment(cfg.experiment_name)
    with mlflow.start_run(run_name="evaluation"):
        mlflow.log_params({"model": cfg.model_name, "dim": cfg.embedding_dim})
        mlflow.log_metrics({
            "retrieval_p_at_5": retrieval["precision_at_5"], "retrieval_mrr": retrieval["mrr"],
            "dup_nat_minilm_f1": dup_nat["minilm"]["f1"], "dup_nat_tfidf_f1": dup_nat["tfidf"]["f1"],
            "dup_derived_simonly_f1": dup_der["similarity_only"]["f1"],
            "dup_derived_gated_f1": dup_der["similarity_plus_spatial_gate"]["f1"],
            "dup_derived_gated_precision": dup_der["similarity_plus_spatial_gate"]["precision"],
        })

    print("\n=== SEMANTIC EVALUATION ===")
    print(f"Retrieval  P@5={retrieval['precision_at_5']}  MRR={retrieval['mrr']}  (n={retrieval['n']})")
    print(f"Dup natural (curated)  TF-IDF F1={dup_nat['tfidf']['f1']}  vs  MiniLM F1={dup_nat['minilm']['f1']}")
    print(f"Dup derived  sim-only F1={dup_der['similarity_only']['f1']} (P={dup_der['similarity_only']['precision']})"
          f"  vs  sim+GATE F1={dup_der['similarity_plus_spatial_gate']['f1']} (P={dup_der['similarity_plus_spatial_gate']['precision']})")
    return 0


if __name__ == "__main__":
    sys.exit(run())
