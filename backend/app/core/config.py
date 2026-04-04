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
    api_key_enabled: bool = Field(
        default_factory=lambda: os.getenv("AGRIPULSE_API_KEY_ENABLED", "0").strip().lower()
        in {"1", "true", "yes", "on"}
    )
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
    cors_origin_regex: str = Field(
        default_factory=lambda: os.getenv(
            "AGRIPULSE_CORS_ORIGIN_REGEX",
            r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        )
    )
    # Price row source mode:
    # - local_csv (default): always use bundled CSV dataset
    # - data_gov: try data.gov.in first, then fallback to local CSV on failure
    # - auto: same as data_gov, retained for backward compatibility
    price_source: str = Field(
        default_factory=lambda: os.getenv(
            "AGRIPULSE_PRICE_SOURCE",
            "local_csv",
        )
    )
    # Optional external source (data.gov.in) for mandi/commodity price rows.
    data_gov_base_url: str = Field(
        default_factory=lambda: os.getenv(
            "AGRIPULSE_DATA_GOV_BASE_URL",
            "https://api.data.gov.in/resource",
        )
    )
    data_gov_resource_id: str = Field(
        default_factory=lambda: os.getenv(
            "AGRIPULSE_DATA_GOV_RESOURCE_ID",
            "35985678-0d79-46b4-9ed6-6f13308a1d24",
        )
    )
    data_gov_api_key: str = Field(
        default_factory=lambda: os.getenv(
            "AGRIPULSE_DATA_GOV_API_KEY",
            "",
        )
    )
    data_gov_page_size: int = Field(
        default_factory=lambda: int(os.getenv("AGRIPULSE_DATA_GOV_PAGE_SIZE", "200"))
    )
    data_gov_max_records: int = Field(
        default_factory=lambda: int(os.getenv("AGRIPULSE_DATA_GOV_MAX_RECORDS", "5000"))
    )
    data_gov_timeout_sec: float = Field(
        default_factory=lambda: float(os.getenv("AGRIPULSE_DATA_GOV_TIMEOUT_SEC", "8"))
    )
    data_gov_total_timeout_sec: float = Field(
        default_factory=lambda: float(os.getenv("AGRIPULSE_DATA_GOV_TOTAL_TIMEOUT_SEC", "45"))
    )
    auth_enabled: bool = Field(
        default_factory=lambda: os.getenv("AGRIPULSE_AUTH_ENABLED", "1").strip().lower()
        in {"1", "true", "yes", "on"}
    )
    auth_secret_key: str = Field(
        default_factory=lambda: os.getenv(
            "AGRIPULSE_AUTH_SECRET_KEY",
            "agripulse-dev-auth-secret-change-in-production",
        )
    )
    auth_token_exp_minutes: int = Field(
        default_factory=lambda: int(os.getenv("AGRIPULSE_AUTH_TOKEN_EXP_MINUTES", "720"))
    )
    auth_demo_username: str = Field(
        default_factory=lambda: os.getenv("AGRIPULSE_AUTH_DEMO_USERNAME", "admin")
    )
    auth_demo_password: str = Field(
        default_factory=lambda: os.getenv("AGRIPULSE_AUTH_DEMO_PASSWORD", "admin123")
    )


settings = Settings()
