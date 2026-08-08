"""Phase 7 — semantic clustering (offline, analytical).

Clusters the UNIQUE descriptor embeddings (categorical data → hundreds of unique
vectors). HDBSCAN is primary (variable density, labels noise, no k); K-Means is a
documented baseline. PCA gives 2-D coords for the admin explorer (visualization
ONLY — never the clustering algorithm). Metrics: silhouette, Davies-Bouldin,
size distribution, noise ratio, + qualitative exemplars.

Honest limitation: civic-complaint clusters largely track the category taxonomy;
interpretability is limited. Reported, not oversold.

Run from ml/ (after embeddings + migration 0003):  python -m semantic.cluster
"""

from __future__ import annotations

import json
import logging
import sys

import mlflow
import numpy as np
import pandas as pd
import psycopg
from sklearn.cluster import HDBSCAN, KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import davies_bouldin_score, silhouette_score

from semantic.config import SemanticConfig
from semantic.embedder import Embedder
from semantic.normalize import embed_normalize

log = logging.getLogger("semantic.cluster")


def _pg(cfg):
    return psycopg.connect(host=cfg.postgres_host, port=cfg.postgres_port, dbname=cfg.postgres_db,
                           user=cfg.postgres_user, password=cfg.postgres_password, autocommit=True)


def _quality(X, labels) -> dict:
    mask = labels >= 0  # exclude noise
    uniq = set(labels[mask])
    if len(uniq) < 2 or mask.sum() < 3:
        return {"silhouette": None, "davies_bouldin": None}
    return {
        "silhouette": round(float(silhouette_score(X[mask], labels[mask])), 4),
        "davies_bouldin": round(float(davies_bouldin_score(X[mask], labels[mask])), 4),
    }


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    cfg = SemanticConfig()
    df = pd.read_parquet(cfg.silver_path)[[cfg.source_column]].dropna()
    texts = sorted({embed_normalize(t) for t in df[cfg.source_column] if str(t).strip()})
    emb = Embedder(cfg.model_name, normalize=cfg.normalize_embeddings)
    X = emb.encode(texts, batch_size=cfg.batch_size)
    log.info("clustering %s unique descriptor embeddings", len(texts))

    hdb = HDBSCAN(min_cluster_size=5, metric="euclidean").fit(X)
    hl = hdb.labels_
    n_clusters = len(set(hl[hl >= 0]))
    noise = float((hl == -1).mean())

    km = KMeans(n_clusters=min(15, len(texts) // 3), random_state=42, n_init=10).fit(X)
    kl = km.labels_

    hq, kq = _quality(X, hl), _quality(X, kl)
    sizes = pd.Series(hl[hl >= 0]).value_counts().to_dict()

    # exemplars: a few descriptors per HDBSCAN cluster
    exemplars = {}
    for c in sorted(set(hl[hl >= 0]))[:12]:
        exemplars[int(c)] = [texts[i] for i in np.where(hl == c)[0][:4]]

    # PCA 2-D for viz + persist
    xy = PCA(n_components=2, random_state=42).fit_transform(X)
    with _pg(cfg) as conn:
        conn.execute("TRUNCATE semantic.descriptor_clusters")
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO semantic.descriptor_clusters (descriptor, cluster_id, cluster_label, method, x, y) "
                "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (descriptor) DO NOTHING",
                [(texts[i], int(hl[i]), (exemplars.get(int(hl[i]), [texts[i]])[0] if hl[i] >= 0 else "noise"),
                  "hdbscan", float(xy[i, 0]), float(xy[i, 1])) for i in range(len(texts))],
            )

    report = {
        "n_unique_descriptors": len(texts),
        "hdbscan": {"n_clusters": n_clusters, "noise_ratio": round(noise, 4), **hq,
                    "size_distribution": {str(k): int(v) for k, v in sizes.items()}},
        "kmeans_baseline": {"k": int(km.n_clusters), **kq},
        "exemplars": exemplars,
        "limitation": "Clusters largely track the category taxonomy; interpretability is limited.",
    }
    cfg.reports_dir.mkdir(parents=True, exist_ok=True)
    (cfg.reports_dir / "clustering.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    mlflow.set_tracking_uri(cfg.mlflow_uri)
    mlflow.set_experiment(cfg.experiment_name)
    with mlflow.start_run(run_name="clustering"):
        mlflow.log_params({"algo_primary": "hdbscan", "min_cluster_size": 5, "kmeans_k": int(km.n_clusters)})
        mlflow.log_metrics({
            "hdbscan_n_clusters": n_clusters, "hdbscan_noise_ratio": noise,
            "hdbscan_silhouette": hq["silhouette"] or 0.0, "kmeans_silhouette": kq["silhouette"] or 0.0,
        })

    print(f"HDBSCAN: {n_clusters} clusters, noise={noise:.2%}, silhouette={hq['silhouette']}, DB={hq['davies_bouldin']}")
    print(f"KMeans(k={km.n_clusters}) baseline: silhouette={kq['silhouette']}, DB={kq['davies_bouldin']}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
