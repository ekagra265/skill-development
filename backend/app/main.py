from __future__ import annotations

from copy import deepcopy
from threading import Lock
from time import perf_counter
from typing import Annotated

from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.core.config import settings
from app.core.dependencies import (
    ForecastService,
    MandiComparisonService,
    get_forecast_service,
    get_mandi_comparison_service,
    require_api_key,
)
from app.core.exceptions import AuthenticationError, DataNotFoundError, ForecastError
from app.core.logger import logger
from app.schemas import ForecastRequest, ForecastResponse
from app.services.crop_prices import (
    get_latest_crop_prices,
    get_markets_for_commodity,
    get_rows_source_info,
    get_unique_commodities,
    get_unique_states,
)
from app.services.report_storage import get_report_store_status

# ── NEW: import reports router ─────────────────────────────────────────────────
from app.routes.reports import router as reports_router

_METADATA_CACHE_TTL_SEC = 20.0
_metadata_cache_lock = Lock()
_metadata_cache: dict[tuple[str | None, int], tuple[float, dict]] = {}
_FORECAST_CACHE_TTL_SEC = 45.0
_forecast_cache_lock = Lock()
_forecast_cache: dict[tuple[str, str, str | None, str | None, int, str], tuple[float, dict]] = {}
_forecast_cache_hits = 0
_forecast_cache_misses = 0

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── NEW: register reports router ───────────────────────────────────────────────
app.include_router(reports_router)


def _cache_key(commodity: str | None, top_crops: int) -> tuple[str | None, int]:
    normalized = (commodity or "").strip().casefold() or None
    safe_top_crops = max(1, int(top_crops))
    return normalized, safe_top_crops


def _cache_get(key: tuple[str | None, int]) -> dict | None:
    now = perf_counter()
    with _metadata_cache_lock:
        hit = _metadata_cache.get(key)
        if hit is None:
            return None
        ts, payload = hit
        if now - ts > _METADATA_CACHE_TTL_SEC:
            _metadata_cache.pop(key, None)
            return None
        return payload


def _cache_set(key: tuple[str | None, int], payload: dict) -> None:
    with _metadata_cache_lock:
        _metadata_cache[key] = (perf_counter(), payload)


def _normalize_token(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().casefold()
    return normalized or None


def _forecast_cache_key(
    payload: ForecastRequest,
) -> tuple[str, str, str | None, str | None, int, str]:
    return (
        _normalize_token(payload.crop) or "",
        _normalize_token(payload.mandi) or "",
        _normalize_token(payload.district),
        _normalize_token(payload.pincode),
        int(payload.days),
        payload.language or "en",
    )


def _forecast_cache_get(
    key: tuple[str, str, str | None, str | None, int, str]
) -> dict | None:
    global _forecast_cache_hits, _forecast_cache_misses
    now = perf_counter()
    with _forecast_cache_lock:
        hit = _forecast_cache.get(key)
        if hit is None:
            _forecast_cache_misses += 1
            return None
        ts, payload = hit
        if now - ts > _FORECAST_CACHE_TTL_SEC:
            _forecast_cache.pop(key, None)
            _forecast_cache_misses += 1
            return None
        _forecast_cache_hits += 1
        return deepcopy(payload)


def _forecast_cache_set(
    key: tuple[str, str, str | None, str | None, int, str], payload: dict
) -> None:
    with _forecast_cache_lock:
        _forecast_cache[key] = (perf_counter(), deepcopy(payload))
        if len(_forecast_cache) > 500:
            now = perf_counter()
            expired = [k for k, (ts, _) in _forecast_cache.items() if now - ts > _FORECAST_CACHE_TTL_SEC]
            for cache_key in expired:
                _forecast_cache.pop(cache_key, None)
            while len(_forecast_cache) > 500:
                oldest_key = min(_forecast_cache, key=lambda candidate: _forecast_cache[candidate][0])
                _forecast_cache.pop(oldest_key, None)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration = perf_counter() - start_time
        logger.exception(
            "%s %s status=500 time=%.2fs",
            request.method,
            request.url.path,
            duration,
        )
        raise

    duration = perf_counter() - start_time
    logger.info(
        "%s %s status=%s time=%.2fs",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    return response


@app.exception_handler(DataNotFoundError)
async def data_not_found_exception_handler(_: Request, exc: DataNotFoundError) -> JSONResponse:
    logger.exception("Data not found: %s", exc)
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(AuthenticationError)
async def authentication_exception_handler(_: Request, exc: AuthenticationError) -> JSONResponse:
    logger.warning("Authentication failed: %s", exc)
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(ForecastError)
async def forecast_exception_handler(_: Request, exc: ForecastError) -> JSONResponse:
    logger.exception("Forecast processing failed: %s", exc)
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health")
def health() -> dict:
    report_store = get_report_store_status()
    with _forecast_cache_lock:
        forecast_cache_status = {
            "ttl_sec": _FORECAST_CACHE_TTL_SEC,
            "entries": len(_forecast_cache),
            "hits": _forecast_cache_hits,
            "misses": _forecast_cache_misses,
        }
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "price_source": settings.price_source,
        "report_store": report_store,
        "forecast_cache": forecast_cache_status,
    }


@app.get("/metadata")
async def metadata(
    _: Annotated[None, Depends(require_api_key)],
    commodity: str | None = None,
    top_crops: Annotated[int, Query(ge=1, le=500)] = 50,
) -> dict:
    try:
        key = _cache_key(commodity, top_crops)
        cached = _cache_get(key)
        if cached is not None:
            return cached

        if commodity:
            payload = {
                "commodity": commodity,
                "markets": get_markets_for_commodity(commodity),
                "dataSource": get_rows_source_info(),
            }
        else:
            payload = {
                "states": get_unique_states(),
                "commodities": get_unique_commodities(),
                "cropPrices": get_latest_crop_prices(limit=top_crops),
                "dataSource": get_rows_source_info(),
            }

        _cache_set(key, payload)
        return payload
    except FileNotFoundError as exc:
        raise DataNotFoundError(str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise ForecastError(str(exc)) from exc


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(
    payload: ForecastRequest,
    _: Annotated[None, Depends(require_api_key)],
    run_forecast_pipeline: Annotated[ForecastService, Depends(get_forecast_service)],
) -> ForecastResponse:
    cache_key = _forecast_cache_key(payload)
    cached = _forecast_cache_get(cache_key)
    if cached is not None:
        logger.info(
            "Forecast cache hit | crop=%s | mandi=%s | days=%s | language=%s",
            payload.crop,
            payload.mandi,
            payload.days,
            payload.language,
        )
        return ForecastResponse(**cached)

    result = run_forecast_pipeline(payload)
    _forecast_cache_set(cache_key, result)
    return ForecastResponse(**result)


@app.get("/best-mandi")
async def best_mandi(
    state: str,
    commodity: str,
    _: Annotated[None, Depends(require_api_key)],
    mandi_service: Annotated[MandiComparisonService, Depends(get_mandi_comparison_service)],
    days: int = 7,
    limit: int = 3,
) -> dict:
    return mandi_service.select_best(
        state=state,
        commodity=commodity,
        days=days,
        limit=limit,
    )
