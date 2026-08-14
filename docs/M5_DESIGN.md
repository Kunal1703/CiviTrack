# M5 — Geospatial Intelligence: Hotspots + Spatial Clustering · Technical Design

> **Status:** Design proposal — **implementation NOT started; awaiting approval.**
> **Mission:** Turn 200k points on a map into **statistically-grounded** operational
> intelligence — *significant* complaint hotspots (with p-values), not naive
> colored circles.
> **Source of truth:** `docs/BLUEPRINT.md` (M5 milestone; §21 clustering; §29 metrics)
> and `docs/PROJECT_CONTEXT.md`. Depends on **M0** (PostGIS) and **M3** (spatial gate).
> **Scope guard:** geospatial only. No M6/M7, no LLM.
>
> **Measured facts (live DB, 2026-08-08):** 204,000 complaints, **200,782 geocoded
> (98.4%)**; **247** distinct `incident_zip`, **5** boroughs, **171** complaint types;
> **PostGIS 3.4.3** (has `ST_SquareGrid`/`ST_HexagonGrid`); created 2024-01→12.
> Density is ample for Gi\* (~200k points over ~1,600 1-km cells ≈ ~125/cell).

---

## 0. The three facts that shape M5

### Fact 1 — We have real coordinates at scale.
98.4% geocoded, city-wide, over a full year → enough density for meaningful spatial
statistics (unlike a toy dataset where every "hotspot" is noise).

### Fact 2 — "Hotspot" must mean *statistically significant*, not just "many points".
A high raw count can occur by chance in a busy area. **Getis-Ord Gi\*** answers the
right question: *is this location a statistically significant cluster of high values,
accounting for its neighbours?* — producing a z-score and p-value per unit. This is
what an actual urban analyst uses, and it's the milestone's exit criterion
("significant hotspots with p-values"). Naive radius/count heatmaps are explicitly
what M5 replaces.

