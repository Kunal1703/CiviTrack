# ─────────────────────────────────────────────────────────────
# CiviTrack AI — PostgreSQL 16 + PostGIS 3.4 + pgvector
#
# No official image bundles all three. We start from the official
# PostGIS image (native geo deps GEOS/GDAL/PROJ already configured)
# and add the pgvector extension on top from the PGDG apt repo.
# ─────────────────────────────────────────────────────────────
FROM postgis/postgis:16-3.4

LABEL org.opencontainers.image.title="civitrack-ai-postgres" \
      org.opencontainers.image.description="PostgreSQL 16 + PostGIS 3.4 + pgvector" \
      org.opencontainers.image.source="https://github.com/civitrack-ai"

# pgvector from the PostgreSQL Global Development Group apt repo,
# already present in the base image. Pinned to the major PG version.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*
