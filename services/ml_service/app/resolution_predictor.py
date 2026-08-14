"""M4 resolution-time predictor (serving).

Loads the LightGBM quantile boosters + the vocabulary/metadata produced by
`ml/models/resolution/run.py` (mounted read-only), rebuilds the exact training
features for a single input, and returns a calibrated interval + SHAP factors.
The feature construction here mirrors ml/models/resolution/features.py — kept in
sync by construction (same column order from meta.json).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd
import shap

NA = "__NA__"
_CATEGORICAL = ["agency", "complaint_type", "descriptor", "borough", "incident_zip"]
_GEO = ["latitude", "longitude"]
_FRIENDLY = {
    "complaint_type": "complaint type", "agency": "responsible agency",
    "descriptor": "issue descriptor", "incident_zip": "location (ZIP)",
    "borough": "borough", "month": "time of year", "dow": "day of week",
    "hour": "time of day", "latitude": "location", "longitude": "location",
}


class ResolutionPredictor:
    def __init__(self, model_dir: str) -> None:
        base = Path(model_dir)
        self.meta = json.loads((base / "meta.json").read_text())
        self.vocab = json.loads((base / "vocab.json").read_text())
        self.options = json.loads((base / "feature_options.json").read_text())
        sg = base / "shap_global.json"
        self.shap_global = json.loads(sg.read_text()) if sg.exists() else []
        self.feature_order: list[str] = self.meta["feature_order"]
        self.delta: float = float(self.meta.get("conformal_delta_log", 0.0))
        self.version: str = self.meta.get("model_version", "resolution-v1")
        self.boosters = {
            0.1: lgb.Booster(model_file=str(base / "lgb_q10.txt")),
            0.5: lgb.Booster(model_file=str(base / "lgb_q50.txt")),
            0.9: lgb.Booster(model_file=str(base / "lgb_q90.txt")),
        }
        self.explainer = shap.TreeExplainer(self.boosters[0.5])

    # ── feature build (single row) ──
    def _row(self, inp: dict[str, Any]) -> pd.DataFrame:
        ts = pd.to_datetime(inp.get("created_at")) if inp.get("created_at") else pd.Timestamp.utcnow()
        f: dict[str, float] = {}
        f["hour"] = ts.hour
        f["dow"] = ts.dayofweek
        f["is_weekend"] = 1 if ts.dayofweek >= 5 else 0
        f["month"] = ts.month
        f["day"] = ts.day
        f["hour_sin"] = math.sin(2 * math.pi * ts.hour / 24)
        f["hour_cos"] = math.cos(2 * math.pi * ts.hour / 24)
        f["dow_sin"] = math.sin(2 * math.pi * ts.dayofweek / 7)
        f["dow_cos"] = math.cos(2 * math.pi * ts.dayofweek / 7)
        f["month_sin"] = math.sin(2 * math.pi * ts.month / 12)
        f["month_cos"] = math.cos(2 * math.pi * ts.month / 12)
        for c in _CATEGORICAL:
            val = inp.get(c)
            key = NA if val is None else str(val)
            f[c] = self.vocab.get(c, {}).get(key, -1)
        for g in _GEO:
            v = inp.get(g)
            f[g] = float(v) if v is not None else np.nan
        f["geo_valid"] = 1 if (inp.get("latitude") is not None and inp.get("longitude") is not None) else 0
        return pd.DataFrame([[f[col] for col in self.feature_order]], columns=self.feature_order)

    def predict(self, inp: dict[str, Any]) -> dict[str, Any]:
        row = self._row(inp)
        qs = sorted(float(self.boosters[q].predict(row)[0]) for q in (0.1, 0.5, 0.9))
        lo_log, mid_log, hi_log = qs
        point = float(np.expm1(mid_log))
        low = float(max(0.0, np.expm1(lo_log - self.delta)))
        high = float(np.expm1(hi_log + self.delta))
        return {
            "point_hours": round(point, 1),
            "low_hours": round(low, 1),
            "high_hours": round(high, 1),
            "model_version": self.version,
            "factors": self._factors(row, inp),
        }

    def _factors(self, row: pd.DataFrame, inp: dict[str, Any], top: int = 4) -> list[dict[str, Any]]:
        sv = self.explainer.shap_values(row)[0]
        pairs = sorted(zip(self.feature_order, sv), key=lambda t: abs(t[1]), reverse=True)
        out: list[dict[str, Any]] = []
        for feat, val in pairs[:top]:
            if abs(val) < 1e-6:
                continue
            base = feat.split("_")[0] if feat.startswith(("hour", "dow", "month")) else feat
            out.append({
                "feature": _FRIENDLY.get(feat, _FRIENDLY.get(base, feat)),
                "value": inp.get(feat if feat in _CATEGORICAL else base),
                "effect": "increases" if val > 0 else "decreases",
            })
        return out

    def meta_info(self) -> dict[str, Any]:
        drivers = []
        for d in self.shap_global[:6]:
            feat = d["feature"]
            base = feat.split("_")[0] if feat.startswith(("hour", "dow", "month")) else feat
            drivers.append({
                "feature": _FRIENDLY.get(feat, _FRIENDLY.get(base, feat)),
                "weight": d["mean_abs_shap"],
            })
        return {"model_version": self.version, "options": self.options, "drivers": drivers}
