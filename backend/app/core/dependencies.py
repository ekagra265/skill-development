from __future__ import annotations

import secrets
from typing import Any, Callable

from fastapi import Header, Query

from app.core.config import settings
from app.core.exceptions import AuthenticationError, DataNotFoundError, ForecastError
from app.core.logger import logger
from app.schemas import ForecastRequest
from app.services.forecast_pipeline import ForecastPipelineResult, run_forecast_pipeline
from app.services.mandi_compare import select_best_mandis

ForecastService = Callable[[ForecastRequest], ForecastPipelineResult]


def get_forecast_service() -> ForecastService:
    return run_forecast_pipeline


def require_api_key(
    x_api_key: str | None = Header(default=None, alias=settings.api_key_header),
    x_api_key_query: str | None = Query(default=None, alias="x_api_key"),
) -> None:
    token = x_api_key or x_api_key_query
    if not token or not secrets.compare_digest(token, settings.api_key):
        logger.warning("Unauthorized request blocked due to invalid API key.")
        raise AuthenticationError("Invalid or missing API key.")


class MandiComparisonService:
    def select_best(
        self,
        state: str,
        commodity: str,
        days: int = 7,
        limit: int = 3,
    ) -> dict[str, Any]:
        try:
            return select_best_mandis(
                state=state,
                commodity=commodity,
                days=days,
                limit=limit,
            )
        except FileNotFoundError as exc:
            raise DataNotFoundError(str(exc)) from exc
        except ValueError as exc:
            raise DataNotFoundError(str(exc)) from exc
        except RuntimeError as exc:
            raise ForecastError(str(exc)) from exc


def get_mandi_comparison_service() -> MandiComparisonService:
    return MandiComparisonService()
