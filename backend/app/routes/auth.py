from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import (
    AuthUser,
    authenticate_user_credentials,
    issue_access_token_for_user,
    issue_refresh_token_for_user,
    register_user_credentials,
    revoke_refresh_token,
    rotate_refresh_token_for_session,
    require_auth_user,
)
from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.schemas import (
    AuthenticatedUser,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshTokenRequest,
    RegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_login_response(
    user: AuthUser,
    refresh_token: str | None = None,
    refresh_expires_in: int | None = None,
) -> LoginResponse:
    access_token, expires_in = issue_access_token_for_user(user)
    current_refresh_token = refresh_token
    current_refresh_expires_in = refresh_expires_in
    if current_refresh_token is None or current_refresh_expires_in is None:
        current_refresh_token, current_refresh_expires_in = issue_refresh_token_for_user(user)
    return LoginResponse(
        access_token=access_token,
        refresh_token=current_refresh_token,
        expires_in=expires_in,
        refresh_expires_in=current_refresh_expires_in,
        user=AuthenticatedUser(username=user["username"], role=user["role"]),
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    user = authenticate_user_credentials(payload.username, payload.password)
    if user is None:
        raise AuthenticationError("Invalid username or password.")
    return _build_login_response(user)


@router.post("/register", response_model=LoginResponse)
async def register(payload: RegisterRequest) -> LoginResponse:
    if not settings.auth_allow_signup:
        raise HTTPException(status_code=403, detail="User signup is disabled.")
    try:
        user = register_user_credentials(payload.username, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _build_login_response(user)


@router.post("/refresh", response_model=LoginResponse)
async def refresh(payload: RefreshTokenRequest) -> LoginResponse:
    rotated = rotate_refresh_token_for_session(payload.refresh_token)
    if rotated is None:
        raise AuthenticationError("Invalid or expired refresh token.")
    user, next_refresh_token, refresh_expires_in = rotated
    return _build_login_response(
        user,
        refresh_token=next_refresh_token,
        refresh_expires_in=refresh_expires_in,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(payload: LogoutRequest) -> LogoutResponse:
    revoke_refresh_token(payload.refresh_token)
    return LogoutResponse(success=True)


@router.get("/me", response_model=AuthenticatedUser)
async def me(
    user: Annotated[AuthUser, Depends(require_auth_user)],
) -> AuthenticatedUser:
    return AuthenticatedUser(username=user["username"], role=user["role"])
