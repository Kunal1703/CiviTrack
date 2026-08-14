# M5 — Geospatial Hotspots (Getis-Ord Gi\*) · Measured Report

> **Status:** ✅ Implemented, executed, and verified against the live database
> (2026-08-14). All numbers below are **measured** from an actual pipeline run,
> not projected. Companion: `docs/M5_DESIGN.md` (design), `docs/model-cards/hotspots.md`
> (method card). Results are **NYC 311 spatial analysis** — never Delhi (§ Honesty).

---

## 1. What was built

An offline batch job (`ml/geo/`, run as `python -m ml.geo.run`) that:

1. Buckets the **real NYC 311** corpus into a regular **~1 km grid** (0.009° cells)
   over an NYC-proper bounding box, in Postgres.
2. Builds **Queen (8-neighbour) contiguity weights** with `libpysal` (row-standardized).
3. Computes **Getis-Ord Gi\*** with `esda.G_Local(star=True, permutations=999)` →
   a z-score and conditional-permutation pseudo p-value per cell.
4. Applies **Benjamini–Hochberg FDR** correction across cells (α = 0.05) and classifies
   each cell into confidence bands: `hot_99 / hot_95 / hot_90 / cold_* / ns`.
5. Runs this **overall**, for the **top-6 complaint types**, and for **12 monthly
   windows** (for temporal stability), writing every count>0 cell to `geo.hotspots`.

Results are served read-only through an admin-only gateway API
(`GET /api/v1/hotspots`, `/hotspots/meta`) and rendered on an admin **"Hotspot
intelligence"** map (`/admin/hotspots`), clearly labeled *NYC 311 spatial analysis*.

---

## 2. Data (measured, live DB)

| Fact | Value |
|---|---|
| Source | `silver.complaints_311` (NYC 311, 2024) |
| Geocoded complaints inside the NYC bounding box | **200,782** |
| Spatial unit | regular grid, cell = **0.009°** (~1 km) |
| Non-empty cells (overall) | **1,086** (avg ≈ 185 complaints/cell) |
| Study area for weights | non-empty cells **+ their 8-neighbours** (zero-count context) |
| Bounding box | `-74.30 … -73.65` lon, `40.45 … 40.95` lat |

## 3. Headline result — overall Gi\* (all complaints, full year)

**1,086 cells** classified. Significant cells (BH-FDR, α = 0.05):

| Band | Cells | Avg complaints/cell | p-value range (FDR) |
|---|---:|---:|---|
| **hot_99** | **94** | 614 | 0.0076 |
| **hot_95** | **109** | 371 | 0.012 – 0.050 |
| **hot_90** | **69** | 281 | 0.052 – 0.099 |
| cold_90 | 122 | 41 | 0.052 – 0.099 |
| cold_95 | 123 | 20 | 0.012 – 0.050 |
| cold_99 | 28 | 15 | 0.0076 |
| ns (not significant) | 541 | 139 | 0.10 – 0.50 |
| **Total hot / cold / ns** | **272 / 273 / 541** | | |

**z-score range:** −0.66 … +3.48. The distribution is **right-skewed** — expected
for count data floored at zero: a dense cell can spike far above its neighbourhood
(large positive z), while a low-count cluster can only sink so far (modest negative
z). Cold-spot *significance* still comes through correctly via the permutation test,
not the analytical z.

The **avg-complaints column tells the validation story on its own**: hot bands average
614 → 371 → 281 complaints/cell, non-significant 139, cold bands 41 → 20 → 15 — a
clean monotonic gradient from hot to cold. Gi\* is separating genuine high-value
clusters from their surroundings, not just re-printing the raw counts (many
high-count cells land in `ns` because their neighbours are equally busy).

### Strongest hotspots (top by z), with face validity

| Cell centroid (lat, lon) | Complaints | Gi\* z | Locale (NYC) |
|---|---:|---:|---|
| 40.733, −73.989 | 724 | 3.47 | Manhattan — Gramercy / East Village |
| 40.860, −73.900 | 1,229 | 3.40 | Bronx — Fordham / Belmont |
| 40.815, −73.944 | 1,201 | 3.27 | Manhattan — Harlem |
| 40.842, −73.918 | 886 | 3.04 | Bronx — Highbridge / Concourse |
| 40.860, −73.909 | 922 | 3.03 | Bronx — Fordham |

All top hot cells fall in dense, high-complaint boroughs (Manhattan core + South/Central
Bronx) — the **face-validity check passes**.

## 4. Per-category hotspots (top-6 complaint types)

Each complaint type produces a spatially distinct hotspot pattern:

| Complaint type | Cells | hot_95 | hot_90 | cold_95 | cold_90 |
|---|---:|---:|---:|---:|---:|
| Illegal Parking | 975 | 22 | 111 | 7 | 110 |
| Noise - Residential | 860 | 68 | 117 | 29 | 73 |
| HEAT/HOT WATER | 678 | 83 | 44 | 32 | 37 |
| Blocked Driveway | 810 | 8 | 215 | 13 | 97 |
| Noise - Street/Sidewalk | 692 | 72 | 15 | 46 | 28 |
| UNSANITARY CONDITION | 613 | 89 | 24 | 30 | 25 |

