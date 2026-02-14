from __future__ import annotations

import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "AgriPulse API"
    app_version: str = "0.1.0"
    default_language: str = "en"
    api_key_header: str = "X-API-Key"
    api_key: str = Field(
        default_factory=lambda: os.getenv("AGRIPULSE_API_KEY", "agripulse-dev-key")
    )


settings = Settings()
