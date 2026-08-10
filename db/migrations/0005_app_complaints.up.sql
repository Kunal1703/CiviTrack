-- 0005 — application complaints (citizen-submitted + seeded demo).
-- This is the platform's own complaint store, distinct from silver.complaints_311
-- (the NYC 311 analytical corpus that M1/M3 were built on). Keeping them separate
-- is deliberate: the app store is small, mutable, and city-agnostic; the swap seam
-- for a real Delhi open dataset lives here (source / is_demo columns).

-- Human-friendly reference codes: CT-001001, CT-001002, …
CREATE SEQUENCE IF NOT EXISTS app.complaint_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS app.complaints (
    id                  BIGSERIAL PRIMARY KEY,
    public_ref          TEXT NOT NULL UNIQUE
                            DEFAULT ('CT-' || lpad(nextval('app.complaint_ref_seq')::text, 6, '0')),
    reporter_id         BIGINT REFERENCES app.users(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,

    -- AI classification (M1). Canonical 19-label taxonomy; nullable until classified.
    category            TEXT,
    category_confidence REAL,
    category_overridden BOOLEAN NOT NULL DEFAULT false,

    status              TEXT NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'rejected')),
    priority            TEXT NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low', 'medium', 'high')),

    department_id       BIGINT,  -- FK added in 0007 (departments table)
    assignee_id         BIGINT REFERENCES app.users(id) ON DELETE SET NULL,

    -- Location. geom is derived from lat/lng by the app on write (ST_MakePoint).
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    geom                geometry(Point, 4326),
    address_text        TEXT,

    -- Provenance / honesty: how this row entered the system.
    --   'web'              → real citizen submission through the app
    --   'seed_delhi_demo'  → clearly-labeled seeded demo data (NOT real 311 data)
    source              TEXT NOT NULL DEFAULT 'web'
                            CHECK (source IN ('web', 'seed_delhi_demo')),
    is_demo             BOOLEAN NOT NULL DEFAULT false,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_complaints_reporter ON app.complaints (reporter_id);
CREATE INDEX IF NOT EXISTS ix_complaints_status   ON app.complaints (status);
CREATE INDEX IF NOT EXISTS ix_complaints_category ON app.complaints (category);
CREATE INDEX IF NOT EXISTS ix_complaints_created  ON app.complaints (created_at);
CREATE INDEX IF NOT EXISTS ix_complaints_source   ON app.complaints (source);
CREATE INDEX IF NOT EXISTS gix_complaints_geom    ON app.complaints USING GIST (geom);
