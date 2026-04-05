from __future__ import annotations

import secrets
from typing import Any, Callable, TypedDict

from fastapi import Header, Query

from app.core.config import settings
from app.core.exceptions import AuthenticationError, DataNotFoundError, ForecastError
from app.core.logger import logger
from app.core.token_auth import TokenError, create_access_token, decode_access_token
from app.schemas import ForecastRequest
from app.services.auth_storage import (
    authenticate_user,
    create_refresh_token,
    create_user,
    get_active_user_by_username,
    rotate_refresh_token,
    revoke_refresh_token as revoke_refresh_token_in_store,
)
from app.services.forecast_pipeline import ForecastPipelineResult, run_forecast_pipeline
from app.services.mandi_compare import select_best_mandis

ForecastService = Callable[[ForecastRequest], ForecastPipelineResult]


class AuthUser(TypedDict):
    id: int
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


def authenticate_user_credentials(username: str, password: str) -> AuthUser | None:
    user = authenticate_user(username, password)
    if user is None:
        return None
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
    }


def register_user_credentials(username: str, password: str) -> AuthUser:
    user = create_user(username=username, password=password, role="user")
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
    }


def issue_access_token_for_user(user: AuthUser) -> tuple[str, int]:
    return create_access_token(
        username=user["username"],
        role=user["role"],
        secret_key=settings.auth_secret_key,
        expires_minutes=settings.auth_token_exp_minutes,
        token_type="access",
    )


def issue_refresh_token_for_user(user: AuthUser) -> tuple[str, int]:
    return create_refresh_token(user_id=user["id"])


def rotate_refresh_token_for_session(
    refresh_token: str,
) -> tuple[AuthUser, str, int] | None:
    rotated = rotate_refresh_token(refresh_token)
    if rotated is None:
        return None
    user, next_refresh_token, refresh_expires_in = rotated
    return (
        {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
        },
        next_refresh_token,
        refresh_expires_in,
    )


def revoke_refresh_token(refresh_token: str) -> bool:
    return revoke_refresh_token_in_store(refresh_token)


def require_auth_user(
    authorization: str | None = Header(default=None),
    access_token_query: str | None = Query(default=None, alias="access_token"),
) -> AuthUser:
    if not settings.auth_enabled:
        return {"id": 0, "username": "local-dev", "role": "admin"}

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
    token_type = str(payload.get("token_type", "access")).strip().lower() or "access"
    if token_type != "access":
        raise AuthenticationError("Invalid access token.")

    if not username:
        raise AuthenticationError("Invalid token payload.")
    user = get_active_user_by_username(username)
    if user is None:
        raise AuthenticationError("User not found or inactive.")

    return {"id": user["id"], "username": user["username"], "role": user["role"]}


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
