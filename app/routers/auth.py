from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    decode_access_token,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from app.database import get_db
from app.models import UserModel
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.settings import settings

# Инициализация роутера FastAPI с префиксом и тегом для Swagger UI
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# Схема Bearer-авторизации для передачи JWT в заголовке `Authorization: Bearer <token>`.
# auto_error=False позволяет вручную обрабатывать отсутствие токена и возвращать единую 401 ошибку.
bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    """
    Вспомогательная функция для генерации единого ответа 401 Unauthorized.
    
    ВАЖНО ДЛЯ БЕЗОПАСНОСТИ: Сообщение преднамеренно обезличено ("Неверный логин/email или пароль"),
    чтобы злоумышленники не могли определить, существует ли пользователь в системе (защита от Account Enumeration).
    """
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный логин/email или пароль",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    """
    FastAPI Dependency (Зависимость) для защиты эндпоинтов.
    
    1. Проверяет наличие и валидность заголовка Authorization.
    2. Декодирует JWT-токен и извлекает ID пользователя (`sub`).
    3. Находит пользователя в базе данных и проверяет его активность (`is_active`).
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        # Расшифровка и валидация JWT
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise _unauthorized()

    # Запрос пользователя из базы данных по ID
    user = await db.get(UserModel, user_id)
    if user is None or not user.is_active:
        raise _unauthorized()

    return user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать локального пользователя",
)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    """
    Регистрация нового пользователя в системе.
    
    - Проверяет глобальный флаг разрешений `allow_public_registration`.
    - Нормализует логин и email (приведение к нижнему регистру и удаление пробелов).
    - Проверяет уникальность логина, email и телефона.
    - Хэширует пароль с помощью Argon2id.
    - Сохраняет пользователя в PostgreSQL.
    """
    # 1. Проверка разрешения на публичную регистрацию из конфигурации
    if not settings.allow_public_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Публичная регистрация отключена",
        )

    # 2. Нормализация входных данных
    login = user_data.login.strip().lower()
    email = str(user_data.email).strip().lower()

    # 3. Формирование условий для проверки дубликатов без учета регистра
    conditions = [
        func.lower(UserModel.login) == login,
        func.lower(UserModel.email) == email,
    ]
    if user_data.mobile_number:
        conditions.append(UserModel.mobile_number == user_data.mobile_number)

    existing = (
        await db.execute(select(UserModel).where(or_(*conditions)))
    ).scalar_one_or_none()

    # 4. Если на стадии регистрации найден дубликат, возвращаем точную ошибку 409 Conflict
    if existing:
        if existing.login.lower() == login:
            detail = "Пользователь с таким логином уже существует"
        elif existing.email.lower() == email:
            detail = "Пользователь с таким email уже существует"
        else:
            detail = "Пользователь с таким номером телефона уже существует"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    # 5. Создание объекта пользователя (пароль извлекается из SecretStr через get_secret_value)
    new_user = UserModel(
        login=login,
        password_hash=hash_password(user_data.password.get_secret_value()),
        surname=user_data.surname,
        name=user_data.name,
        middle_name=user_data.middle_name,
        gender=user_data.gender,
        jobtitle=user_data.jobtitle,
        mobile_number=user_data.mobile_number,
        email=email,
    )

    db.add(new_user)
    
    # 6. Безопасное сохранение в БД с перехватом состязательных условий (Race Conditions)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с такими уникальными данными уже существует",
        )

    await db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Вход по логину или email и паролю",
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Аутентификация пользователя и выдача JWT-токена.
    
    Особенности безопасности:
    - Принимает как логин, так и email в одно поле `identifier`.
    - Использует `DUMMY_PASSWORD_HASH` при отсутствии пользователя для предотвращения атак по времени (Timing Attacks).
    - Автоматически обновляет хэш пароля (`password_needs_rehash`), если настройки сложности Argon2id изменились.
    """
    identifier = data.identifier.strip().lower()

    # Поиск пользователя по регистронезависимому совпадению логина или email
    result = await db.execute(
        select(UserModel).where(
            or_(
                func.lower(UserModel.login) == identifier,
                func.lower(UserModel.email) == identifier,
            )
        )
    )
    user = result.scalar_one_or_none()

    # ЗАЩИТА ОТ АТАК ПО ВРЕМЕНИ (Timing Attack Prevention):
    # Даже если пользователь не найден, Argon2 все равно выполняет вычисление хэша
    # для DUMMY_PASSWORD_HASH. Время ответа сервера будет одинаковым в обоих случаях.
    encoded_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    is_valid = verify_password(encoded_hash, data.password.get_secret_value())

    # Если пользователь не найден, неактивен или пароль неверный — отказ в доступе
    if user is None or not user.is_active or not is_valid:
        raise _unauthorized()

    # ПРОЗРАЧНЫЙ АПГРЕЙД ХЭША:
    # Если параметры ресурсоемкости Argon2id были повышены в коде,
    # при успешном входе пароль автоматически перехэшируется с новыми настройками.
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password.get_secret_value())
        await db.commit()
        await db.refresh(user)

    # Генерация короткоживущего JWT access-токена
    token, expires_in = create_access_token(user.id, user.login)
    
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Текущий авторизованный пользователь",
)
async def me(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """
    Защищенный эндпоинт для получения профиля текущего вошедшего пользователя.
    
    Требует наличия валидного JWT-токена в заголовке `Authorization: Bearer <token>`.
    """
    return current_user