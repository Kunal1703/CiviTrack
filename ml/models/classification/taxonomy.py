"""Apply the curated category taxonomy to raw NYC 311 complaint types."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
import yaml

logger = logging.getLogger("classification.taxonomy")


def load_taxonomy(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def build_lookup(taxonomy: dict) -> dict[str, str]:
    """Flat, case-insensitive lookup: normalized complaint_type -> category."""
    lut: dict[str, str] = {}
    for category, raw_types in taxonomy.get("categories", {}).items():
        for raw in raw_types:
            lut[str(raw).strip().lower()] = category
    return lut


def map_to_category(raw_labels: pd.Series, taxonomy_path: Path) -> pd.Series:
    """Map raw complaint types to canonical categories (unmapped -> default)."""
    taxonomy = load_taxonomy(taxonomy_path)
    lut = build_lookup(taxonomy)
    default = taxonomy.get("default_category", "Other")
    keys = raw_labels.astype("string").str.strip().str.lower()
    mapped = keys.map(lut).fillna(default)
    return mapped.astype("string")


def collapse_rare(df: pd.DataFrame, min_support: int, default: str = "Other") -> pd.DataFrame:
    """Fold categories with fewer than ``min_support`` rows into the default."""
    counts = df["category"].value_counts()
    rare = counts[counts < min_support].index.tolist()
    if rare:
        logger.info("Collapsing %s rare categories into '%s': %s", len(rare), default, rare)
        df = df.copy()
        df.loc[df["category"].isin(rare), "category"] = default
    return df