### Fact 3 — NYC data is the analytical corpus; Delhi demo data is too sparse for Gi\*.
Gi\* on the **real NYC 311** corpus yields meaningful hotspots (the data-science
artifact). The product's **Delhi demo map** has ~46 seeded points — far too sparse
for valid spatial statistics. So (mirroring M4's honesty) M5 hotspots are an
**admin, NYC-labeled** intelligence view; the Delhi product map keeps its existing
simple count heatmap, clearly a demo. We will **not** present Gi\* results as Delhi
hotspots.

---

## 1. Problem statement

Given geocoded complaints, produce:
1. **Hotspots** — spatial units that are statistically significant high-complaint
   clusters (Gi\* z-score + p-value), optionally per category and per time window.
2. **Incident clusters** — groups of nearby complaints (density-based) that likely
   represent the same locale/problem area.
…served to an admin geospatial view and recomputed by an offline batch job.

## 2. Spatial units (the key modelling choice)

- **Primary: a regular ~1 km grid** via PostGIS `ST_SquareGrid` over the NYC bounding
  box (SRID 4326; ~1 km ≈ 0.009°, or project to 3857 for true metric cells). Regular
  cells give clean, well-defined **contiguity weights** for Gi\* and a natural map
  render. ~1,600 cells, ~125 complaints/cell average — dense enough.
- **Alternative: ZIP codes** (247 units, present 99%) — administratively meaningful,
  but irregular area/shape complicates the weights and comparability. Offered as a
  secondary view, not primary.
- Cell size is a tunable (500 m ↔ 1 km); chosen by inspecting cell-count stability,
  documented. Hexagons (`ST_HexagonGrid`) are a drop-in alternative (uniform
  adjacency) — evaluated, one chosen.

## 3. Method — Getis-Ord Gi\* (esda / PySAL)

1. **Aggregate** complaint counts per cell (overall, and optionally per
   `complaint_type` and per time window) — in PostGIS.
2. **Spatial weights** with **libpysal** — Queen contiguity on the grid (or KNN=8 as a
   robustness check). Row-standardized.
3. **Gi\*** with **esda** `G_Local(..., star=True)` → z-scores + p-values per cell.
4. **Multiple-testing correction** — FDR (Benjamini–Hochberg) or Bonferroni across
   cells; classify **significant hot / cold spots** at a corrected α (e.g. 0.05) into
   confidence bands (90/95/99%), the standard "Gi\* hot-spot" output.
5. **Per-category hotspots** (optional, high value): run Gi\* per major
   `complaint_type` → "pothole hotspots" vs "noise hotspots" differ spatially.

## 4. Spatial incident clustering (secondary)

- **DBSCAN on coordinates** (haversine metric, e.g. eps≈150–300 m, min_samples tuned)
  → raw density clusters of nearby complaints ("incident areas"). HDBSCAN as an
  alternative (no eps, variable density). Note: **distinct from M3's descriptor/
  semantic clustering** — M5 clusters by *location*.
- Output per-cluster: centroid, member count, dominant category, bbox.
- Kept lighter than Gi\* (Gi\* is the headline); can be v1.1 if time-boxed.

## 5. Validation & metrics (per BLUEPRINT §29)

- **Statistical:** number of significant hot/cold cells; p-value distribution;
  z-score range.
- **Spatial stability across time windows:** Jaccard overlap of the significant-cell
  set month-to-month (stable hotspots are credible; flickering ones are noise).
- **Face validity:** do hot cells coincide with known high-complaint areas / dense
  boroughs? Qualitative check, reported honestly.
- **Weights robustness:** Queen vs KNN agreement on the significant set.

## 6. Architecture (no Worker service — offline batch, like M3 clustering)

The blueprint imagined a Worker for async recompute; the real stack has none, so M5
runs as a **reproducible CLI batch job** (`python -m ml.geo.hotspots`) that reads
`silver.complaints_311`, computes Gi\* (+ clusters), and **writes results to Postgres**.
Recompute is manual/scheduled (documented); no new long-running service. New Python
deps (**libpysal, esda**) live in the ml/ training env only — **not** in gateway/
ml_service (they read precomputed rows).

```
silver.complaints_311 ──► PostGIS grid + counts ──► libpysal weights ──► esda Gi*
                                                                        │ (+ DBSCAN clusters)
                                                                        ▼
                          geo.hotspots / geo.incident_clusters  ──► gateway /api/v1/hotspots (admin)
                                                                        ▼
                                                        Admin "Hotspot intelligence" map (NYC-labeled)
```

## 7. Storage (numbered migration `0008`, new `geo` schema)

```sql
CREATE SCHEMA geo;
CREATE TABLE geo.hotspots (
  id BIGSERIAL PRIMARY KEY,
  method TEXT,                    -- 'getis_ord_gi_star'
  spatial_unit TEXT,             -- 'grid_1km' | 'zip'
  cell_key TEXT,                 -- grid i/j or zip
  category TEXT,                 -- NULL = all complaints
  window_label TEXT,             -- 'all_2024' | '2024-06' …
  count INT,
  gi_z DOUBLE PRECISION,
  p_value DOUBLE PRECISION,
  significance TEXT,             -- 'hot_99'|'hot_95'|'hot_90'|'cold_*'|'ns'
  centroid geometry(Point,4326),
  cell geometry(Polygon,4326),
  computed_at TIMESTAMPTZ DEFAULT now()
);
-- + GiST index on cell/centroid; btree on (category, window_label, significance).
-- geo.incident_clusters (optional): centroid, member_count, dominant_category, bbox.
```
Reversible `.down.sql`. No FK to silver (rebuildable), consistent with M3.

## 8. Serving & UI

- **gateway:** `GET /api/v1/hotspots?category=&window=&significance=&limit=` (**admin-
  only**, server-side) → significant cells (centroid/cell geom, z, p, count, band).
  Optionally `GET /api/v1/hotspots/clusters`. Reads `geo.*`; 503-degrades if empty.
- **Admin UI:** a **"Hotspot intelligence"** view (new `/admin/hotspots`, or a mode on
  `/admin/map`) rendering significant Gi\* cells shaded by confidence band, p-value on
  click, filterable by category/time window — **clearly labeled "NYC 311 spatial
  analysis"**. The existing Delhi product map (simple counts) is unchanged.

## 9. Repository changes

```
ml/geo/                         # NEW
  ├── config.py, grid.py (PostGIS grid + counts), weights.py, gi_star.py (esda),
  ├── clusters.py (DBSCAN), evaluate.py (stability/metrics), run.py (batch → DB)
db/migrations/0008_geo_hotspots.{up,down}.sql
services/gateway/app/{routers,schemas}/hotspots.py + main wiring
frontend/app/admin/hotspots/ (or map mode) + components/admin/hotspot-*.tsx + lib/hotspots-api.ts
docs/model-cards/hotspots.md (method card) + docs/M5_REPORT.md (measured)
ml/requirements-ml.txt += libpysal, esda
```

## 10. Risks & honest limitations

- **MAUP** (modifiable areal unit problem): results depend on cell size/shape —
  reported; we test 500 m/1 km and Queen/KNN for robustness.
- **Edge effects** at the grid boundary; **multiple testing** (addressed via FDR).
- **NYC-only**: not valid for Delhi's sparse demo data (stated; product map unchanged).
- **Static snapshot** (no live streaming); recompute is batch. No Worker service (by
  design).
- Gi\* finds *where*, not *why*; pairing with category/time is what makes it actionable.

## 11. Phases & commit plan

| Phase | Deliverable | Commit |
|---|---|---|
| 1 | `geo` schema migration + grid + counts (PostGIS) | `feat(m5): geo schema + spatial grid + counts` |
| 2 | Gi\* (weights + esda) + significance + eval; batch `run.py` → `geo.hotspots` | `feat(m5): getis-ord gi* hotspot detection` |
| 3 | (optional) DBSCAN incident clusters | `feat(m5): spatial incident clustering` |
| 4 | gateway `/api/v1/hotspots` (admin) + schemas | `feat(m5): hotspots api` |
| 5 | admin hotspot-intelligence map (NYC-labeled) | `feat(m5): admin hotspot map` |
| 6 | model/method card + `M5_REPORT.md` (measured) + verify | `docs(m5): hotspot report + card` |

## 12. Decisions I need signed off before implementing

1. **Spatial unit:** **~1 km regular grid (ST_SquareGrid)** primary + ZIP as a
   secondary view (**recommended**) — vs grid-only, or hexagons.
2. **Scope for v1:** **Gi\* hotspots (overall + per-category + time-window stability)**
   as the headline, **DBSCAN incident clustering optional/if-time** (**recommended**) —
   vs both fully.
3. **Product integration:** **admin "Hotspot intelligence" view on NYC data, clearly
   labeled**, Delhi product map unchanged (**recommended**) — vs also attempting Delhi.
4. **Compute model:** offline **batch CLI job** writing to `geo.*` (no Worker service),
   consistent with M3 clustering (**recommended**) — confirm (no Worker is added).

*No implementation until confirmed.* On approval I'll branch off `main` (M5 is
independent ML/geo work), install `libpysal`/`esda`, and proceed phase-by-phase.
