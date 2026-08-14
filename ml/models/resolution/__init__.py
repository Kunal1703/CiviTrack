"""M4 — resolution-time regression (NYC 311).

Predict resolution_hours (log1p target) on closed complaints, with a strong
agency×category-median baseline, LightGBM quantile models for point + interval,
and SHAP explanations. Design: docs/M4_DESIGN.md.
"""
