from __future__ import annotations

import math
from typing import Any

from app.services.i18n import t


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
    language: str = "en",
) -> dict[str, str]:
    if not forecast:
        raise ValueError("Forecast output is empty; cannot generate insights.")

    prices: list[float] = []
    for point in forecast:
        yhat = _to_finite_float(point.get("yhat"))
        if yhat is not None:
            prices.append(yhat)

    if len(prices) < 2:
        raise ValueError("Forecast must include at least two valid yhat values.")

    first_price = prices[0]
    last_price  = prices[-1]

    # Trend line
    if last_price > first_price:
        trend_line = t(language, "trend_up")
    elif last_price < first_price:
        trend_line = t(language, "trend_down")
    else:
        trend_line = t(language, "trend_flat")

    # Change line
    if first_price == 0:
        change_line = t(language, "change_zero")
    else:
        change_pct = ((last_price - first_price) / first_price) * 100
        if math.isfinite(change_pct):
            change_line = t(language, "change_pct", pct=f"{change_pct:.2f}")
        else:
            change_line = t(language, "change_na")

    # Risk line
    risk_level = str(recommendation.get("risk_level", "")).upper()
    risk_key   = {"HIGH": "risk_high", "MEDIUM": "risk_medium", "LOW": "risk_low"}.get(
        risk_level, "risk_unknown"
    )
    risk_line = t(language, risk_key)

    # Action line
    action = str(recommendation.get("action", "")).upper()
    if action in {"WAIT", "SELL NOW", "HOLD"}:
        # Use localised action label for Hindi, raw for English
        action_label = t(language, "action_sfx", action=action)
        action_line  = action_label
    else:
        action_line = t(language, "action_na")

    return {"insight": f"{trend_line} {change_line} {risk_line} {action_line}"}
