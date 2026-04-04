from __future__ import annotations

import hashlib
from collections import defaultdict
from datetime import date, datetime
from typing import Any

from app.services.crop_prices import _load_rows


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def _safe_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def _to_date(value: Any) -> date | None:
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _stable_unit(*parts: str) -> float:
    payload = "|".join(parts).encode("utf-8")
    digest = hashlib.sha256(payload).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _latest_non_empty(rows: list[dict[str, Any]], keys: tuple[str, ...]) -> str:
    latest_value = ""
    latest_ds: date | None = None
    for row in rows:
        ds = _to_date(row.get("Date"))
        for key in keys:
            value = str(row.get(key, "")).strip()
            if not value:
                continue
            if latest_ds is None or (ds is not None and ds >= latest_ds):
                latest_ds = ds
                latest_value = value
    return latest_value


def _infer_state(rows: list[dict[str, Any]], market_norm: str) -> str | None:
    matches = {
        str(row.get("State", "")).strip()
        for row in rows
        if _norm(str(row.get("Market", ""))) == market_norm
    }
    matches.discard("")
    if len(matches) == 1:
        return next(iter(matches))
    return None


def _daily_average_series(rows: list[dict[str, Any]]) -> list[tuple[date, float]]:
    buckets: dict[date, list[float]] = defaultdict(list)
    for row in rows:
        ds = _to_date(row.get("Date"))
        price = _safe_float(row.get("Modal Price"))
        if ds is None or price is None:
            continue
        buckets[ds].append(price)

    points = sorted(
        (ds, sum(values) / len(values))
        for ds, values in buckets.items()
        if values
    )
    return points


def _projected_7d_change_pct(series: list[tuple[date, float]]) -> float:
    if len(series) < 2:
        return 0.0

    prices = [price for _, price in series[-10:]]
    current = prices[-1]
    if current <= 0:
        return 0.0

    slope = (prices[-1] - prices[0]) / max(1, len(prices) - 1)
    projected = current + (slope * 7.0)
    change_pct = ((projected - current) / current) * 100.0
    # Keep values practical for UI ranking when markets have noisy data.
    change_pct = max(-75.0, min(75.0, change_pct))
    return round(change_pct, 2)


def _estimate_distance_km(
    anchor_market: str,
    candidate_market: str,
    anchor_district: str | None,
    candidate_district: str | None,
    pincode: str | None,
) -> float:
    if _norm(anchor_market) == _norm(candidate_market):
        return 0.0

    same_district = (
        _norm(anchor_district) != ""
        and _norm(anchor_district) == _norm(candidate_district)
    )

    if same_district:
        base = 8.0
        spread = 20.0
    else:
        base = 25.0
        spread = 165.0

    jitter = _stable_unit(anchor_market, candidate_market, pincode or "")
    return round(base + (spread * jitter), 1)


def get_nearby_mandis(
    market: str | None,
    commodity: str | None,
    state: str | None = None,
    district: str | None = None,
    pincode: str | None = None,
    limit: int = 3,
) -> list[dict]:
    market_norm = _norm(market)
    commodity_norm = _norm(commodity)
    if not market_norm or not commodity_norm:
        return []

    rows = _load_rows()
    anchor_state = state or _infer_state(rows, market_norm)
    anchor_state_norm = _norm(anchor_state)

    anchor_rows = [
        row
        for row in rows
        if _norm(str(row.get("Market", ""))) == market_norm
        and (not anchor_state_norm or _norm(str(row.get("State", ""))) == anchor_state_norm)
    ]
    anchor_district = district or _latest_non_empty(anchor_rows, ("District", "District Name"))

    candidate_rows = [
        row
        for row in rows
        if _norm(str(row.get("Commodity", ""))) == commodity_norm
        and (
            not anchor_state_norm
            or _norm(str(row.get("State", ""))) == anchor_state_norm
        )
    ]
    if not candidate_rows:
        return []

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in candidate_rows:
        market_name = str(row.get("Market", "")).strip()
        if market_name:
            grouped[market_name].append(row)

    options: list[dict[str, Any]] = []
    for market_name, market_rows in grouped.items():
        series = _daily_average_series(market_rows)
        if len(series) < 2:
            continue

        current_price = round(series[-1][1], 2)
        expected_change = _projected_7d_change_pct(series)
        market_district = _latest_non_empty(market_rows, ("District", "District Name")) or "Unknown"
        distance_km = _estimate_distance_km(
            anchor_market=market or market_name,
            candidate_market=market_name,
            anchor_district=anchor_district,
            candidate_district=market_district,
            pincode=pincode,
        )

        options.append(
            {
                "mandi": market_name,
                "district": market_district,
                "distance_km": distance_km,
                "current_price": current_price,
                "expected_7d_change_pct": expected_change,
            }
        )

    if not options:
        return []

    options.sort(
        key=lambda item: (
            -float(item["expected_7d_change_pct"]),
            float(item["distance_km"]),
            str(item["mandi"]).casefold(),
        )
    )
    safe_limit = max(1, int(limit))
    return options[:safe_limit]
