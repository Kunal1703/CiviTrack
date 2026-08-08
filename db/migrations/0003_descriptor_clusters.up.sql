-- 0003 — analytical semantic clusters (offline job output; powers the admin explorer)
CREATE TABLE IF NOT EXISTS semantic.descriptor_clusters (
    descriptor    TEXT PRIMARY KEY,
    cluster_id    INT NOT NULL,
    cluster_label TEXT,
    method        TEXT NOT NULL,
    x             REAL,   -- PCA 2-D coords (visualization only)
    y             REAL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
