"""Sentence-embedding wrapper (deterministic, batchable, CPU).

Wraps a sentence-transformers model behind a stable interface so the rest of the
system never touches the model directly. Applies the shared `embed_normalize`
so encoding is identical wherever it runs (pipeline, benchmark, ml_service).
"""

from __future__ import annotations

import numpy as np
from sentence_transformers import SentenceTransformer

from .normalize import embed_normalize


class Embedder:
    def __init__(self, model_name: str, normalize: bool = True, device: str = "cpu") -> None:
        self.model_name = model_name
        self.normalize = normalize
        self.model = SentenceTransformer(model_name, device=device)
        self.model.eval()  # deterministic

    @property
    def dim(self) -> int:
        return int(self.model.get_sentence_embedding_dimension())

    def encode(self, texts: list[str], batch_size: int = 256) -> np.ndarray:
        cleaned = [embed_normalize(t) for t in texts]
        return self.model.encode(
            cleaned,
            batch_size=batch_size,
            normalize_embeddings=self.normalize,  # unit-norm → cosine = dot
            convert_to_numpy=True,
            show_progress_bar=False,
        )
