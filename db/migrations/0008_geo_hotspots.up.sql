-- 0008 — geospatial hotspots (M5). Getis-Ord Gi* results per spatial unit,
-- computed offline and served read-only to the admin "Hotspot intelligence" view.
-- Computed on the NYC 311 corpus (silver.complaints_311); the Delhi product map is
-- unaffected. No FK to silver (silver is rebuilt by the pipeline).

CREATE SCHEMA IF NOT EXISTS geo;

CREATE TABLE IF NOT EXISTS geo.hotspots (
    id            BIGSERIAL PRIMARY KEY,
    method        TEXT NOT NULL DEFAULT 'getis_ord_gi_star',
    spatial_unit  TEXT NOT NULL,                 -- e.g. 'grid_1km'
    cell_key      TEXT NOT NULL,                 -- grid 'i:j'
    category      TEXT,                          -- NULL = all complaints
    window_label  TEXT NOT NULL DEFAULT 'all',   -- 'all' | '2024-06' …
    count         INTEGER NOT NULL,
    gi_z          DOUBLE PRECISION,              -- Gi* z-score
    p_value       DOUBLE PRECISION,              -- FDR-corrected
    significance  TEXT NOT NULL,                 -- hot_99|hot_95|hot_90|cold_*|ns
    centroid      geometry(Point, 4326),
    cell          geometry(Polygon, 4326),
    computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (spatial_unit, cell_key, category, window_label)
);

CREATE INDEX IF NOT EXISTS gix_hotspots_centroid ON geo.hotspots USING GIST (centroid);
CREATE INDEX IF NOT EXISTS ix_hotspots_filter ON geo.hotspots (category, window_label, significance);

-- Optional spatial incident clusters (DBSCAN on coordinates).
CREATE TABLE IF NOT EXISTS geo.incident_clusters (
    id                BIGSERIAL PRIMARY KEY,
    method            TEXT NOT NULL DEFAULT 'dbscan',
    cluster_key       INTEGER NOT NULL,
    member_count      INTEGER NOT NULL,
    dominant_category TEXT,
    centroid          geometry(Point, 4326),
    computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (method, cluster_key)
);
CREATE INDEX IF NOT EXISTS gix_clusters_centroid ON geo.incident_clusters USING GIST (centroid);
