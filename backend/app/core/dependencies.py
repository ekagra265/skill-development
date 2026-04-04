from __future__ import annotations

import secrets
from typing import Any, Callable, TypedDict

from fastapi import Header, Query

from app.core.config import settings
from app.core.exceptions import AuthenticationError, DataNotFoundError, ForecastError
from app.core.logger import logger
from app.core.token_auth import TokenError, create_access_token, decode_access_token
from app.schemas import ForecastRequest
from app.services.forecast_pipeline import ForecastPipelineResult, run_forecast_pipeline
from app.services.mandi_compare import select_best_mandis

ForecastService = Callable[[ForecastRequest], ForecastPipelineResult]


class AuthUser(TypedDict):
    username: str
    role: str


def get_forecast_service() -> ForecastService:
    return run_forecast_pipeline


def require_api_key(
    x_api_key: str | None = Header(default=None, alias=settings.api_key_header),
    x_api_key_query: str | None = Query(default=None, alias="x_api_key"),
) -> None:
    if not settings.api_key_enabled:
        return

    token = x_api_key or x_api_key_query
    if not token or not secrets.compare_digest(token, settings.api_key):
        logger.warning("Unauthorized request blocked due to invalid API key.")
        raise AuthenticationError("Invalid or missing API key.")


def authenticate_demo_user(username: str, password: str) -> AuthUser | None:
    normalized_username = username.strip()
    if not normalized_username:
        return None

    if not secrets.compare_digest(normalized_username, settings.auth_demo_username):
        return None
    if not secrets.compare_digest(password, settings.auth_demo_password):
        return None

    return {"username": normalized_username, "role": "admin"}


def issue_access_token_for_user(user: AuthUser) -> tuple[str, int]:
    return create_access_token(
        username=user["username"],
        role=user["role"],
        secret_key=settings.auth_secret_key,
        expires_minutes=settings.auth_token_exp_minutes,
    )


def require_auth_user(
    authorization: str | None = Header(default=None),
    access_token_query: str | None = Query(default=None, alias="access_token"),
) -> AuthUser:
    if not settings.auth_enabled:
        return {"username": "local-dev", "role": "admin"}

    token = access_token_query
    if authorization and authorization.strip().lower().startswith("bearer "):
        token = authorization.strip()[7:].strip()

    if not token:
        raise AuthenticationError("Missing bearer token.")

    try:
        payload = decode_access_token(token, secret_key=settings.auth_secret_key)
    except TokenError as exc:
        raise AuthenticationError(str(exc)) from exc

    username = str(payload.get("sub", "")).strip()
    role = str(payload.get("role", "user")).strip() or "user"
    if not username:
        raise AuthenticationError("Invalid token payload.")

    return {"username": username, "role": role}


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
