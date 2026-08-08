# Model Card — Semantic Embedding (M3)

## Model
- **`sentence-transformers/all-MiniLM-L6-v2`** — 384-dimensional sentence embeddings, CPU, open-source, free.
- Baseline compared against: **TF-IDF cosine** (classical) and **BGE-small-en-v1.5** (benchmarked, drop-in).
- **Version:** embedding pipeline `v1`. Stored per-vector with `embedding_model` / `embedding_version` / `data_version`.

## Intended use
Power **semantic retrieval, related-complaint discovery, and duplicate detection** for civic complaints — decision support, not automated merging. A human decides whether a flagged "similar complaint" is truly the same incident.

**Out of scope:** authoritative deduplication without review; non-English text; incident-level identity from text alone (requires the spatial-temporal gate).

## Data
- **Source:** NYC 311, 12-month stratified 2024 slice (204k rows; 201,537 embedded).
- **Text field:** `descriptor` (the swap-seam — a future free-text corpus replaces it via one config value). ⚠️ **311 has no rich citizen text**; descriptors are short and **categorical (776 unique)**, so all complaints sharing a descriptor share one vector.
- **Preprocessing:** `embed_normalize` — lighter than the classifier's `clean_text` (keeps punctuation/case; only strips URLs + whitespace), applied identically at index and query time (parity test).

## Similarity & duplicates
- **Metric:** cosine (unit-normalized embeddings). pgvector `<=>`, HNSW index.
- **Duplicate = semantic similarity + spatial gate** (PostGIS `ST_DWithin`, 150 m) + time window. **Operating threshold 0.59** (natural-language, precision-favoring).

## Metrics (measured — see `docs/M3_REPORT.md`)
| | Result |
|---|---|
| Retrieval P@5 / MRR | 0.76 / 0.80 |
| Duplicate (natural language) F1 | **TF-IDF 0.17 → MiniLM 0.95** |
| Duplicate (categorical) precision | **similarity-only 0.56 → +gate 1.00** |
| Clustering (HDBSCAN) silhouette | 0.20 (vs K-Means 0.04) |
| Query latency (CPU) | p50 ≈ 820 ms (embed-bound; ANN < 10 ms) |
| Storage | 605 MB / 201,537 vectors |

## Known failure cases & limitations
- **Verbose citizen text vs cryptic descriptor corpus** → weaker matches (the stored side is categorical). Duplicate-check is conservative by design.
- **Similarity alone conflates topic with incident** — mitigated by the spatial gate.
- **Synthetic eval** is labeled, supplementary; recall is *estimated*.
- **Clusters** track categories; interpretability limited.
- **CPU latency** ~820 ms/query; GPU/batching is the documented scale-up.

## Ethical considerations
Advisory only — never auto-merges complaints. No PII embedded (only the descriptor). A false merge hides a real complaint, so thresholds favor precision.

## Future improvements
Fine-tune / swap to a richer free-text corpus (no schema change); GPU serving; calibrated thresholds per category; a dedicated vector store past ~1M vectors.