**Honest statistical note:** every per-category run shows **hot_99 = 0**. This is a
real property of the method, not a bug. With fewer points per category, few cells
reach the permutation p-floor of 1/(999+1) = 0.001, and after BH-FDR correction across
~600–975 cells no cell's adjusted p drops below 0.01 — so per-category signal correctly
lands in the 95/90 bands. Raising `PERMUTATIONS` (e.g. 9,999) would restore a 99% band
here at ~10× compute; 999 is the standard default and sufficient for the headline
overall surface (which has enough density to populate hot_99).

## 5. Temporal stability (per-month Gi\*)

Gi\* was recomputed for each of the **12 monthly windows** of 2024. Stability is the
**Jaccard overlap of the significant-hot-cell set between consecutive months**:

- **Consecutive Jaccard:** 0.68, 0.75, 0.79, 0.76, 0.69, 0.70, 0.72, 0.63, 0.63, 0.61, 0.59
- **Mean = 0.684**

A mean Jaccard of **0.68** means roughly two-thirds of hot cells persist month-to-month
— the hotspots are **stable, credible structure**, not month-to-month noise (which would
sit near 0). The gentle decline across the year is consistent with seasonal complaint mix
(e.g. HEAT/HOT WATER in winter vs. noise in summer).

## 6. Validation summary (per BLUEPRINT §29)

| Check | Result |
|---|---|
| Significant hot / cold cells (overall) | 272 hot / 273 cold of 1,086 |
| p-value distribution | continuous 0.0076 → 0.50; 99-band cells at the FDR floor |
| z-score range | −0.66 … +3.48 (right-skewed, as expected for counts) |
| Hot/cold ↔ raw density monotonicity | ✅ 614→281 (hot) vs 41→15 (cold), ns 139 |
| Temporal stability (monthly Jaccard) | ✅ mean 0.68 |
| Face validity (dense boroughs) | ✅ top cells in Manhattan core + South Bronx |
| Runtime (19 Gi\* runs, 999 perms each) | **183 s** on host `.venv` |

## 7. Serving & UI (verified end-to-end)

- **API:** `GET /api/v1/hotspots?category=&window=&significance=&limit=` and
  `/hotspots/meta` — **admin-only** (`require_admin`), reads `geo.hotspots`, returns each
  cell's centroid + lat/lon bounding box (regular grid → axis-aligned rectangle) + z /
  p / band. Verified: **anon → 401, citizen → 403, admin → 200**.
- **UI:** `/admin/hotspots` renders significant Gi\* cells as rectangles shaded by
  confidence band (diverging red→blue), p-value + z-score on click, filterable by
  category and month, with a significance tally and "strongest hotspots" list. Prominent
  **"NYC 311 spatial analysis"** provenance banner. The Delhi product map (`/admin/map`,
  `/citizen/*`) is **unchanged**.
- The gateway owns **no** spatial-statistics code — `libpysal`/`esda` live only in the
  `ml/` batch env; the service reads precomputed rows.

## 8. Honesty & limitations

- **NYC-only.** Gi\* runs on the real NYC 311 corpus, the only data dense enough for
  valid spatial statistics. The **Delhi demo map (~46 seeded points) is far too sparse**
  for Gi\* and is left with its existing count-based heat, clearly labeled demo data.
  NYC results are **never** relabeled as Delhi.
- **MAUP** (modifiable areal unit problem): results depend on the ~1 km cell size and
  Queen weights. A 500 m grid and KNN weights are documented robustness swaps (design §10);
  the 1 km / Queen choice is reported, not claimed uniquely correct.
- **Permutation p-floor (999 perms)** caps the finest band for sparse (per-category)
  surfaces — see §4. A deliberate compute/resolution trade-off.
- **Gi\* finds *where*, not *why*.** Pairing with category/time filters is what makes it
  actionable; it does not explain causes.
- **Static snapshot.** Recompute is a manual/scheduled batch job (no Worker service, by
  design — consistent with M3 clustering).
- **Edge effects** at the grid boundary and **self-weight inference** (esda assigns the
  focal cell the row-max weight for `star=True`) are standard Gi\* caveats, noted for
  reproducibility.

## 9. Reproduce

```bash
# 1. Apply the migration (creates schema geo + geo.hotspots / geo.incident_clusters)
POSTGRES_PORT=5433 .venv/Scripts/python.exe db/migrate.py up

# 2. Run the Gi* batch (overall + top-6 categories + 12 months); writes geo.hotspots
PYTHONIOENCODING=utf-8 POSTGRES_PORT=5433 .venv/Scripts/python.exe -m ml.geo.run
# → metrics written to ml/geo/reports/metrics.json
```
Deterministic: fixed `SEED=42` for the permutation RNG; re-running reproduces the bands.
