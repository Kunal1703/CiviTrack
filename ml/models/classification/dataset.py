"""Dataset loader — the swap seam for the training text source.

`load_labeled_frame` returns a tidy ``(text, category)`` DataFrame. Today
``text`` is drawn from ``cfg.text_column`` (= NYC 311 ``descriptor``). When a
richer free-text dataset becomes available, only this loader and the config's
``text_column`` need to change — the preprocessing (`text.clean_text`), the
models, and the serving path are all unaffected.
"""

from __future__ import annotations

import logging

import pandas as pd

from .config import ClassifierConfig
from .taxonomy import collapse_rare, map_to_category
from .text import clean_text

logger = logging.getLogger("classification.dataset")


def load_labeled_frame(cfg: ClassifierConfig) -> pd.DataFrame:
    """Load silver data → cleaned text + canonical category label."""
    df = pd.read_parquet(cfg.silver_path)

    missing = {cfg.text_column, cfg.label_source_column} - set(df.columns)
    if missing:
        raise KeyError(f"silver data missing required columns: {missing}")

    out = df[[cfg.text_column, cfg.label_source_column]].rename(
        columns={cfg.text_column: "text_raw", cfg.label_source_column: "raw_label"}
    )
    out = out.dropna(subset=["text_raw", "raw_label"])

    # SHARED preprocessing — identical to inference time.
    out["text"] = out["text_raw"].map(clean_text)
    out = out[out["text"].str.len() > 0]

    # Curated taxonomy + rare-category collapse.
    out["category"] = map_to_category(out["raw_label"], cfg.taxonomy_path)
    out = collapse_rare(out, cfg.min_category_support)

    result = out[["text", "category"]].reset_index(drop=True)
    logger.info(
        "Labeled frame: %s rows, %s categories", len(result), result["category"].nunique()
    )
    return result
