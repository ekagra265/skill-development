from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from importlib import import_module
from typing import Any


def _pd():
    try:
        return import_module("pandas")
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Missing dependency 'pandas'. Install it before running Prophet forecasting."
        ) from exc


def _prophet_cls():
    try:
        prophet_module = import_module("prophet")
        return prophet_module.Prophet
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Missing dependency 'prophet'. Install it before running Prophet forecasting."
        ) from exc
    except AttributeError as exc:
        raise RuntimeError(
            "Incompatible prophet/numpy versions detected. Use numpy<2 with prophet."
        ) from exc


def _to_finite_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _normalize_history(
    history: list[dict[str, Any]],
) -> list[tuple[datetime, float]]:
    normalized: list[tuple[datetime, float]] = []
    for row in history:
        ds_value = row.get("ds")
        if hasattr(ds_value, "to_pydatetime"):
            ds_value = ds_value.to_pydatetime()
        if isinstance(ds_value, date) and not isinstance(ds_value, datetime):
            ds_value = datetime.combine(ds_value, datetime.min.time())
        if not isinstance(ds_value, datetime):
            continue

        y_value = _to_finite_float(row.get("y"))
        if y_value is None:
            continue

        normalized.append((ds_value, y_value))

    normalized.sort(key=lambda item: item[0])
    deduped: list[tuple[datetime, float]] = []
    for ds_value, y_value in normalized:
        if deduped and deduped[-1][0] == ds_value:
            deduped[-1] = (ds_value, y_value)
        else:
            deduped.append((ds_value, y_value))
    return deduped


def run_baseline_forecast(
    history: list[dict[str, Any]],
    periods: int = 7,
) -> list[dict[str, Any]]:
    cleaned = _normalize_history(history)
    if not cleaned:
        raise ValueError("Historical dataset is empty for this selection; cannot run forecasting.")

    safe_periods = max(1, int(periods))
    last_ds, last_price = cleaned[-1]
    window_prices = [price for _, price in cleaned[-7:]]

    # Dampened slope keeps short-history projections stable.
    if len(cleaned) >= 2:
        start_ds, start_price = cleaned[-min(7, len(cleaned))]
        steps = max(1, (last_ds.date() - start_ds.date()).days)
        slope = (last_price - start_price) / steps
    else:
        slope = 0.0
    damped_slope = slope * 0.35

    if len(window_prices) >= 2:
        diffs = [
            abs(window_prices[idx] - window_prices[idx - 1])
            for idx in range(1, len(window_prices))
        ]
        avg_abs_change = sum(diffs) / len(diffs)
    else:
        avg_abs_change = max(1.0, abs(last_price) * 0.01)
    band = max(1.0, avg_abs_change * 1.4)

    results: list[dict[str, Any]] = []
    for step in range(1, safe_periods + 1):
        point_date = (last_ds + timedelta(days=step)).date()
        yhat = max(0.0, last_price + (damped_slope * step))
        lower = max(0.0, yhat - band)
        upper = yhat + band
        results.append(
            {
                "ds": point_date,
                "yhat": float(yhat),
                "yhat_lower": float(lower),
                "yhat_upper": float(upper),
            }
        )

    return results


def run_prophet_forecast(
    history: list[dict[str, Any]],
    periods: int = 7,
) -> list[dict[str, Any]]:
    pd = _pd()
    Prophet = _prophet_cls()

    if not history:
        raise ValueError("Historical dataset is empty for this selection; cannot run forecasting.")

    frame = pd.DataFrame(history)
    missing_columns = {"ds", "y"} - set(frame.columns)
    if missing_columns:
        raise ValueError(
            "History rows must include 'ds' and 'y' columns for Prophet training."
        )

    frame = frame.loc[:, ["ds", "y"]].copy()
    frame["ds"] = pd.to_datetime(frame["ds"], errors="coerce")
    frame["y"] = pd.to_numeric(frame["y"], errors="coerce")
    frame = frame.dropna(subset=["ds", "y"]).sort_values("ds")
    frame = frame.drop_duplicates(subset=["ds"], keep="last")

    if len(frame) < 30:
        raise ValueError(
            f"Need at least 30 valid history rows for Prophet training; found {len(frame)}."
        )

    safe_periods = max(1, int(periods))

    try:
        model = Prophet()
    except Exception as exc:
        raise RuntimeError(
            "Failed to initialize Prophet backend. Install/fix CmdStan (e.g. "
            "\"python -c \\\"import cmdstanpy; cmdstanpy.install_cmdstan(overwrite=True)\\\"\")."
        ) from exc

    try:
        model.fit(frame)
        future = model.make_future_dataframe(periods=safe_periods)
        forecast = model.predict(future)
    except Exception as exc:
        raise RuntimeError(f"Prophet forecasting failed: {exc}") from exc

    future_only = forecast.loc[:, ["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(safe_periods)
    future_only = future_only.dropna(subset=["ds", "yhat", "yhat_lower", "yhat_upper"])
    if len(future_only) < safe_periods:
        raise ValueError(
            f"Prophet produced fewer than {safe_periods} valid forecast rows after NaN filtering."
        )

    results: list[dict[str, Any]] = []
    for row in future_only.to_dict(orient="records"):
        ds_value = row["ds"]
        if hasattr(ds_value, "to_pydatetime"):
            ds_value = ds_value.to_pydatetime()
        if ds_value is None:
            continue

        yhat = _to_finite_float(row["yhat"])
        yhat_lower = _to_finite_float(row["yhat_lower"])
        yhat_upper = _to_finite_float(row["yhat_upper"])
        if yhat is None or yhat_lower is None or yhat_upper is None:
            continue

        results.append(
            {
                "ds": ds_value.date(),
                "yhat": yhat,
                "yhat_lower": yhat_lower,
                "yhat_upper": yhat_upper,
            }
        )

    if len(results) < safe_periods:
        raise ValueError(f"Prophet generated fewer than {safe_periods} finite future predictions.")

    return results
