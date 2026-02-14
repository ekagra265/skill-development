from __future__ import annotations

from time import perf_counter
from typing import Annotated

from fastapi import Depends, FastAPI, Request
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
    get_unique_commodities,
    get_unique_states,
)

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return {"status": "ok", "service": settings.app_name}


@app.get("/metadata")
async def metadata(
    _: Annotated[None, Depends(require_api_key)],
    commodity: str | None = None,
) -> dict:
    try:
        if commodity:
            return {
                "commodity": commodity,
                "markets": get_markets_for_commodity(commodity),
            }
        return {
            "states": get_unique_states(),
            "commodities": get_unique_commodities(),
            "cropPrices": get_latest_crop_prices(),
        }
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
    # CHANGED: Thin controller, delegates business logic to forecast pipeline service.
    result = run_forecast_pipeline(payload)
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
