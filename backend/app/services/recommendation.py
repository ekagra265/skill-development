from __future__ import annotations

import math
from typing import Any

from app.services.i18n import t, localise_action


def _to_finite_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def generate_recommendation(
    forecast: list[dict[str, Any]],
    language: str = "en",
) -> dict[str, Any]:
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
    last_price  = valid_prices[-1]

    if first_price == 0:
        return {
            "action": "HOLD",
            "expected_change_percent": 0.0,
            "message": t(language, "price_stable", pct="0.00"),
        }

    change_percent = ((last_price - first_price) / first_price) * 100
    if not math.isfinite(change_percent):
        raise ValueError("Invalid change percent computed from forecast values.")

    rounded_change = round(change_percent, 2)

    if rounded_change > 2:
        action  = "WAIT"
        message = t(language, "price_rise", pct=f"{rounded_change:.2f}")
    elif rounded_change < -2:
        action  = "SELL NOW"
        message = t(language, "price_drop", pct=f"{abs(rounded_change):.2f}")
    else:
        action  = "HOLD"
        message = t(language, "price_stable", pct=f"{rounded_change:.2f}")

    return {
        "action": action,
        "expected_change_percent": rounded_change,
        "message": message,
    }
