-- ─────────────────────────────────────────────────────────────
-- CiviTrack AI — database initialization (runs once on first boot)
--
-- Enables the three capabilities the platform's data layer needs:
--   • PostGIS         → geospatial types & queries (hotspots, radius)
--   • postgis_topology→ topology support (available if needed later)
--   • vector          → pgvector, similarity search over embeddings
--
-- Table/schema definitions are NOT created here — those arrive via
-- Alembic migrations in a later milestone. Step B only guarantees the
-- extensions are present and enabled.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Emit versions to the init log for verification.
DO $$
BEGIN
    RAISE NOTICE 'CiviTrack AI DB init — PostGIS %, pgvector enabled',
        (SELECT extversion FROM pg_extension WHERE extname = 'postgis');
END $$;
