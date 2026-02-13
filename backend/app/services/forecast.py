from typing import Any

from app.services.forecast_model import run_prophet_forecast


def forecast_next_7_days(
    history: list[dict[str, Any]],
    days: int = 7,
) -> list[dict[str, Any]]:
    return run_prophet_forecast(history=history, periods=days)
