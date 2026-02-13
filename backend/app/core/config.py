from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "AgriPulse API"
    app_version: str = "0.1.0"
    default_language: str = "en"


settings = Settings()
