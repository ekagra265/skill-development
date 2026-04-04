from __future__ import annotations

from datetime import date, datetime
from functools import lru_cache
from importlib import import_module
from pathlib import Path
from time import perf_counter
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.core.config import settings
from app.core.logger import logger


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
    "District Name": "District",
    "Market Name": "Market",
}

_ROWS_SOURCE = "unknown"
_ROWS_SOURCE_DETAIL = ""


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def _clean_key(value: str) -> str:
    return "".join(ch for ch in value.casefold() if ch.isalnum())


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


def _pick_field(record: dict[str, Any], aliases: tuple[str, ...]) -> Any:
    normalized = {_clean_key(str(k)): v for k, v in record.items()}
    for alias in aliases:
        key = _clean_key(alias)
        if key in normalized:
            return normalized[key]
    return None


def _parse_remote_date(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None

    known_formats = (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d-%m-%y",
        "%d/%m/%y",
        "%d-%b-%y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
    )
    for fmt in known_formats:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    pd = _pd()
    parsed = pd.to_datetime(text, errors="coerce", dayfirst=True)
    if hasattr(parsed, "to_pydatetime"):
        return parsed.to_pydatetime()
    return None


def _parse_remote_price(value: Any) -> float | None:
    text = str(value or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _normalize_remote_record(record: dict[str, Any]) -> dict[str, Any] | None:
    parsed_date = _parse_remote_date(
        _pick_field(record, ("Date", "Arrival_Date", "Price Date"))
    )
    parsed_price = _parse_remote_price(
        _pick_field(record, ("Modal Price", "Modal_Price", "modal_price"))
    )

    state = str(_pick_field(record, ("State", "STATE")) or "").strip()
    district = str(_pick_field(record, ("District", "District Name")) or "").strip()
    market = str(_pick_field(record, ("Market", "Market Name")) or "").strip()
    commodity = str(_pick_field(record, ("Commodity",)) or "").strip()

    if (
        parsed_date is None
        or parsed_price is None
        or not state
        or not market
        or not commodity
    ):
        return None

    return {
        "Date": parsed_date,
        "Modal Price": parsed_price,
        "State": state,
        "District": district,
        "Market": market,
        "Commodity": commodity,
    }


def _http_session() -> requests.Session:
    # data.gov.in can occasionally reset connections; retries reduce transient failures.
    retry = Retry(
        total=2,
        connect=2,
        read=2,
        backoff_factor=0.3,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(
        {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (AgriPulse/1.0; +https://api.data.gov.in)",
        }
    )
    return session


def _load_rows_from_local_dataset() -> list[dict[str, Any]]:
    pd = _pd()
    dataset_path = _resolve_dataset_path()
    frame = pd.read_csv(dataset_path).rename(columns=COLUMN_RENAMES)

    required_columns = {"Date", "Modal Price", "State", "Market", "Commodity"}
    missing_columns = sorted(required_columns - set(frame.columns))
    if missing_columns:
        raise ValueError(
            "Dataset is missing required columns: " + ", ".join(missing_columns)
        )

    frame["Date"] = pd.to_datetime(frame["Date"], errors="coerce", dayfirst=True)
    frame["Modal Price"] = pd.to_numeric(frame["Modal Price"], errors="coerce")

    for column in ("State", "District", "Market", "Commodity"):
        if column not in frame.columns:
            continue
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

    logger.info("Loaded %s rows from local dataset: %s", len(frame), dataset_path)
    return frame.to_dict(orient="records")


def _load_rows_from_data_gov() -> list[dict[str, Any]]:
    api_key = settings.data_gov_api_key.strip()
    resource_id = settings.data_gov_resource_id.strip()
    if not api_key or not resource_id:
        raise ValueError("Missing data.gov.in API key or resource id.")

    endpoint = f"{settings.data_gov_base_url.rstrip('/')}/{resource_id}"
    page_size = max(1, min(int(settings.data_gov_page_size), 1000))
    max_records = max(page_size, int(settings.data_gov_max_records))
    total_timeout = max(5.0, float(settings.data_gov_total_timeout_sec))

    rows: list[dict[str, Any]] = []
    offset = 0
    started_at = perf_counter()

    with _http_session() as session:
        while offset < max_records:
            if perf_counter() - started_at > total_timeout:
                logger.warning(
                    "Stopping data.gov.in fetch early after %.1fs (rows=%s)",
                    total_timeout,
                    len(rows),
                )
                break

            limit = min(page_size, max_records - offset)
            response = session.get(
                endpoint,
                params={
                    "api-key": api_key,
                    "format": "json",
                    "offset": offset,
                    "limit": limit,
                    "fields": "State,District,Market,Commodity,Arrival_Date,Modal_Price",
                },
                headers={"api-key": api_key},
                timeout=float(settings.data_gov_timeout_sec),
            )
            response.raise_for_status()

            payload = response.json()
            records = payload.get("records") or []
            if not isinstance(records, list):
                raise ValueError("Unexpected data.gov.in response: 'records' must be a list.")

            if not records:
                break

            for record in records:
                if not isinstance(record, dict):
                    continue
                normalized = _normalize_remote_record(record)
                if normalized:
                    rows.append(normalized)

            if len(records) < limit:
                break

            offset += limit

    if len(rows) < 30:
        raise ValueError(
            f"data.gov.in returned only {len(rows)} usable rows; need at least 30."
        )

    logger.info(
        "Loaded %s rows from data.gov.in resource=%s",
        len(rows),
        resource_id,
    )
    return rows


def _resolve_source_mode() -> str:
    raw = (settings.price_source or "").strip().casefold()
    if raw in {"local_csv", "local", "csv"}:
        return "local_csv"
    if raw in {"data_gov", "datagov", "api"}:
        return "data_gov"
    if raw == "auto":
        return "auto"

    logger.warning(
        "Unknown AGRIPULSE_PRICE_SOURCE='%s'; defaulting to local_csv.",
        settings.price_source,
    )
    return "local_csv"


@lru_cache(maxsize=1)
def _load_rows() -> list[dict[str, Any]]:
    global _ROWS_SOURCE, _ROWS_SOURCE_DETAIL
    source_mode = _resolve_source_mode()

    if source_mode == "local_csv":
        rows = _load_rows_from_local_dataset()
        _ROWS_SOURCE = "local_csv"
        _ROWS_SOURCE_DETAIL = "forced local dataset"
        return rows

    # data_gov / auto mode
    fallback_reason = ""
    if settings.data_gov_api_key.strip() and settings.data_gov_resource_id.strip():
        try:
            rows = _load_rows_from_data_gov()
            _ROWS_SOURCE = "data_gov"
            _ROWS_SOURCE_DETAIL = f"resource={settings.data_gov_resource_id}"
            return rows
        except Exception as exc:
            fallback_reason = str(exc)
            logger.warning("Falling back to local dataset; data.gov.in fetch failed: %s", exc)
    else:
        fallback_reason = "Missing data.gov.in key/resource id"

    rows = _load_rows_from_local_dataset()
    _ROWS_SOURCE = "local_csv"
    if source_mode == "data_gov":
        _ROWS_SOURCE_DETAIL = f"fallback from data_gov: {fallback_reason}"
    else:
        _ROWS_SOURCE_DETAIL = fallback_reason or "using local dataset"
    return rows


def get_rows_source_info() -> dict[str, str | None]:
    # Ensure data is loaded at least once so source info is meaningful.
    _load_rows()
    return {
        "source": _ROWS_SOURCE,
        "detail": _ROWS_SOURCE_DETAIL or None,
    }


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


def get_latest_crop_prices(limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, int(limit))
    rows = _load_rows()
    result: list[dict[str, Any]] = []
    commodities = sorted(
        {
            str(row.get("Commodity", "")).strip()
            for row in rows
            if str(row.get("Commodity", "")).strip()
        }
    )

    for commodity in commodities:
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

    result.sort(key=lambda item: (-float(item["price"]), str(item["name"]).casefold()))
    return result[:safe_limit]


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
