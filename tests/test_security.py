import jwt

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_same_password_gets_different_hashes_because_of_random_salt():
    password = "StrongPassword!123"
    first = hash_password(password)
    second = hash_password(password)

    assert first != second
    assert first.startswith("$argon2id$")
    assert second.startswith("$argon2id$")
    assert verify_password(first, password)
    assert verify_password(second, password)


def test_wrong_password_is_rejected():
    encoded = hash_password("StrongPassword!123")
    assert verify_password(encoded, "wrong-password") is False


def test_access_token_round_trip():
    token, expires_in = create_access_token(user_id=42, login="dispatcher")
    payload = decode_access_token(token)

    assert payload["sub"] == "42"
    assert payload["login"] == "dispatcher"
    assert payload["type"] == "access"
    assert expires_in > 0


def test_malformed_token_is_rejected():
    try:
        decode_access_token("not-a-jwt")
    except jwt.InvalidTokenError:
        pass
    else:
        raise AssertionError("Malformed JWT must be rejected")
