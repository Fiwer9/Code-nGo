from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.settings import settings

# Настройки параметров Argon2id.
# PasswordHasher автоматически генерирует уникальную криптографически стойкую
# соль при каждом вызове hash() и запекает её в итоговую строку PHC.
password_hasher = PasswordHasher(
    time_cost=3,          # Количество итераций (защита от перебора)
    memory_cost=65536,    # Использование памяти: 64 МБ (65536 КиБ, защита от GPU/ASIC)
    parallelism=2,        # Количество параллельных потоков CPU
    hash_len=32,          # Длина итогового хэша в байтах
    salt_len=16,          # Длина уникальной случайной соли в байтах
    type=Type.ID,         # Режим Argon2id (гибридный: защита от сторонних каналов и GPU)
)

# Заглушка хэша для защиты от атак по времени (Timing Attacks).
# Используется, если пользователь с указанным login/email не найден в базе данных,
# чтобы эндпоинт выполнял проверку за то же время и не раскрывал факт существования аккаунта.
DUMMY_PASSWORD_HASH = password_hasher.hash("dummy-password-never-used-for-login")


def hash_password(plain_password: str) -> str:
    """Хэширует открытый пароль с использованием Argon2id и уникальной случайной соли."""
    if not plain_password:
        raise ValueError("Пароль не может быть пустым")
    return password_hasher.hash(plain_password)


def verify_password(stored_hash: str, plain_password: str) -> bool:
    """Проверяет открытый пароль на соответствие сохраненному Argon2id-хэшу."""
    try:
        return password_hasher.verify(stored_hash, plain_password)
    except (VerifyMismatchError, InvalidHashError, VerificationError):
        # При несовпадении пароля или некорректном хэше перехватываем ошибки и возвращаем False
        return False


def password_needs_rehash(stored_hash: str) -> bool:
    """
    Проверяет, нужно ли перехэшировать пароль с новыми параметрами.
    Вызывается после успешной авторизации, если системные настройки Argon2id были усилены.
    """
    try:
        return password_hasher.check_needs_rehash(stored_hash)
    except InvalidHashError:
        return False


def create_access_token(user_id: int, login: str) -> tuple[str, int]:
    """
    Генерирует подписанный короткоживущий JWT access-токен.
    
    Возвращает:
        кортеж (сгенерированный_токен: str, время_жизни_в_секундах: int)
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)

    # Залезшие в полезную нагрузку (payload) стандартизированные JWT claims
    payload: dict[str, Any] = {
        "sub": str(user_id),  # Subject: уникальный идентификатор пользователя
        "login": login,       # Логин пользователя
        "type": "access",     # Тип токена (помогает отделить access от refresh токенов)
        "iat": now,           # Issued At: время создания токена
        "exp": expires_at,    # Expiration Time: время истечения срока действия
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    
    # Расчет TTL (секунд до сгорания) для передачи клиенту/фронтенду
    ttl_seconds = int((expires_at - now).total_seconds())
    return token, ttl_seconds


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Проверяет подпись, срок годности и декодирует JWT access-токен.
    
    Исключения:
        jwt.InvalidTokenError: если токен недействителен, просрочен или имеет неверный тип.
    """
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    
    # Дополнительная проверка, что передан именно access-токен
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Неверный тип токена")
        
    return payload