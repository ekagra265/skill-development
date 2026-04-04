"""
Persistent user auth storage backed by SQLite.
Stores users, password hashes, and refresh tokens.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import TypedDict

from app.core.config import settings

_HERE = Path(__file__).resolve()
_DATA_DIR = _HERE.parents[3] / "data"
_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]{3,32}$")
_PBKDF2_ALGORITHM = "sha256"
_PBKDF2_ITERATIONS = 390_000
_SALT_BYTES = 16
_INIT_LOCK = Lock()
_INITIALIZED = False


class AuthRecord(TypedDict):
    id: int
    username: str
    role: str
    is_active: bool


def _db_path() -> Path:
    configured = settings.auth_db_path.strip()
    if configured:
        return Path(configured).resolve()
    return (_DATA_DIR / "auth.db").resolve()


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _connect() -> sqlite3.Connection:
    db_path = _db_path()
    _ensure_parent(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _to_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def _from_iso(raw: str) -> datetime:
    parsed = datetime.fromisoformat(raw)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def _validate_username(username: str) -> str:
    normalized = _normalize_username(username)
    if not normalized:
        raise ValueError("Username is required.")
    if not _USERNAME_PATTERN.match(normalized):
        raise ValueError(
            "Username must be 3-32 chars and may include letters, numbers, ., _, -."
        )
    return normalized


def _validate_password(password: str) -> str:
    normalized = password.strip()
    if len(normalized) < max(4, settings.auth_password_min_length):
        raise ValueError(
            f"Password must be at least {max(4, settings.auth_password_min_length)} characters."
        )
    return normalized


def _hash_password(password: str, *, salt: bytes | None = None) -> str:
    real_salt = salt or os.urandom(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        _PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        real_salt,
        _PBKDF2_ITERATIONS,
    )
    salt_b64 = base64.b64encode(real_salt).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt_b64}${digest_b64}"


def _verify_password(password: str, encoded_hash: str) -> bool:
    try:
        scheme, iterations_raw, salt_b64, digest_b64 = encoded_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(digest_b64.encode("ascii"))
    except Exception:
        return False

    digest = hashlib.pbkdf2_hmac(
        _PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        max(1, iterations),
    )
    return hmac.compare_digest(digest, expected)


def _normalize_role(role: str) -> str:
    normalized = role.strip().lower()
    if not normalized:
        return "user"
    if normalized not in {"user", "admin"}:
        return "user"
    return normalized


def _hash_refresh_token(raw: str) -> str:
    return hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _row_to_auth_record(row: sqlite3.Row) -> AuthRecord:
    return {
        "id": int(row["id"]),
        "username": str(row["username"]),
        "role": str(row["role"] or "user"),
        "is_active": bool(int(row["is_active"])),
    }


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            token_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            issued_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked_at TEXT,
            replaced_by_token_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)"
    )


def _bootstrap_demo_user(conn: sqlite3.Connection) -> None:
    if not settings.auth_bootstrap_demo_user:
        return
    try:
        username = _validate_username(settings.auth_demo_username)
        password = _validate_password(settings.auth_demo_password)
    except ValueError:
        return
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if existing is not None:
        return

    now = _to_iso(_utc_now())
    conn.execute(
        """
        INSERT INTO users(username, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
        """,
        (
            username,
            _hash_password(password),
            "admin",
            now,
            now,
        ),
    )


def _initialize() -> None:
    global _INITIALIZED
    if _INITIALIZED:
        return
    with _INIT_LOCK:
        if _INITIALIZED:
            return
        with _connect() as conn:
            _ensure_schema(conn)
            _bootstrap_demo_user(conn)
            conn.commit()
        _INITIALIZED = True


def create_user(username: str, password: str, role: str = "user") -> AuthRecord:
    _initialize()
    normalized_username = _validate_username(username)
    normalized_password = _validate_password(password)
    normalized_role = _normalize_role(role)
    now = _to_iso(_utc_now())
    try:
        with _connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO users(username, password_hash, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)
                """,
                (
                    normalized_username,
                    _hash_password(normalized_password),
                    normalized_role,
                    now,
                    now,
                ),
            )
            conn.commit()
            row = conn.execute(
                "SELECT id, username, role, is_active FROM users WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as exc:
        raise ValueError("Username already exists.") from exc
    if row is None:
        raise RuntimeError("User creation failed.")
    return _row_to_auth_record(row)


def get_active_user_by_username(username: str) -> AuthRecord | None:
    _initialize()
    normalized_username = _normalize_username(username)
    if not normalized_username:
        return None
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, username, role, is_active
            FROM users
            WHERE username = ? AND is_active = 1
            """,
            (normalized_username,),
        ).fetchone()
    if row is None:
        return None
    return _row_to_auth_record(row)


def authenticate_user(username: str, password: str) -> AuthRecord | None:
    _initialize()
    normalized_username = _normalize_username(username)
    if not normalized_username:
        return None
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, username, role, is_active, password_hash
            FROM users
            WHERE username = ?
            """,
            (normalized_username,),
        ).fetchone()
    if row is None:
        return None
    if not bool(int(row["is_active"])):
        return None
    if not _verify_password(password, str(row["password_hash"])):
        return None
    return {
        "id": int(row["id"]),
        "username": str(row["username"]),
        "role": str(row["role"] or "user"),
        "is_active": True,
    }


