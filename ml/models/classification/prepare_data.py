"""M1 data preparation: stratified re-ingest → clean → label → gold splits.

Run from the ``ml/`` directory:

    python -m models.classification.prepare_data                 # re-ingest 12 months
    python -m models.classification.prepare_data --no-reingest   # reuse existing silver

Produces frozen, stratified train/val/test parquet files under ``data/gold/``
plus a label list and a data manifest (row counts + content hash) for
reproducibility.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys

import pandas as pd
from sklearn.model_selection import train_test_split

from data.clean import clean_bronze
from data.config import PipelineConfig
from data.ingest_stratified import fetch_stratified
from data.load import write_silver_parquet

from .config import ClassifierConfig
from .dataset import load_labeled_frame


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        stream=sys.stdout,
    )


def _hash_frame(df: pd.DataFrame) -> str:
    return hashlib.sha256(pd.util.hash_pandas_object(df, index=True).values.tobytes()).hexdigest()[:16]


def run(reingest: bool = True) -> int:
    _configure_logging()
    log = logging.getLogger("prepare_data")
    cfg = ClassifierConfig()
    pcfg = PipelineConfig()

    if reingest:
        log.info("Stratified re-ingest: %s rows/month for %s", cfg.reingest_rows_per_month, cfg.reingest_year)
        df_raw, meta = fetch_stratified(pcfg, cfg.reingest_year, cfg.reingest_rows_per_month)
        df_silver, _ = clean_bronze(df_raw)
        write_silver_parquet(df_silver, pcfg)  # overwrite canonical silver
    else:
        log.info("Skipping re-ingest; using existing silver at %s", cfg.silver_path)

    # Labeled frame (shared cleaning + taxonomy + rare-collapse).
    labeled = load_labeled_frame(cfg)

    # Stratified train/val/test split.
    holdout = cfg.test_size + cfg.val_size
    train, temp = train_test_split(
        labeled, test_size=holdout, stratify=labeled["category"], random_state=cfg.seed
    )
    rel_test = cfg.test_size / holdout
    val, test = train_test_split(
        temp, test_size=rel_test, stratify=temp["category"], random_state=cfg.seed
    )

    cfg.gold_dir.mkdir(parents=True, exist_ok=True)
    for name, part in (("train", train), ("val", val), ("test", test)):
        part.reset_index(drop=True).to_parquet(cfg.gold_dir / f"{name}.parquet", index=False)

    labels = sorted(labeled["category"].unique().tolist())
    (cfg.gold_dir / "labels.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")

    manifest = {
        "text_column": cfg.text_column,
        "label_source_column": cfg.label_source_column,
        "taxonomy_version": None,
        "n_total": len(labeled),
        "n_train": len(train),
        "n_val": len(val),
        "n_test": len(test),
        "n_categories": len(labels),
        "categories": labels,
        "content_hash": _hash_frame(labeled),
        "class_distribution": labeled["category"].value_counts().to_dict(),
    }
    (cfg.gold_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")

    log.info("Gold splits written to %s", cfg.gold_dir)
    log.info("train=%s val=%s test=%s categories=%s", len(train), len(val), len(test), len(labels))
    log.info("categories: %s", labels)
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-reingest", action="store_true", help="reuse existing silver parquet")
    args = parser.parse_args()
    raise SystemExit(run(reingest=not args.no_reingest))
