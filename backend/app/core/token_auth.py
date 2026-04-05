from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time


class TokenError(ValueError):
    """Raised when a token cannot be decoded or verified."""


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    try:
        return base64.urlsafe_b64decode(raw + padding)
    except Exception as exc:
        raise TokenError("Malformed token payload.") from exc


def _sign(message: str, secret_key: str) -> str:
    signature = hmac.new(
        secret_key.encode("utf-8"),
        message.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(signature)


def create_access_token(
    *,
    username: str,
    role: str,
    secret_key: str,
    expires_minutes: int,
    token_type: str = "access",
) -> tuple[str, int]:
    issued_at = int(time.time())
    expires_at = issued_at + max(1, int(expires_minutes)) * 60
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": username,
        "role": role,
        "token_type": token_type,
        "iat": issued_at,
        "exp": expires_at,
    }
    header_part = _b64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    payload_part = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header_part}.{payload_part}"
    signature_part = _sign(signing_input, secret_key)
    token = f"{signing_input}.{signature_part}"
    return token, expires_at - issued_at


def decode_access_token(token: str, *, secret_key: str) -> dict:
    token = token.strip()
    if not token:
        raise TokenError("Missing token.")

    parts = token.split(".")
    if len(parts) != 3:
        raise TokenError("Malformed token.")

    header_part, payload_part, signature_part = parts
    signing_input = f"{header_part}.{payload_part}"
    expected_signature = _sign(signing_input, secret_key)
    if not hmac.compare_digest(signature_part, expected_signature):
        raise TokenError("Invalid token signature.")

    try:
        payload = json.loads(_b64url_decode(payload_part).decode("utf-8"))
    except Exception as exc:
        raise TokenError("Malformed token payload.") from exc

    if not isinstance(payload, dict):
        raise TokenError("Malformed token payload.")

    expires_at = int(payload.get("exp", 0))
    if expires_at <= int(time.time()):
        raise TokenError("Token expired.")

    return payload