def create_refresh_token(user_id: int) -> tuple[str, int]:
    _initialize()
    now = _utc_now()
    expires_at = now + timedelta(days=max(1, settings.auth_refresh_token_exp_days))
    raw_token = secrets.token_urlsafe(48)
    token_id = uuid.uuid4().hex
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO refresh_tokens(token_id, user_id, token_hash, issued_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                token_id,
                int(user_id),
                _hash_refresh_token(raw_token),
                _to_iso(now),
                _to_iso(expires_at),
            ),
        )
        conn.commit()
    return raw_token, int((expires_at - now).total_seconds())


def rotate_refresh_token(refresh_token: str) -> tuple[AuthRecord, str, int] | None:
    _initialize()
    token = refresh_token.strip()
    if not token:
        return None

    token_hash = _hash_refresh_token(token)
    now = _utc_now()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                rt.token_id,
                rt.user_id,
                rt.expires_at,
                rt.revoked_at,
                u.id AS uid,
                u.username,
                u.role,
                u.is_active
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = ?
            """,
            (token_hash,),
        ).fetchone()
        if row is None:
            return None
        if bool(int(row["is_active"])) is False:
            return None
        if row["revoked_at"] is not None:
            return None
        if _from_iso(str(row["expires_at"])) <= now:
            conn.execute(
                "UPDATE refresh_tokens SET revoked_at = ? WHERE token_id = ?",
                (_to_iso(now), str(row["token_id"])),
            )
            conn.commit()
            return None

        new_token = secrets.token_urlsafe(48)
        new_token_id = uuid.uuid4().hex
        new_expires_at = now + timedelta(days=max(1, settings.auth_refresh_token_exp_days))
        updated = conn.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = ?, replaced_by_token_id = ?
            WHERE token_id = ? AND revoked_at IS NULL
            """,
            (
                _to_iso(now),
                new_token_id,
                str(row["token_id"]),
            ),
        )
        if updated.rowcount < 1:
            conn.rollback()
            return None

        conn.execute(
            """
            INSERT INTO refresh_tokens(token_id, user_id, token_hash, issued_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                new_token_id,
                int(row["uid"]),
                _hash_refresh_token(new_token),
                _to_iso(now),
                _to_iso(new_expires_at),
            ),
        )
        conn.commit()

    user: AuthRecord = {
        "id": int(row["uid"]),
        "username": str(row["username"]),
        "role": str(row["role"] or "user"),
        "is_active": True,
    }
    return user, new_token, int((new_expires_at - now).total_seconds())


def revoke_refresh_token(refresh_token: str) -> bool:
    _initialize()
    token = refresh_token.strip()
    if not token:
        return False
    token_hash = _hash_refresh_token(token)
    with _connect() as conn:
        cursor = conn.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = ?
            WHERE token_hash = ? AND revoked_at IS NULL
            """,
            (_to_iso(_utc_now()), token_hash),
        )
        conn.commit()
    return cursor.rowcount > 0


def get_auth_store_status() -> dict:
    _initialize()
    with _connect() as conn:
        user_count = int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])
        active_tokens = int(
            conn.execute(
                """
                SELECT COUNT(*)
                FROM refresh_tokens
                WHERE revoked_at IS NULL
                """
            ).fetchone()[0]
        )
    return {
        "backend": "sqlite",
        "path": str(_db_path()),
        "total_users": user_count,
        "active_refresh_tokens": active_tokens,
    }
