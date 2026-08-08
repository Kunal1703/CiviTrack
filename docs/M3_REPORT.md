# M3 — Semantic Intelligence · Results Report

> Measured results from the implemented system (no invented numbers). Design: `docs/M3_DESIGN.md`.

## 1. What shipped
CiviTrack AI now understands relationships between complaints: semantic search, related-complaint retrieval, and spatially-gated duplicate detection — served through the existing gateway/ml_service/Postgres+pgvector stack, integrated into the M2 frontend.

```
Complaint text ─► embed_normalize ─► all-MiniLM-L6-v2 (384-d) ─► pgvector (HNSW, cosine)
                                                                    + PostGIS ST_DWithin (spatial gate)
                                                                          │
                        ┌─────────────────────────────────────────────────┼───────────────────────┐
                        ▼                          ▼                        ▼                       ▼
                Semantic search          Related complaints        Duplicate check          Clustering (offline)
```

## 2. Embedding model selection (Phase 2)
Benchmarked on natural-language pairs (curated + synthetic); 311 descriptors are categorical and can't discriminate embedding quality.

| Model | dim | curated AUC | dup mean-sim | related | different |
|-------|----:|------------:|-------------:|--------:|----------:|
| TF-IDF (baseline) | — | 0.951 | 0.21 | 0.05 | 0.04 |
| **all-MiniLM-L6-v2** ✅ | 384 | 0.986 | 0.76 | 0.46 | 0.11 |
| BGE-small-en-v1.5 | 384 | 1.000 | 0.85 | 0.70 | 0.51 |

**Selected all-MiniLM-L6-v2.** BGE-small's AUC edge is one pair on 24; MiniLM is lighter/faster on CPU and has **wider similarity spread** (related 0.46 vs different 0.11) → cleaner thresholds. Both are 384-d, so BGE-small remains a drop-in future swap.

## 3. Embedding pipeline & storage (Phases 3–4)
- **201,537 complaints embedded** — but only **776 unique descriptors** (categorical data), so we embed each unique text once and fan out per complaint: **encode 3.7 s**, insert 38.8 s.
- Storage: **605 MB** total (201k × 384-d vectors + HNSW + btree indexes) in `semantic.complaint_embeddings`.
- Index: **HNSW `vector_cosine_ops`** (built after load). Provenance columns (`embedding_model`, `embedding_version`, `data_version`) let models coexist; a different-dim model gets a new table — old vectors never corrupt.
- Migrations applied via reversible numbered SQL (`db/migrations/0001–0003`, tracked in `schema_migrations`).

## 4. Retrieval (Phase 5)
Same-category relevance on a 200-query sample: **Precision@5 = 0.76, MRR = 0.80.** Cosine similarity (embeddings are unit-normalized; cosine is the training objective).

## 5. Duplicate detection (Phase 6) — the headline
Two evaluation tracks, reported separately (honest).

**(a) Natural-language (curated) — does semantic beat classical?**
| Method | Precision | Recall | F1 | Threshold |
|--------|----------:|-------:|---:|----------:|
| TF-IDF cosine | — | — | **0.17** | — |
| all-MiniLM-L6-v2 | 1.00 | 0.91 | **0.95** | 0.59 |

Embeddings **crush TF-IDF** on reworded complaints (F1 0.95 vs 0.17). This is the value of semantic embeddings.

**(b) Derived-real (categorical) — is the spatial gate necessary?**
| Method | Precision | Recall | F1 |
|--------|----------:|-------:|---:|
| Similarity only | **0.56** | 1.00 | 0.72 |
| Similarity **+ spatial gate** | **1.00** | 1.00 | **1.00** |

On categorical descriptors, similarity alone **can't separate a duplicate from a same-descriptor complaint 3 km away** (precision 0.56). The PostGIS gate (`ST_DWithin`) fixes it to **1.00**. This proves the design principle: *two different potholes are related, not duplicates.*

**Operating threshold:** 0.59 (natural-language, precision-favoring — false merges hide real complaints).

## 6. Clustering (Phase 7) — analytical, offline
HDBSCAN over the 776 unique descriptor embeddings; K-Means baseline; PCA for 2-D viz only.

| Method | clusters | silhouette | Davies-Bouldin |
|--------|---------:|-----------:|---------------:|
| **HDBSCAN** | 14 | **0.20** | 1.62 |
| K-Means (k=15) | 15 | 0.04 | 3.57 |

HDBSCAN clearly wins (noise ratio 82% — most descriptors are sparse singletons). **Honest:** clusters largely track the category taxonomy; interpretability is limited.

## 7. System performance
- **Query latency** (embed + ANN, local CPU): **p50 ≈ 820 ms**, mean 886 ms. Dominated by single-query CPU embedding; the HNSW retrieval itself is sub-10 ms. Faster on GPU/batched (documented, not built).
- **Storage:** 605 MB for 201k vectors.
- **Vector count:** 201,537.

## 8. APIs
Gateway (public): `POST /api/v1/semantic/{search, related, duplicate-check}` — validated (length caps, `top_k∈[1,50]`, threshold∈[0,1]), parameterized SQL only, 503-degrades if ml_service is down. ml_service owns embedding + vector search (holds a read DB pool).

## 9. Frontend (M2 design system reused)
- **Duplicate warning** in the report flow (non-blocking, debounced, "this is a new issue → continue").
- **Related complaints** on the issue detail page (semantic retrieval on the issue body).
- **Semantic search** on Issues + an **admin semantic explorer**.
- Animated similarity bars, reveal transitions; reduced-motion honored.

## 10. Honest limitations
1. **311 has no rich citizen text** — we embed `descriptor` (776 unique). Semantic *quality* is validated on curated/synthetic natural language; the descriptor corpus itself is categorical.
2. **Same-descriptor complaints share one vector** → incident-level retrieval is impossible without the spatial gate. Reported, not hidden.
3. **Semantic similarity ≠ duplicate truth** — we gate with space/time and evaluate; not marketed as perfect dedup.
4. **Synthetic eval** is clearly labeled and supplementary; recall is *estimated* (no exhaustive duplicate labels).
5. **Cluster interpretability** limited (tracks categories).
6. **CPU latency** ~820 ms/query (single-item embed); scale-up path documented.
7. **pgvector scaling** — single-node HNSW fine to ~1M vectors; beyond that, partition or a dedicated store (not built).

## 11. Reproducibility
Data reconciled to 204k; eval datasets committed (`ml/semantic/evaluation/`), tagged real/curated/synthetic. MLflow experiment `semantic-embeddings` tracks the benchmark, generation, evaluation, and clustering runs. No models or vectors in git (models cached; vectors in Postgres).
