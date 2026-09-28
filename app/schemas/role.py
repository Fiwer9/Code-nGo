from pydantic import BaseModel, Field

class PermissionResponse(BaseModel):
    """
    Схема ответа для отдельного права (permission).
    """
    id: int
    name: str = Field(description="Уникальное системное имя права (например, 'users:create')")
    description: str | None = Field(default=None, description="Описание права для UI")

    model_config = {"from_attributes": True}


class RoleBase(BaseModel):
    name: str = Field(min_length=1, max_length=50, description="Название роли (группы)")
    description: str | None = Field(default=None, max_length=255, description="Подробное описание роли")


class RoleCreate(RoleBase):
    """
    Схема создания новой пользовательской роли.
    Поле `permission_ids` содержит список ID прав, которые будут привязаны к роли.
    """
    permission_ids: list[int] = Field(default_factory=list, description="Список ID прав доступа")


class RoleUpdate(RoleBase):
    """
    Схема обновления роли. 
    Все поля опциональны, чтобы поддерживать частичное обновление (PATCH).
    """
    name: str | None = Field(default=None, min_length=1, max_length=50)
    permission_ids: list[int] | None = Field(default=None, description="Новый список ID прав доступа (перезапишет старый)")


class RoleResponse(RoleBase):
    """
    Схема ответа с данными о роли.
    """
    id: int
    permissions: list[PermissionResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AssignRolesRequest(BaseModel):
    """
    Схема запроса для назначения ролей пользователю.
    """
    role_ids: list[int] = Field(description="Список ID ролей для назначения пользователю")

