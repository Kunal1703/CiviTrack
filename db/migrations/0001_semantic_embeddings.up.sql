-- 0001 — semantic embedding storage (M3)
-- Note: no FK to silver.complaints_311 on purpose — that table is rebuilt by the
-- pandas data pipeline (to_sql replace), and a FK would block reloads. We store
-- complaint_id as an indexed text column and keep provenance columns so multiple
-- embedding models/versions coexist without corrupting each other.

CREATE SCHEMA IF NOT EXISTS semantic;

CREATE TABLE IF NOT EXISTS semantic.complaint_embeddings (
    id                BIGSERIAL PRIMARY KEY,
    complaint_id      TEXT NOT NULL,
    source_column     TEXT NOT NULL,
    text_snippet      TEXT NOT NULL,
    embedding         vector(384) NOT NULL,
    embedding_model   TEXT NOT NULL,
    embedding_version TEXT NOT NULL,
    data_version      TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_complaint_model_ver UNIQUE (complaint_id, embedding_model, embedding_version)
);

CREATE INDEX IF NOT EXISTS ix_cemb_complaint ON semantic.complaint_embeddings (complaint_id);
CREATE INDEX IF NOT EXISTS ix_cemb_model_ver ON semantic.complaint_embeddings (embedding_model, embedding_version);
