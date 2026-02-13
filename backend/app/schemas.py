from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class ForecastRequest(BaseModel):
    crop: str = Field(..., examples=["Wheat"])
    mandi: str = Field(..., examples=["Delhi Azadpur"])
    district: str | None = Field(default=None, examples=["Delhi"])
    pincode: str | None = Field(default=None, examples=["110001"])
    days: int = Field(default=7, ge=1, le=7)
    language: Literal["en", "hi"] = "en"


class ForecastPoint(BaseModel):
    ds: date
    yhat: float
    yhat_lower: float
    yhat_upper: float


class RecommendationResult(BaseModel):
    action: Literal["WAIT", "SELL NOW", "HOLD"]
    expected_change_percent: float
    message: str
    confidence: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]


class MandiOption(BaseModel):
    mandi: str
    district: str
    distance_km: float
    current_price: float
    expected_7d_change_pct: float


class ForecastResponse(BaseModel):
    crop: str
    mandi: str
    current_price: float
    trend_direction: Literal["up", "down", "flat"]
    expected_change_pct: float
    recommendation: RecommendationResult
    volatility_level: Literal["Low", "Medium", "High"]
    shock_alert: str | None
    forecast: list[ForecastPoint]
    nearby_mandis: list[MandiOption]
    insights: list[str]
    language: Literal["en", "hi"]
