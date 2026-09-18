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

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    # Do not reveal whether LOGIN/EMAIL or PASSWORD was wrong.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный логин/email или пароль",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise _unauthorized()

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
    if not settings.allow_public_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Публичная регистрация отключена",
        )

    login = user_data.login.strip().lower()
    email = str(user_data.email).strip().lower()

    conditions = [
        func.lower(UserModel.login) == login,
        func.lower(UserModel.email) == email,
    ]
    if user_data.mobile_number:
        conditions.append(UserModel.mobile_number == user_data.mobile_number)

    existing = (
        await db.execute(select(UserModel).where(or_(*conditions)))
    ).scalar_one_or_none()

    if existing:
        # Keep registration feedback useful; login endpoint itself remains generic.
        if existing.login.lower() == login:
            detail = "Пользователь с таким логином уже существует"
        elif existing.email.lower() == email:
            detail = "Пользователь с таким email уже существует"
        else:
            detail = "Пользователь с таким номером телефона уже существует"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

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
    identifier = data.identifier.strip().lower()

    result = await db.execute(
        select(UserModel).where(
            or_(
                func.lower(UserModel.login) == identifier,
                func.lower(UserModel.email) == identifier,
            )
        )
    )
    user = result.scalar_one_or_none()

    # Always run Argon2 verification, even when a user does not exist.
    encoded_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    is_valid = verify_password(encoded_hash, data.password.get_secret_value())

    if user is None or not user.is_active or not is_valid:
        raise _unauthorized()

    # Upgrade Argon2 parameters transparently after a successful login.
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password.get_secret_value())
        await db.commit()
        await db.refresh(user)

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
    return current_user
