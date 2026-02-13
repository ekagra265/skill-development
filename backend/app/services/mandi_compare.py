from __future__ import annotations

import math
from typing import Any

from app.services.crop_prices import _load_rows, load_prophet_history
from app.services.forecast_model import run_prophet_forecast


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def _to_finite_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _markets_for_state_and_commodity(state: str, commodity: str) -> list[str]:
    state_norm = _norm(state)
    commodity_norm = _norm(commodity)
    markets = {
        str(row.get("Market", "")).strip()
        for row in _load_rows()
        if _norm(str(row.get("State", ""))) == state_norm
        and _norm(str(row.get("Commodity", ""))) == commodity_norm
    }
    markets.discard("")
    return sorted(markets)


def _expected_gain_percent(forecast: list[dict[str, Any]]) -> float | None:
    if len(forecast) < 2:
        return None

    first = _to_finite_float(forecast[0].get("yhat"))
    last = _to_finite_float(forecast[-1].get("yhat"))
    if first is None or last is None or first == 0:
        return None

    gain = ((last - first) / first) * 100
    if not math.isfinite(gain):
        return None
    return gain


def select_best_mandis(
    state: str,
    commodity: str,
    days: int = 7,
    limit: int = 3,
) -> dict[str, Any]:
    markets = _markets_for_state_and_commodity(state, commodity)
    if not markets:
        raise ValueError(
            f"No markets found for state='{state}' and commodity='{commodity}'."
        )

    ranked: list[dict[str, Any]] = []
    for market in markets:
        try:
            history = load_prophet_history(state=state, market=market, commodity=commodity)
            forecast = run_prophet_forecast(history, periods=days)
        except (ValueError, RuntimeError):
            continue

        gain = _expected_gain_percent(forecast)
        if gain is None:
            continue

        ranked.append(
            {
                "mandi": market,
                "expected_change_percent": round(gain, 2),
            }
        )

    if not ranked:
        raise ValueError(
            f"Unable to compute market comparison for state='{state}' and commodity='{commodity}'."
        )

    ranked.sort(key=lambda item: item["expected_change_percent"], reverse=True)
    safe_limit = max(1, int(limit))
    return {
        "state": state,
        "commodity": commodity,
        "best_mandis": ranked[:safe_limit],
    }
