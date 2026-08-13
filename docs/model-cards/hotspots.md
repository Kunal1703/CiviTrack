# Method Card — Geospatial Hotspots · Getis-Ord Gi\* (M5)

## Method
- **Getis-Ord Gi\*** local spatial-autocorrelation statistic via **`esda.G_Local(star=True)`**
  (PySAL family), with **`libpysal`** Queen-contiguity spatial weights (row-standardized).
- Significance from **999 conditional-permutation** pseudo p-values, then
  **Benjamini–Hochberg FDR** correction across cells (α = 0.05) → confidence bands.
- **Not a machine-learning model** — a statistical hypothesis test per spatial unit.
  There are no trained parameters, no train/test split; reproducibility comes from a fixed
  permutation seed (`SEED=42`) and deterministic grid bucketing.
- **Version:** pipeline `ml.geo` v1; spatial unit `grid_1km`; method key `getis_ord_gi_star`.

## Intended use
Surface **statistically significant spatial clusters** of civic complaints — hot spots
(unusually high complaint density relative to the neighbourhood) and cold spots — as an
**admin decision-support** overlay for resource targeting and situational awareness.
Answers *"is this concentration more than chance?"*, which a raw count heatmap cannot.

**Out of scope:** causal explanation (*why* a hotspot exists); prediction/forecasting
(that is M6); any use on the sparse Delhi demo data; individual-level or address-level
targeting (the unit is a ~1 km cell, not a person or address).

## Data
- **Source:** `silver.complaints_311` — real NYC 311, 2024, **200,782 geocoded** points
  inside an NYC-proper bounding box (98.4% of the corpus geocodes).
- **Spatial unit:** regular **~1 km grid** (0.009° cells). ~1,086 non-empty cells overall
  (avg ≈ 185 complaints/cell) — dense enough for valid spatial statistics.
- **Aggregation:** integer-bucketed per-cell counts in Postgres (fast; not a spatial join),
  filterable by `complaint_type` and month.
- **No PII:** the analysis uses only aggregate per-cell counts + geometry.

## Parameters (`ml/geo/config.py`)
| Param | Value | Note |
|---|---|---|
| `CELL_SIZE_DEG` | 0.009 (~1 km) | MAUP-sensitive; 500 m is a documented swap |
| weights | Queen (8-neighbour), row-standardized | KNN=8 is a robustness alternative |
| `PERMUTATIONS` | 999 | pseudo-p resolution = 0.001 |
| `FDR_ALPHA` | 0.05 | Benjamini–Hochberg across cells |
| `TOP_CATEGORIES` | 6 | per-category hotspot surfaces |
| windows | overall + 12 monthly | for temporal stability |

## Metrics (measured — see `docs/M5_REPORT.md`)
| | Result |
|---|---|
| Overall significant cells | **272 hot / 273 cold** of 1,086 (BH-FDR α=0.05) |
| Hot vs cold vs ns raw density | 614→281 (hot) · 139 (ns) · 41→15 (cold) avg complaints/cell |
| z-score range | −0.66 … +3.48 (right-skewed, as expected for counts) |
| Temporal stability | monthly hot-cell Jaccard **mean 0.68** |
| Face validity | top hot cells in Manhattan core + South Bronx ✅ |
| Runtime | 183 s (19 Gi\* runs × 999 perms, host `.venv`) |

## Known limitations & failure modes
- **MAUP** — results depend on cell size/shape; the 1 km / Queen choice is reported, not
  claimed uniquely correct (500 m / KNN documented as robustness checks).
- **Permutation p-floor** — with 999 permutations the finest **99% band vanishes on sparse
  per-category surfaces** (few cells reach p=0.001; BH inflates across ~600–975 cells). A
  deliberate compute/resolution trade-off; 9,999 perms would restore it at ~10× cost.
- **Count-data skew** — cold spots show only modest negative z (counts floored at 0);
  their significance comes from the permutation test, not the analytical z.
- **Edge effects** at the grid boundary; **self-weight inference** — for `star=True` with
  row-standardized weights, esda assigns the focal cell the row-max weight (standard).
- **Static snapshot** — batch recompute, no live streaming.
- **Where, not why** — Gi\* localizes clusters; it does not explain or predict them.

## Ethical considerations & honesty
- **NYC 311 only.** Presented in the admin UI as *"NYC 311 spatial analysis"*. The Delhi
  product map (seeded ~46-point demo) is **too sparse for Gi\*** and keeps its simple count
  heat, clearly labeled demo. NYC hotspots are **never** relabeled as Delhi, and seeded
  demo data is **never** presented as real government complaints.
- **Advisory, aggregate, ~1 km.** A cell is a coarse area, not an address or person — the
  output supports resource allocation, not enforcement against individuals.
- A hotspot reflects **complaint-reporting** density, which can encode reporting-behaviour
  bias (some communities report more), not only underlying conditions — to be read as
  "where complaints concentrate," not "where problems objectively are worst."

## Serving
- **Storage:** `geo.hotspots` (migration `0008`) — method, spatial_unit, cell_key, category,
  window_label, count, gi_z, p_value, significance, centroid + cell geometry (SRID 4326).
- **API:** gateway `GET /api/v1/hotspots`, `/hotspots/meta` — **admin-only** (`require_admin`);
  reads precomputed rows. The gateway holds **no** `libpysal`/`esda` dependency.
- **UI:** admin `/admin/hotspots` — Gi\* cells shaded by confidence band, p-value on click,
  category/month filters. Recompute: `python -m ml.geo.run`.
