# ─────────────────────────────────────────────────────────────
# CiviTrack AI — ML inference service image (CPU-only torch)
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app

# Install CPU-only torch first (avoids the multi-GB CUDA build), then the rest.
RUN pip install --upgrade pip \
    && pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install .

RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
