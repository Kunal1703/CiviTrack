"""ML service configuration (environment-driven)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "CiviTrack AI ML Service"
    app_version: str = "0.1.0"
    environment: str = "development"
    log_level: str = "INFO"

    # Path to the HuggingFace model artifact directory (save_pretrained output).
    model_dir: str = "./model"
    model_version: str = "classifier-v1.0"
    max_length: int = 32
    top_k: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()
