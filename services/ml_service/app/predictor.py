"""Model loading + inference.

Loads a fine-tuned HuggingFace sequence-classification artifact (the output of
`ml/models/classification/train_transformer.py`) and classifies arbitrary text.
The same `clean_text` used in training is applied here first (train/serve parity).
"""

from __future__ import annotations

import logging
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from .text import clean_text

logger = logging.getLogger("ml_service.predictor")


class Classifier:
    def __init__(self, model_dir: str, max_length: int = 32) -> None:
        path = Path(model_dir)
        if not path.exists():
            raise FileNotFoundError(f"model directory not found: {path}")
        self.tokenizer = AutoTokenizer.from_pretrained(path)
        self.model = AutoModelForSequenceClassification.from_pretrained(path)
        self.model.eval()
        self.max_length = max_length
        # id2label keys may be int or str depending on how config was serialized.
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        logger.info("Loaded classifier (%s labels) from %s", len(self.id2label), path)

    @torch.no_grad()
    def predict(self, text: str, top_k: int = 3) -> dict:
        cleaned = clean_text(text)
        enc = self.tokenizer(
            cleaned, truncation=True, max_length=self.max_length, return_tensors="pt"
        )
        logits = self.model(**enc).logits[0]
        probs = torch.softmax(logits, dim=-1)
        conf, idx = torch.max(probs, dim=-1)
        k = min(top_k, probs.shape[-1])
        top_probs, top_idx = torch.topk(probs, k)
        top = [
            {"category": self.id2label[int(i)], "score": round(float(s), 4)}
            for s, i in zip(top_probs, top_idx)
        ]
        return {
            "category": self.id2label[int(idx)],
            "confidence": round(float(conf), 4),
            "top_k": top,
        }
