from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permissions
from app.core.security import hash_password
from app.database import get_db
from app.models import UserModel
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users Management"])

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация пользователя администратором",
)
async def create_user_by_admin(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permissions(["users:create"]))
) -> UserModel:
    """
    Создание нового пользователя администратором.
    В отличие от публичной регистрации, этот эндпоинт работает всегда,
    даже если публичная регистрация отключена в настройках.
    """
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
