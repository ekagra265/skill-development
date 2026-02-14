from __future__ import annotations

from datetime import date, datetime
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


def get_unique_states() -> list[str]:
    states = {
        str(row.get("State", "")).strip()
        for row in _load_rows()
    }
    states.discard("")
    return sorted(states)


def get_unique_commodities() -> list[str]:
    commodities = {
        str(row.get("Commodity", "")).strip()
        for row in _load_rows()
    }
    commodities.discard("")
    return sorted(commodities)


def get_markets_for_commodity(commodity: str) -> list[str]:
    commodity_norm = _norm(commodity)
    markets = {
        str(row.get("Market", "")).strip()
        for row in _load_rows()
        if _norm(str(row.get("Commodity", ""))) == commodity_norm
    }
    markets.discard("")
    return sorted(markets)


def _to_iso_date(value: Any) -> str | None:
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return None


def get_latest_crop_prices() -> list[dict[str, Any]]:
    target_commodities = ("Wheat", "Tomato", "Potato", "Onion")
    rows = _load_rows()
    result: list[dict[str, Any]] = []

    for commodity in target_commodities:
        commodity_rows = [
            row
            for row in rows
            if _norm(str(row.get("Commodity", ""))) == _norm(commodity)
        ]
        if not commodity_rows:
            continue

        dated_rows = [
            (row, _to_iso_date(row.get("Date")))
            for row in commodity_rows
        ]
        valid_rows = [(row, ds) for row, ds in dated_rows if ds]
        if not valid_rows:
            continue

        dates = sorted({ds for _, ds in valid_rows})
        if len(dates) < 2:
            avg_price = sum(float(row["Modal Price"]) for row, _ in valid_rows) / len(valid_rows)
            result.append(
                {
                    "name": commodity,
                    "price": round(avg_price),
                    "change": 0.0,
                    "trend": "flat",
                }
            )
            continue

        latest_date = dates[-1]
        previous_date = dates[-2]

        latest_rows = [row for row, ds in valid_rows if ds == latest_date]
        previous_rows = [row for row, ds in valid_rows if ds == previous_date]
        if not latest_rows or not previous_rows:
            continue

        latest_avg = sum(float(row["Modal Price"]) for row in latest_rows) / len(latest_rows)
        previous_avg = sum(float(row["Modal Price"]) for row in previous_rows) / len(previous_rows)
        change_pct = ((latest_avg - previous_avg) / previous_avg) * 100 if previous_avg else 0.0

        trend = "up" if change_pct > 0.5 else "down" if change_pct < -0.5 else "flat"
        result.append(
            {
                "name": commodity,
                "price": round(latest_avg),
                "change": round(change_pct, 1),
                "trend": trend,
            }
        )

    return result


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
