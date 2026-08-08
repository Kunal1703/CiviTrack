"""Query-time sentence embedder (CPU, deterministic)."""

from __future__ import annotations

import numpy as np
from sentence_transformers import SentenceTransformer

from app.embed_normalize import embed_normalize


class Embedder:
    def __init__(self, model_name: str, normalize: bool = True) -> None:
        self.model_name = model_name
        self.normalize = normalize
        self.model = SentenceTransformer(model_name, device="cpu")
        self.model.eval()

    @property
    def dim(self) -> int:
        return int(self.model.get_sentence_embedding_dimension())

    def encode_one(self, text: str) -> np.ndarray:
        return self.model.encode(
            [embed_normalize(text)], normalize_embeddings=self.normalize, convert_to_numpy=True
        )[0]
