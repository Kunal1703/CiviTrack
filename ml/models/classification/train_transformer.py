"""Production model: fine-tuned DistilBERT sequence classifier.

Weighted cross-entropy handles class imbalance. Training is CPU-tractable via a
stratified subsample and short sequences (descriptors are short); these are
config knobs (`train_sample_cap`, `epochs`, `max_length`) — scaling up (GPU,
more epochs, full data) is a config change, not a code change.

Run from ml/:  python -m models.classification.train_transformer
"""

from __future__ import annotations

import json
import logging
import sys

import mlflow
import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from sklearn.metrics import f1_score
from sklearn.utils.class_weight import compute_class_weight
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

from .config import ClassifierConfig
from .evaluate import compute_metrics, evaluate_probe_set, save_reports
from .text import clean_text

log = logging.getLogger("train_transformer")


class WeightedTrainer(Trainer):
    """Trainer with class-weighted cross-entropy for imbalance."""

    def __init__(self, class_weights: torch.Tensor, **kwargs):
        super().__init__(**kwargs)
        self._class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss = torch.nn.functional.cross_entropy(
            outputs.logits, labels, weight=self._class_weights.to(outputs.logits.device)
        )
        return (loss, outputs) if return_outputs else loss


def _stratified_cap(df: pd.DataFrame, cap: int, seed: int) -> pd.DataFrame:
    if not cap or len(df) <= cap:
        return df
    frac = cap / len(df)
    return df.groupby("category", group_keys=False).sample(frac=frac, random_state=seed)


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    import os

    torch.set_num_threads(os.cpu_count() or 4)  # use all CPU cores
    cfg = ClassifierConfig()
    # Optional env overrides (handy for quick smoke tests).
    if os.getenv("TRAIN_SAMPLE_CAP"):
        cfg.train_sample_cap = int(os.environ["TRAIN_SAMPLE_CAP"])
    if os.getenv("EPOCHS"):
        cfg.epochs = int(os.environ["EPOCHS"])
    if os.getenv("EVAL_CAP"):
        cfg.eval_cap = int(os.environ["EVAL_CAP"])
    torch.manual_seed(cfg.seed)

    labels = json.loads((cfg.gold_dir / "labels.json").read_text(encoding="utf-8"))
    label2id = {lab: i for i, lab in enumerate(labels)}
    id2label = {i: lab for lab, i in label2id.items()}

    train = _stratified_cap(pd.read_parquet(cfg.gold_dir / "train.parquet"), cfg.train_sample_cap, cfg.seed)
    val = pd.read_parquet(cfg.gold_dir / "val.parquet")
    test = pd.read_parquet(cfg.gold_dir / "test.parquet")
    for part in (train, val, test):
        part["labels"] = part["category"].map(label2id).astype(int)
    log.info("train=%s (capped) val=%s test=%s labels=%s", len(train), len(val), len(test), len(labels))

    tokenizer = AutoTokenizer.from_pretrained(cfg.model_name)

    def tok(batch):
        return tokenizer(batch["text"], truncation=True, max_length=cfg.max_length)

    # Evaluate on a stratified test subset (full-30k CPU inference is too slow).
    test_eval = _stratified_cap(test, cfg.eval_cap, cfg.seed)
    ds_train = Dataset.from_pandas(train[["text", "labels"]], preserve_index=False).map(tok, batched=True)
    ds_test = Dataset.from_pandas(test_eval[["text", "labels"]], preserve_index=False).map(tok, batched=True)

    model = AutoModelForSequenceClassification.from_pretrained(
        cfg.model_name, num_labels=len(labels), id2label=id2label, label2id=label2id
    )
    weights = compute_class_weight("balanced", classes=np.arange(len(labels)), y=train["labels"].values)
    class_weights = torch.tensor(weights, dtype=torch.float)

    args = TrainingArguments(
        output_dir=str(cfg.artifacts_dir / "_hf_tmp"),
        num_train_epochs=cfg.epochs,
        per_device_train_batch_size=cfg.batch_size,
        per_device_eval_batch_size=64,
        learning_rate=cfg.learning_rate,
        eval_strategy="no",   # skip per-epoch eval (slow on CPU); evaluate once at end
        save_strategy="no",
        logging_steps=50,
        report_to=[],
        seed=cfg.seed,
        use_cpu=True,
    )

    trainer = WeightedTrainer(
        class_weights=class_weights,
        model=model,
        args=args,
        train_dataset=ds_train,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
    )

    mlflow.set_tracking_uri(cfg.mlflow_uri)
    mlflow.set_experiment(cfg.experiment_name)
    with mlflow.start_run(run_name="distilbert"):
        mlflow.log_params({
            "model_type": "distilbert", "model_name": cfg.model_name, "max_length": cfg.max_length,
            "epochs": cfg.epochs, "batch_size": cfg.batch_size, "lr": cfg.learning_rate,
            "n_train": len(train), "train_sample_cap": cfg.train_sample_cap,
            "n_categories": len(labels), "text_column": cfg.text_column,
        })
        trainer.train()

        # Test metrics.
        logits = trainer.predict(ds_test).predictions
        y_pred = [id2label[int(i)] for i in np.argmax(logits, axis=1)]
        metrics = compute_metrics(test_eval["category"].tolist(), y_pred, labels)
        mlflow.log_metrics({f"test_{k}": v for k, v in metrics.items()})
        log.info("TEST macro_f1=%.4f weighted_f1=%.4f acc=%.4f", metrics["f1_macro"], metrics["f1_weighted"], metrics["accuracy"])
        save_reports(test_eval["category"].tolist(), y_pred, labels, cfg.reports_dir, "transformer_test")

        # Probe set — arbitrary citizen phrasing (same clean_text as training).
        def predict_texts(texts: list[str]) -> list[str]:
            enc = tokenizer([clean_text(t) for t in texts], truncation=True, max_length=cfg.max_length, padding=True, return_tensors="pt")
            with torch.no_grad():
                out = model(**enc).logits
            return [id2label[int(i)] for i in out.argmax(-1).tolist()]

        probe = evaluate_probe_set(predict_texts, cfg.probe_path, labels)
        if probe:
            mlflow.log_metrics({"probe_accuracy": probe["probe_accuracy"], "probe_f1_macro": probe["probe_f1_macro"]})

        # Save artifact (HF format + label maps).
        out = cfg.artifacts_dir / "transformer"
        out.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(out)
        tokenizer.save_pretrained(out)
        (out / "labels.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")
        (out / "label2id.json").write_text(json.dumps(label2id, indent=2), encoding="utf-8")
        mlflow.log_artifacts(str(out), artifact_path="transformer_model")
        log.info("Transformer saved to %s", out)

    return 0


if __name__ == "__main__":
    raise SystemExit(run())
