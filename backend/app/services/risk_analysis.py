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


def calculate_confidence_and_risk(forecast: list[dict[str, Any]]) -> dict[str, Any]:
    if not forecast:
        raise ValueError("Forecast output is empty; cannot calculate confidence and risk.")

    spreads: list[float] = []
    prices: list[float] = []

    for point in forecast:
        yhat = _to_finite_float(point.get("yhat"))
        lower = _to_finite_float(point.get("yhat_lower"))
        upper = _to_finite_float(point.get("yhat_upper"))
        if yhat is None or lower is None or upper is None:
            continue

        spread = upper - lower
        spreads.append(max(0.0, spread))
        prices.append(yhat)

    if not spreads or not prices:
        raise ValueError("Forecast must contain valid yhat/yhat_lower/yhat_upper values.")

    avg_spread = sum(spreads) / len(spreads)
    avg_price = sum(prices) / len(prices)
    if avg_price == 0:
        uncertainty_ratio = 1.0
    else:
        uncertainty_ratio = max(0.0, avg_spread / avg_price)

    confidence = int(round(max(0.0, min(100.0, (1.0 - uncertainty_ratio) * 100.0))))

    if uncertainty_ratio < 0.05:
        risk_level = "LOW"
    elif uncertainty_ratio < 0.12:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return {
        "confidence": confidence,
        "risk_level": risk_level,
    }
