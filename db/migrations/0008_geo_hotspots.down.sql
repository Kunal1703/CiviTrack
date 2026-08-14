-- 0008 down — remove geospatial hotspot tables.
DROP TABLE IF EXISTS geo.incident_clusters CASCADE;
DROP TABLE IF EXISTS geo.hotspots CASCADE;
-- (empty `geo` schema left in place; harmless.)
