"""Build the reproducible semantic evaluation dataset.

Produces (under ml/semantic/evaluation/datasets/, git-committed as small metadata):
  * dup_pairs.jsonl       — labeled duplicate/not-duplicate pairs, provenance-tagged
  * retrieval.jsonl       — retrieval judgments (query → known-relevant complaint id)
  * synthetic_pairs.jsonl — deterministic paraphrase positives (clearly SYNTHETIC)
  * eval_manifest.json    — counts + provenance breakdown

Provenance tags (never conflated):
  * "derived-real" — pairs inferred from real 311 co-location/co-time signals (not hand-verified)
  * "curated"      — hand-written citizen-phrasing pairs (ml/semantic/evaluation/curated_pairs.jsonl)
  * "synthetic"    — template paraphrases (supplementary benchmark only)

Run from ml/:  python -m semantic.evaluation.build_eval
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from semantic.config import SemanticConfig

SEED = 42

# Many 311 descriptors are cryptic codes ("1 or 2", "N/A") rather than natural
# language. Restrict derived pairs to real phrases so the duplicate-gate track
# isn't dominated by degenerate identical codes. (Embedding *quality* is judged
# on the curated + synthetic natural-language tracks.)
_CODE = re.compile(r"^[\d\s\-/.]+$")


def _is_phrase(d: str) -> bool:
    d = str(d).strip()
    return len(d) >= 12 and " " in d and not _CODE.match(d) and any(c.isalpha() for c in d)
N_POS = 400          # derived-real duplicate positives
N_NEG_FAR = 300      # same descriptor, far apart → NOT duplicate (tests spatial gate)
N_NEG_DIFF = 300     # different category → NOT duplicate
N_SYNTH = 150        # synthetic paraphrase positives


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _paraphrase(text: str) -> str:
    t = text.strip().lower()
    return f"i am reporting a problem with {t} in my neighborhood"


def build() -> int:
    cfg = SemanticConfig()
    rng = np.random.default_rng(SEED)
    df = pd.read_parquet(cfg.silver_path)
    df = df[[
        "unique_key", "descriptor", "complaint_type", "latitude", "longitude", "created_date", "geo_valid"
    ]].dropna(subset=["descriptor", "unique_key"])
    df = df[df["descriptor"].str.len() > 0]
    df = df[df["descriptor"].map(_is_phrase)].reset_index(drop=True)
    geo = df[df["geo_valid"] == True].dropna(subset=["latitude", "longitude", "created_date"]).copy()
    geo["created_date"] = pd.to_datetime(geo["created_date"])
    geo["latr"] = geo["latitude"].round(3)
    geo["lonr"] = geo["longitude"].round(3)

    pairs: list[dict] = []
    retrieval: list[dict] = []

    # ── Positives: same descriptor + same ~100m cell + close in time ──
    grp = geo.groupby(["descriptor", "latr", "lonr"])
    pos = 0
    for _, g in grp:
        if len(g) < 2 or pos >= N_POS:
            continue
        g = g.sort_values("created_date")
        rows = g.to_dict("records")
        for a, b in zip(rows, rows[1:]):
            if pos >= N_POS:
                break
            dt_h = abs((b["created_date"] - a["created_date"]).total_seconds()) / 3600.0
            dist = _haversine_m(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
            if dt_h <= cfg.dup_time_hours and dist <= cfg.dup_radius_m and a["unique_key"] != b["unique_key"]:
                pairs.append({
                    "id_a": a["unique_key"], "id_b": b["unique_key"],
                    "text_a": a["descriptor"], "text_b": b["descriptor"],
                    "label": "duplicate", "relation": "near-duplicate",
                    "distance_m": round(dist, 1), "time_hours": round(dt_h, 1),
                    "source": "derived-real",
                })
                retrieval.append({
                    "query_id": a["unique_key"], "query_text": a["descriptor"],
                    "relevant_id": b["unique_key"], "source": "derived-real",
                })
                pos += 1

    # ── Hard negatives: SAME descriptor, FAR apart (>1km) → different incidents ──
    negf = 0
    for _, g in geo.groupby("descriptor"):
        if len(g) < 2 or negf >= N_NEG_FAR:
            continue
        rows = g.sample(min(len(g), 6), random_state=SEED).to_dict("records")
        for a in rows:
            for b in rows:
                if negf >= N_NEG_FAR or a["unique_key"] == b["unique_key"]:
                    continue
                dist = _haversine_m(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
                if dist > 1000:
                    pairs.append({
                        "id_a": a["unique_key"], "id_b": b["unique_key"],
                        "text_a": a["descriptor"], "text_b": b["descriptor"],
                        "label": "not_duplicate", "relation": "same-category-far",
                        "distance_m": round(dist, 1), "source": "derived-real",
                    })
                    negf += 1
                    break

    # ── Easy negatives: different complaint_type ──
    a_idx = rng.choice(len(df), size=N_NEG_DIFF * 3, replace=False)
    b_idx = rng.choice(len(df), size=N_NEG_DIFF * 3, replace=False)
    negd = 0
    for i, j in zip(a_idx, b_idx):
        if negd >= N_NEG_DIFF:
            break
        a, b = df.iloc[int(i)], df.iloc[int(j)]
        if a["complaint_type"] != b["complaint_type"] and a["unique_key"] != b["unique_key"]:
            pairs.append({
                "id_a": a["unique_key"], "id_b": b["unique_key"],
                "text_a": a["descriptor"], "text_b": b["descriptor"],
                "label": "not_duplicate", "relation": "different",
                "source": "derived-real",
            })
            negd += 1

    # ── Synthetic paraphrase positives (clearly labeled) ──
    synth: list[dict] = []
    sample = df.drop_duplicates("descriptor").sample(min(N_SYNTH, df["descriptor"].nunique()), random_state=SEED)
    for _, r in sample.iterrows():
        synth.append({
            "id_a": r["unique_key"], "text_a": r["descriptor"],
            "text_b": _paraphrase(r["descriptor"]),
            "label": "duplicate", "relation": "paraphrase", "source": "synthetic",
        })

    # ── Write ──
    out = cfg.eval_dir
    out.mkdir(parents=True, exist_ok=True)
    _write_jsonl(out / "dup_pairs.jsonl", pairs)
    _write_jsonl(out / "retrieval.jsonl", retrieval)
    _write_jsonl(out / "synthetic_pairs.jsonl", synth)

    manifest = {
        "seed": SEED,
        "source_column": cfg.source_column,
        "dup_radius_m": cfg.dup_radius_m,
        "dup_time_hours": cfg.dup_time_hours,
        "counts": {
            "positives_derived_real": sum(p["label"] == "duplicate" for p in pairs),
            "negatives_same_category_far": sum(p["relation"] == "same-category-far" for p in pairs),
            "negatives_different": sum(p["relation"] == "different" for p in pairs),
            "retrieval_queries": len(retrieval),
            "synthetic_positives": len(synth),
        },
        "provenance": ["derived-real", "curated", "synthetic"],
        "note": "Synthetic pairs are a supplementary benchmark, NOT real-world ground truth.",
    }
    (out / "eval_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(f"Wrote eval datasets to {out}")
    return 0


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, default=str) + "\n")


if __name__ == "__main__":
    sys.exit(build())
