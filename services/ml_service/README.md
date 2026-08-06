# ML Service (`services/ml_service`)

FastAPI inference service for complaint classification (M1). Holds the model so
the gateway stays lightweight and free of ML dependencies. Internal-only — the
gateway proxies to it.

## Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/classify` | Classify arbitrary complaint text → category + confidence |
| GET | `/health` | Liveness + whether the model is loaded |
| GET | `/docs` | OpenAPI UI |

### `POST /classify`
```json
// request
{ "text": "streetlight has not been working for two weeks" }
// response
{ "category": "Street Light", "confidence": 0.97, "model_version": "classifier-v1.0",
  "top_k": [{"category":"Street Light","score":0.97}, ...] }
```

## Design notes
- **Arbitrary input:** accepts unrestricted natural-language text (max 5000 chars),
  not just 311-style descriptors.
- **Train/serve parity:** `app/text.py` is a vendored copy of the training-side
  `ml/models/classification/text.py` and must stay in sync.
- **Graceful degradation:** if the model artifact is missing, the service starts,
  reports `model_loaded=false`, and `/classify` returns 503 (never crashes).
- **CPU-only:** DistilBERT inference runs on CPU (<~100 ms); no GPU required.

## Model artifact
Produced by `ml/models/classification/train_transformer.py` (HF `save_pretrained`
format). Set `MODEL_DIR` to its path (mounted at `/model` in Compose).
