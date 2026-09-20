import jwt

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_same_password_gets_different_hashes_because_of_random_salt():
    """
    Тест защиты Argon2id: уникальность соли.
    
    Проверяет, что при хэшировании одного и того же пароля получаются разные строки (хэши)
    за счет автоматической генерации уникальной криптографической соли при каждом вызове.
    Это защищает базу данных от атак с использованием Радужных таблиц (Rainbow Tables).
    """
    password = "StrongPassword!123"
    first = hash_password(password)
    second = hash_password(password)

    # Хэши не должны совпадать, так как у них разные случайные соли
    assert first != second
    
    # Проверка формата префикса PHC для Argon2id
    assert first.startswith("$argon2id$")
    assert second.startswith("$argon2id$")
    
    # При этом оба хэша должны успешно проходимость аутентификацию по исходному паролю
    assert verify_password(first, password)
    assert verify_password(second, password)


def test_wrong_password_is_rejected():
    """
    Тест проверки пароля: отказ при неверных данных.
    
    Проверяет, что метод verify_password возвращает False при передаче
    некорректного пароля и не вызывает необработанных исключений.
    """
    encoded = hash_password("StrongPassword!123")
    assert verify_password(encoded, "wrong-password") is False


def test_access_token_round_trip():
    """
    Тест полного цикла работы с JWT (выпуск и валидация).
    
    Проверяет, что при генерации access-токена корректно запекаются
    и впоследствии извлекаются стандартизированные claims (sub, login, type),
    а время жизни токена (TTL) положительно.
    """
    token, expires_in = create_access_token(user_id=42, login="dispatcher")
    payload = decode_access_token(token)

    assert payload["sub"] == "42"
    assert payload["login"] == "dispatcher"
    assert payload["type"] == "access"
    assert expires_in > 0


def test_malformed_token_is_rejected():
    """
    Тест безопасности JWT: защита от поддельных/поврежденных токенов.
    
    Проверяет, что декодер вышибает исключение `jwt.InvalidTokenError`
    при попытке передачи некорректной строки вместо валидного JWT.
    """
    try:
        decode_access_token("not-a-jwt")
    except jwt.InvalidTokenError:
        pass  # Исключение успешно перехвачено — тест пройден
    else:
        raise AssertionError("Некорректная строка JWT должна отклоняться с ошибкой InvalidTokenError")