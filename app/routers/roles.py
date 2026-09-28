from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permissions
from app.database import get_db
from app.models import RoleModel, PermissionModel, UserModel
from app.schemas.role import RoleCreate, RoleResponse, RoleUpdate, PermissionResponse, AssignRolesRequest
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/v1/roles", tags=["Roles & Permissions"])

@router.get("/permissions", response_model=list[PermissionResponse], summary="Получить список всех прав доступа")
async def get_all_permissions(
    db: AsyncSession = Depends(get_db),
    # Для просмотра прав нужен доступ (например, администратора)
    current_user: UserModel = Depends(require_permissions(["roles:read"]))
):
    """
    Возвращает список всех возможных атомарных прав доступа (permissions).
    """
    result = await db.execute(select(PermissionModel))
    return result.scalars().all()


@router.get("", response_model=list[RoleResponse], summary="Получить список всех ролей")
async def get_all_roles(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permissions(["roles:read"]))
):
    """
    Возвращает список всех ролей, включая привязанные к ним права.
    """
    result = await db.execute(select(RoleModel))
    return result.scalars().all()


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED, summary="Создать новую роль")
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permissions(["roles:manage"]))
):
    """
    Создает новую группу (роль) и привязывает к ней переданные права (permission_ids).
    """
    # Проверяем уникальность имени
    existing = await db.execute(select(RoleModel).where(RoleModel.name == role_data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Роль с таким именем уже существует")

    # Ищем запрашиваемые права в БД
    permissions = []
    if role_data.permission_ids:
        result = await db.execute(select(PermissionModel).where(PermissionModel.id.in_(role_data.permission_ids)))
        permissions = list(result.scalars().all())
        if len(permissions) != len(role_data.permission_ids):
            raise HTTPException(status_code=400, detail="Один или несколько permission_ids не найдены")

    new_role = RoleModel(name=role_data.name, description=role_data.description)
    new_role.permissions = permissions
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)
    return new_role


@router.post(
    "/{user_id}/assign",
    response_model=UserResponse,
    summary="Назначить роли пользователю",
)
async def assign_roles_to_user(
    user_id: int,
    data: AssignRolesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permissions(["users:manage_roles"]))
) -> UserModel:
    """
    Назначает список ролей (по их ID) конкретному пользователю.
    Старые роли будут перезаписаны переданным списком.
    """
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Получаем роли по переданным ID
    roles = []
    if data.role_ids:
        result = await db.execute(select(RoleModel).where(RoleModel.id.in_(data.role_ids)))
        roles = list(result.scalars().all())
        if len(roles) != len(data.role_ids):
            raise HTTPException(status_code=400, detail="Одна или несколько ролей не найдены")

    user.roles = roles
    await db.commit()
    await db.refresh(user)
    return user
