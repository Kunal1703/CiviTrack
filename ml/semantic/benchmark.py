"""Phase 2 — embedding model benchmark.

Compares the classical baseline (TF-IDF cosine) against sentence-transformer
models on the NATURAL-LANGUAGE tracks (curated + synthetic), because 311
descriptors are categorical and cannot discriminate embedding quality.

Decisive metric: **paraphrase similarity** on the synthetic track — a paraphrase
shares almost no tokens with the original, so TF-IDF scores near zero while a
good embedding scores high. That gap is the value of semantic embeddings.

Run from ml/:  python -m semantic.benchmark
"""

from __future__ import annotations

import json
import logging
import sys

import mlflow
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import roc_auc_score
from sklearn.metrics.pairwise import cosine_similarity

from semantic.config import SemanticConfig
from semantic.embedder import Embedder
from semantic.normalize import embed_normalize

log = logging.getLogger("semantic.benchmark")

CANDIDATES = [
    "sentence-transformers/all-MiniLM-L6-v2",
    "BAAI/bge-small-en-v1.5",
]


def _load(cfg: SemanticConfig):
    base = cfg.eval_dir.parent
    curated = [json.loads(x) for x in (base / "curated_pairs.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    synth = [json.loads(x) for x in (cfg.eval_dir / "synthetic_pairs.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    return curated, synth


def _pair_sims(model_fn, pairs) -> np.ndarray:
    a = [p["text_a"] for p in pairs]
    b = [p["text_b"] for p in pairs]
    ea, eb = model_fn(a), model_fn(b)
    return np.sum(ea * eb, axis=1) / (np.linalg.norm(ea, axis=1) * np.linalg.norm(eb, axis=1) + 1e-9)


def _tfidf_fn(corpus):
    vec = TfidfVectorizer(ngram_range=(1, 2)).fit([embed_normalize(t) for t in corpus])
    return lambda texts: vec.transform([embed_normalize(t) for t in texts]).toarray()


def _evaluate(name, encode_fn, curated, synth) -> dict:
    # curated: duplicate=1, related/different=0
    cur_sim = _pair_sims(encode_fn, curated)
    cur_lab = np.array([1 if p["label"] == "duplicate" else 0 for p in curated])
    auc = float(roc_auc_score(cur_lab, cur_sim)) if len(set(cur_lab)) > 1 else float("nan")
    by = {}
    for cls in ("duplicate", "related", "different"):
        s = [cur_sim[i] for i, p in enumerate(curated) if p["label"] == cls]
        by[cls] = round(float(np.mean(s)), 4) if s else None
    para = _pair_sims(encode_fn, synth)
    res = {
        "model": name,
        "curated_auc": round(auc, 4),
        "curated_mean_sim_duplicate": by["duplicate"],
        "curated_mean_sim_related": by["related"],
        "curated_mean_sim_different": by["different"],
        "synthetic_paraphrase_mean_sim": round(float(np.mean(para)), 4),
    }
    log.info("%s", json.dumps(res))
    return res


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    cfg = SemanticConfig()
    curated, synth = _load(cfg)
    corpus = [p["text_a"] for p in curated + synth] + [p["text_b"] for p in curated + synth]

    mlflow.set_tracking_uri(cfg.mlflow_uri)
    mlflow.set_experiment(cfg.experiment_name)

    results = []
    # Baseline
    with mlflow.start_run(run_name="benchmark-tfidf"):
        r = _evaluate("tfidf", _tfidf_fn(corpus), curated, synth)
        mlflow.log_params({"model_type": "tfidf"})
        mlflow.log_metrics({k: v for k, v in r.items() if isinstance(v, (int, float)) and v == v})
        results.append(r)

    # Transformer candidates (skip any that fail to load/download)
    for model_name in CANDIDATES:
        try:
            emb = Embedder(model_name)
        except Exception as exc:  # noqa: BLE001
            log.warning("Skipping %s (load failed: %s)", model_name, exc)
            continue
        with mlflow.start_run(run_name=f"benchmark-{model_name.split('/')[-1]}"):
            r = _evaluate(model_name, lambda t: emb.encode(t), curated, synth)
            r["dim"] = emb.dim
            mlflow.log_params({"model_type": "sentence-transformer", "model_name": model_name, "dim": emb.dim})
            mlflow.log_metrics({k: v for k, v in r.items() if isinstance(v, (int, float)) and v == v})
            results.append(r)

    cfg.reports_dir.mkdir(parents=True, exist_ok=True)
    (cfg.reports_dir / "benchmark.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("\n=== BENCHMARK SUMMARY ===")
    for r in results:
        print(f"{r['model']:45s} AUC={r['curated_auc']} paraphrase_sim={r['synthetic_paraphrase_mean_sim']} "
              f"(dup={r['curated_mean_sim_duplicate']} rel={r['curated_mean_sim_related']} diff={r['curated_mean_sim_different']})")
    return 0


if __name__ == "__main__":
    sys.exit(run())
