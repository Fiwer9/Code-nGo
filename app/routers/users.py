from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permissions
from app.core.security import hash_password
from app.database import get_db
from app.models import UserModel, RoleModel
from app.schemas.user import UserCreate, UserResponse, UserListResponse, UserListResponseItem, UserStats, UserPagination
from fastapi import Query
from typing import Optional

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

@router.get(
    "",
    response_model=UserListResponse,
    summary="Получение списка всех пользователей",
)
async def get_users(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permissions(["users:read"]))
):
    from sqlalchemy import func, or_
    query = select(UserModel)
    
    if search:
        search_filter = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(UserModel.login).like(search_filter),
                func.lower(UserModel.email).like(search_filter),
                func.lower(UserModel.name).like(search_filter),
                func.lower(UserModel.surname).like(search_filter)
            )
        )
        
    query = query.order_by(UserModel.created_at.desc())
    
    # Считаем тотал с учетом поиска
    total_query = select(func.count(UserModel.id))
    if search:
        total_query = total_query.where(
            or_(
                func.lower(UserModel.login).like(search_filter),
                func.lower(UserModel.email).like(search_filter),
                func.lower(UserModel.name).like(search_filter),
                func.lower(UserModel.surname).like(search_filter)
            )
        )
    total = await db.scalar(total_query)
    
    # Получаем пагинированные данные
    result = await db.execute(query.limit(limit).offset(offset))
    users = result.scalars().all()
    
    # Считаем общую статистику (без учета поиска)
    active = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_active == True))
    inactive = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_active == False))
    roles_count = await db.scalar(select(func.count(RoleModel.id)))
    
    items = []
    for u in users:
        role_name = u.roles[0].name if u.roles else "Пользователь"
        
        items.append(UserListResponseItem(
            id=u.id,
            login=u.login,
            surname=u.surname,
            name=u.name,
            middle_name=u.middle_name,
            gender=u.gender,
            jobtitle=u.jobtitle,
            mobile_number=u.mobile_number,
            email=u.email,
            is_active=u.is_active,
            two_factor_enabled=u.two_factor_enabled,
            created_at=u.created_at,
            updated_at=u.updated_at,
            roles=[r.name for r in u.roles],
            role_name=role_name
        ))
        
    return UserListResponse(
        items=items,
        stats=UserStats(
            total=total,
            active=active,
            inactive=inactive,
            roles_count=roles_count
        ),
        pagination=UserPagination(
            limit=limit,
            offset=offset,
            total=total
        )
    )
