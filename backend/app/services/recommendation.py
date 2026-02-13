from __future__ import annotations

import math
from typing import Any


def _to_finite_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def generate_recommendation(forecast: list[dict[str, Any]]) -> dict[str, Any]:
    if not forecast:
        raise ValueError("Forecast output is empty; cannot generate recommendation.")

    valid_prices: list[float] = []
    for point in forecast:
        yhat = _to_finite_float(point.get("yhat"))
        if yhat is not None:
            valid_prices.append(yhat)

    if len(valid_prices) < 2:
        raise ValueError("Forecast must include at least two valid yhat values.")

    first_price = valid_prices[0]
    last_price = valid_prices[-1]

    if first_price == 0:
        return {
            "action": "HOLD",
            "expected_change_percent": 0.0,
            "message": "Unable to compute percent change because first forecast price is zero.",
        }

    change_percent = ((last_price - first_price) / first_price) * 100
    if not math.isfinite(change_percent):
        raise ValueError("Invalid change percent computed from forecast values.")

    rounded_change = round(change_percent, 2)
    if rounded_change > 2:
        action = "WAIT"
        message = f"Forecast shows a {rounded_change:.2f}% rise over the horizon. Waiting is recommended."
    elif rounded_change < -2:
        action = "SELL NOW"
        message = f"Forecast shows a {abs(rounded_change):.2f}% drop over the horizon. Selling now is recommended."
    else:
        action = "HOLD"
        message = f"Forecast change is {rounded_change:.2f}%, within the hold band (-2% to +2%)."

    return {
        "action": action,
        "expected_change_percent": rounded_change,
        "message": message,
    }
