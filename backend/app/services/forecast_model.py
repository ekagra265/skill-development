from __future__ import annotations

import math
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

    _ = periods  # Keep backward compatibility with existing callers.

    try:
        model = Prophet()
    except Exception as exc:
        raise RuntimeError(
            "Failed to initialize Prophet backend. Install/fix CmdStan (e.g. "
            "\"python -c \\\"import cmdstanpy; cmdstanpy.install_cmdstan(overwrite=True)\\\"\")."
        ) from exc

    try:
        model.fit(frame)
        future = model.make_future_dataframe(periods=7)
        forecast = model.predict(future)
    except Exception as exc:
        raise RuntimeError(f"Prophet forecasting failed: {exc}") from exc

    future_only = forecast.loc[:, ["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(7)
    future_only = future_only.dropna(subset=["ds", "yhat", "yhat_lower", "yhat_upper"])
    if len(future_only) < 7:
        raise ValueError("Prophet produced fewer than 7 valid forecast rows after NaN filtering.")

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

    if len(results) < 7:
        raise ValueError("Prophet generated fewer than 7 finite future predictions.")

    return results
