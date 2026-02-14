from __future__ import annotations

import os

from pydantic import BaseModel, Field


def _read_csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings(BaseModel):
    app_name: str = "AgriPulse API"
    app_version: str = "0.1.0"
    default_language: str = "en"
    api_key_header: str = "X-API-Key"
    api_key: str = Field(
        default_factory=lambda: os.getenv("AGRIPULSE_API_KEY", "agripulse-dev-key")
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: _read_csv_env(
            "AGRIPULSE_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
    )


settings = Settings()
