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


def generate_insights(
    forecast: list[dict[str, Any]],
    recommendation: dict[str, Any],
) -> dict[str, str]:
    if not forecast:
        raise ValueError("Forecast output is empty; cannot generate insights.")

    prices: list[float] = []
    for point in forecast:
        yhat = _to_finite_float(point.get("yhat"))
        if yhat is not None:
            prices.append(yhat)

    if len(prices) < 2:
        raise ValueError("Forecast must include at least two valid yhat values for insight generation.")

    first_price = prices[0]
    last_price = prices[-1]

    if last_price > first_price:
        trend_line = "Prices show an upward trend this week."
    elif last_price < first_price:
        trend_line = "Market shows downward pressure this week."
    else:
        trend_line = "Prices are mostly flat over the forecast window."

    if first_price == 0:
        change_line = "Percent change cannot be computed because the first forecasted price is zero."
    else:
        change_pct = ((last_price - first_price) / first_price) * 100
        if math.isfinite(change_pct):
            change_line = f"Projected change from first to last forecast day is {change_pct:.2f}%."
        else:
            change_line = "Projected percent change is unavailable due to invalid forecast values."

    risk_level = str(recommendation.get("risk_level", "")).upper()
    if risk_level == "HIGH":
        risk_line = "Risk is HIGH, so volatility may cause sharp price swings."
    elif risk_level == "MEDIUM":
        risk_line = "Risk is MEDIUM, so moderate volatility is possible."
    elif risk_level == "LOW":
        risk_line = "Risk is LOW, indicating comparatively stable forecast confidence."
    else:
        risk_line = "Risk level is unavailable for this forecast."

    action = str(recommendation.get("action", "")).upper()
    if action in {"WAIT", "SELL NOW", "HOLD"}:
        action_line = f"Suggested action: {action}."
    else:
        action_line = "Suggested action is unavailable."

    return {"insight": f"{trend_line} {change_line} {risk_line} {action_line}"}
