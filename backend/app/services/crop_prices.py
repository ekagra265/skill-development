from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from importlib import import_module
from pathlib import Path
from typing import Any


DATASET_CANDIDATES = (
    Path(__file__).resolve().parents[2] / "data" / "cropPrices.csv",
    Path(__file__).resolve().parents[2] / "data" / "Agriculture_price_dataset.csv",
    # Backward-compatible fallback for existing repo layout.
    Path(__file__).resolve().parents[2] / "DATASET" / "cropPrices.csv",
    Path(__file__).resolve().parents[2] / "DATASET" / "Agriculture_price_dataset.csv",
)

COLUMN_RENAMES = {
    "Price Date": "Date",
    "Modal_Price": "Modal Price",
    "STATE": "State",
    "Market Name": "Market",
}


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def _resolve_dataset_path() -> Path:
    for path in DATASET_CANDIDATES:
        if path.exists():
            return path
    raise FileNotFoundError(
        "Dataset file not found. Expected one of: "
        + ", ".join(str(p) for p in DATASET_CANDIDATES)
    )


def _pd():
    try:
        return import_module("pandas")
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Missing dependency 'pandas'. Install it before using dataset-powered forecasting."
        ) from exc


@lru_cache(maxsize=1)
def _load_rows() -> list[dict[str, Any]]:
    pd = _pd()
    dataset_path = _resolve_dataset_path()
    frame = pd.read_csv(dataset_path).rename(columns=COLUMN_RENAMES)

    required_columns = {"Date", "Modal Price", "State", "Market", "Commodity"}
    missing_columns = sorted(required_columns - set(frame.columns))
    if missing_columns:
        raise ValueError(
            "Dataset is missing required columns: " + ", ".join(missing_columns)
        )

    frame["Date"] = pd.to_datetime(frame["Date"], errors="coerce")
    frame["Modal Price"] = pd.to_numeric(frame["Modal Price"], errors="coerce")

    for column in ("State", "Market", "Commodity"):
        frame[column] = frame[column].astype(str).str.strip()

    frame = frame.dropna(subset=["Date", "Modal Price"])
    frame = frame[
        (frame["State"] != "")
        & (frame["Market"] != "")
        & (frame["Commodity"] != "")
    ]

    if len(frame) < 30:
        raise ValueError(
            f"Dataset must contain at least 30 valid rows after cleaning; found {len(frame)}."
        )

    return frame.to_dict(orient="records")


def resolve_state_for_market(market: str) -> str | None:
    market_norm = _norm(market)
    if not market_norm:
        return None

    states = {
        str(row.get("State", "")).strip()
        for row in _load_rows()
        if _norm(str(row.get("Market", ""))) == market_norm
    }
    states.discard("")
    if len(states) == 1:
        return next(iter(states))
    return None


def load_prophet_history(
    state: str | None,
    market: str,
    commodity: str,
) -> list[dict[str, Any]]:
    state_norm = _norm(state)
    market_norm = _norm(market)
    commodity_norm = _norm(commodity)

    filtered = [
        row
        for row in _load_rows()
        if _norm(str(row.get("Commodity", ""))) == commodity_norm
        and _norm(str(row.get("Market", ""))) == market_norm
        and (not state_norm or _norm(str(row.get("State", ""))) == state_norm)
    ]
    if not filtered and state_norm and market_norm:
        filtered = [
            row
            for row in _load_rows()
            if _norm(str(row.get("Commodity", ""))) == commodity_norm
            and _norm(str(row.get("State", ""))) == state_norm
        ]
    if not filtered:
        filtered = [
            row
            for row in _load_rows()
            if _norm(str(row.get("Commodity", ""))) == commodity_norm
        ]

    filtered.sort(key=lambda row: row["Date"])
    formatted: list[dict[str, Any]] = []
    for row in filtered:
        ds_value = row["Date"]
        if hasattr(ds_value, "to_pydatetime"):
            ds_value = ds_value.to_pydatetime()
        if isinstance(ds_value, datetime):
            formatted.append({"ds": ds_value, "y": float(row["Modal Price"])})

    return formatted
