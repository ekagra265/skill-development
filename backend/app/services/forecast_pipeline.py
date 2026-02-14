from __future__ import annotations

from typing import Literal, TypedDict

from app.core.exceptions import DataNotFoundError, ForecastError, RecommendationError
from app.core.logger import logger
from app.schemas import ForecastRequest
from app.services.alerts import detect_price_shock
from app.services.crop_prices import load_prophet_history, resolve_state_for_market
from app.services.forecast_model import run_prophet_forecast
from app.services.insights import generate_insights
from app.services.mandi_lookup import get_nearby_mandis
from app.services.recommendation import generate_recommendation
from app.services.risk_analysis import calculate_confidence_and_risk
from app.services.volatility import classify_volatility


class ForecastPipelineResult(TypedDict):
    crop: str
    mandi: str
    current_price: float
    trend_direction: Literal["up", "down", "flat"]
    expected_change_pct: float
    recommendation: dict
    volatility_level: Literal["Low", "Medium", "High"]
    shock_alert: str | None
    forecast: list[dict]
    nearby_mandis: list[dict]
    insights: list[str]
    language: Literal["en", "hi"]


def run_forecast_pipeline(payload: ForecastRequest) -> ForecastPipelineResult:
    # CHANGED: Centralized orchestration for the full forecast workflow.
    try:
        state = resolve_state_for_market(payload.mandi)
        prophet_history = load_prophet_history(
            state=state,
            market=payload.mandi,
            commodity=payload.crop,
        )
    except FileNotFoundError as exc:
        raise DataNotFoundError(str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise ForecastError(str(exc)) from exc

    if not prophet_history:
        raise DataNotFoundError(
            f"No historical data found for commodity='{payload.crop}' and market='{payload.mandi}'."
        )

    if len(prophet_history) < 30:
        raise ForecastError(
            f"At least 30 history rows are required for forecasting; found {len(prophet_history)}."
        )

    try:
        forecast_points = run_prophet_forecast(history=prophet_history, periods=payload.days)
    except (RuntimeError, ValueError) as exc:
        raise ForecastError(str(exc)) from exc

    try:
        recommendation = generate_recommendation(forecast_points)
    except ValueError as exc:
        raise RecommendationError(str(exc)) from exc

    try:
        risk_info = calculate_confidence_and_risk(forecast_points)
        recommendation.update(risk_info)
        insight_info = generate_insights(forecast_points, recommendation)
    except ValueError as exc:
        raise ForecastError(str(exc)) from exc

    history_values = [point["y"] for point in prophet_history]
    current_price = history_values[-1]
    expected_change_pct = float(recommendation["expected_change_percent"])

    volatility_level = classify_volatility(history_values)
    shock_alert = detect_price_shock(history_values)
    nearby = get_nearby_mandis(district=payload.district, pincode=payload.pincode)
    insights = [insight_info["insight"]]

    risk_level = str(recommendation.get("risk_level", "UNKNOWN")).upper()
    logger.info(
        "Forecast completed | crop=%s | mandi=%s | change=%+.2f%% | risk=%s",
        payload.crop,
        payload.mandi,
        expected_change_pct,
        risk_level,
    )

    return {
        "crop": payload.crop,
        "mandi": payload.mandi,
        "current_price": current_price,
        "trend_direction": (
            "up"
            if expected_change_pct > 0
            else "down"
            if expected_change_pct < 0
            else "flat"
        ),
        "expected_change_pct": expected_change_pct,
        "recommendation": recommendation,
        "volatility_level": volatility_level,
        "shock_alert": shock_alert,
        "forecast": forecast_points,
        "nearby_mandis": nearby,
        "insights": insights,
        "language": payload.language,
    }
