from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.schemas import ForecastRequest, ForecastResponse
from app.services.alerts import detect_price_shock
from app.services.crop_prices import load_prophet_history, resolve_state_for_market
from app.services.forecast_model import run_prophet_forecast
from app.services.insights import generate_insights
from app.services.mandi_compare import select_best_mandis
from app.services.mandi_lookup import get_nearby_mandis
from app.services.recommendation import generate_recommendation
from app.services.risk_analysis import calculate_confidence_and_risk
from app.services.volatility import classify_volatility

app = FastAPI(title=settings.app_name, version=settings.app_version)


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(payload: ForecastRequest) -> ForecastResponse:
    try:
        state = resolve_state_for_market(payload.mandi)
        prophet_history = load_prophet_history(
            state=state,
            market=payload.mandi,
            commodity=payload.crop,
        )
        if not prophet_history:
            raise ValueError(
                f"No historical data found for commodity='{payload.crop}' and market='{payload.mandi}'."
            )
        if len(prophet_history) < 30:
            raise ValueError(
                f"At least 30 history rows are required for forecasting; found {len(prophet_history)}."
            )
        forecast_points = run_prophet_forecast(history=prophet_history)
        recommendation = generate_recommendation(forecast_points)
        risk_info = calculate_confidence_and_risk(forecast_points)
        recommendation.update(risk_info)
        insight_info = generate_insights(forecast_points, recommendation)
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    history = [point["y"] for point in prophet_history]
    current_price = history[-1]
    expected_change_pct = float(recommendation["expected_change_percent"])

    volatility_level = classify_volatility(history)
    shock_alert = detect_price_shock(history)
    nearby = get_nearby_mandis(district=payload.district, pincode=payload.pincode)
    insights = [insight_info["insight"]]

    return ForecastResponse(
        crop=payload.crop,
        mandi=payload.mandi,
        current_price=current_price,
        trend_direction="up" if expected_change_pct > 0 else "down" if expected_change_pct < 0 else "flat",
        expected_change_pct=expected_change_pct,
        recommendation=recommendation,
        volatility_level=volatility_level,
        shock_alert=shock_alert,
        forecast=forecast_points,
        nearby_mandis=nearby,
        insights=insights,
        language=payload.language,
    )


@app.get("/best-mandi")
def best_mandi(
    state: str,
    commodity: str,
    days: int = 7,
    limit: int = 3,
) -> dict:
    try:
        return select_best_mandis(
            state=state,
            commodity=commodity,
            days=days,
            limit=limit,
        )
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
