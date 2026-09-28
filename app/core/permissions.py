from typing import Sequence

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import selectinload

from app.models import UserModel, RoleModel
from app.routers.auth import get_current_user


def require_permissions(required_permissions: list[str]):
    """
    Dependency (Фабрика зависимостей) для проверки наличия необходимых прав у пользователя.
    
    Сравнивает список требуемых прав со списком прав, имеющихся у всех ролей текущего пользователя.
    """
    async def permission_checker(current_user: UserModel = Depends(get_current_user)) -> UserModel:
        # Для администратора можно сделать хардкод пропуск (или дать ему все права)
        user_permissions = set()
        is_admin = False
        
        for role in current_user.roles:
            if role.name == "Administrator":
                is_admin = True
                break
            for perm in role.permissions:
                user_permissions.add(perm.name)
        
        if is_admin:
            return current_user

        missing = [p for p in required_permissions if p not in user_permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуются: {', '.join(missing)}"
            )
        return current_user

    return permission_checker
