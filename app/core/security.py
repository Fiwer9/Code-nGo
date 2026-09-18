from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.settings import settings

# Argon2id parameters. PasswordHasher creates a new cryptographically-random
# salt on every hash() call and stores it inside the encoded Argon2 string.
password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # KiB = 64 MiB
    parallelism=2,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

# Used when the login/email does not exist so that the endpoint still performs
# an Argon2 verification and does not trivially leak account existence by timing.
DUMMY_PASSWORD_HASH = password_hasher.hash("dummy-password-never-used-for-login")


def hash_password(plain_password: str) -> str:
    """Return an Argon2id encoded hash with a unique random salt."""
    if not plain_password:
        raise ValueError("Password must not be empty")
    return password_hasher.hash(plain_password)


def verify_password(stored_hash: str, plain_password: str) -> bool:
    """Verify plaintext password against an Argon2 encoded hash."""
    try:
        return password_hasher.verify(stored_hash, plain_password)
    except (VerifyMismatchError, InvalidHashError, VerificationError):
        return False


def password_needs_rehash(stored_hash: str) -> bool:
    """Return True when hash parameters should be upgraded after a valid login."""
    try:
        return password_hasher.check_needs_rehash(stored_hash)
    except InvalidHashError:
        return False


def create_access_token(user_id: int, login: str) -> tuple[str, int]:
    """Create a signed short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "login": login,
        "type": "access",
        "iat": now,
        "exp": expires_at,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, int((expires_at - now).total_seconds())


def decode_access_token(token: str) -> dict[str, Any]:
    """Validate and decode a JWT access token."""
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return payload
