from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import (
    AuthUser,
    authenticate_demo_user,
    issue_access_token_for_user,
    require_auth_user,
)
from app.core.exceptions import AuthenticationError
from app.schemas import AuthenticatedUser, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    user = authenticate_demo_user(payload.username, payload.password)
    if user is None:
        raise AuthenticationError("Invalid username or password.")

    access_token, expires_in = issue_access_token_for_user(user)
    return LoginResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=AuthenticatedUser(username=user["username"], role=user["role"]),
    )


@router.get("/me", response_model=AuthenticatedUser)
async def me(
    user: Annotated[AuthUser, Depends(require_auth_user)],
) -> AuthenticatedUser:
    return AuthenticatedUser(username=user["username"], role=user["role"])
