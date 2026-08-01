# ─────────────────────────────────────────────────────────────
# CiviTrack AI — API Gateway image
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install the package + its dependencies. psycopg[binary] ships prebuilt
# wheels, so no system build tools are required.
COPY pyproject.toml ./
COPY app ./app
RUN pip install --upgrade pip && pip install .

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
