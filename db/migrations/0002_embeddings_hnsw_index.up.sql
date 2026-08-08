-- 0002 — HNSW index for cosine ANN search.
-- Applied AFTER bulk-loading embeddings (building an index over an empty/tiny
-- table then loading is slower). vector_cosine_ops because embeddings are
-- unit-normalized and cosine is the sentence-transformers training objective.
CREATE INDEX IF NOT EXISTS ix_cemb_hnsw
    ON semantic.complaint_embeddings
    USING hnsw (embedding vector_cosine_ops);
