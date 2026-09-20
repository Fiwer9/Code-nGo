from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class UserCreate(BaseModel):
    """
    Схема валидации данных для регистрации нового пользователя.
    
    Особенности защиты и очистки данных:
    - `SecretStr`: предотвращает случайно утечку пароля в логи/консоль через str() или repr().
    - Автоматическая стриппинг-очистка пробелов (trimming) и приведение к нижнему регистру (lowercase).
    - Преобразование пустых строк в `None` для опциональных полей.
    """
    login: str = Field(min_length=3, max_length=64, description="Уникальный логин пользователя")
    password: SecretStr = Field(min_length=10, max_length=256, description="Пароль (защищен от вывода в логи)")
    surname: str = Field(min_length=1, max_length=100, description="Фамилия")
    name: str = Field(min_length=1, max_length=100, description="Имя")
    middle_name: str | None = Field(default=None, max_length=100, description="Отчество (опционально)")
    gender: Literal["male", "female", "unspecified"] = Field(
        default="unspecified", 
        description="Пол пользователя"
    )
    jobtitle: str = Field(min_length=1, max_length=150, description="Должность")
    mobile_number: str | None = Field(default=None, max_length=32, description="Номер телефона (опционально)")
    email: EmailStr = Field(description="Рабочий e-mail адрес")

    @field_validator("login")
    @classmethod
    def normalize_login(cls, value: str) -> str:
        """Приводит логин к нижнему регистру и удаляет случайные пробелы по краям."""
        return value.strip().lower()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        """Приводит e-mail к нижнему регистру и обрезает лишние пробелы."""
        return str(value).strip().lower()

    @field_validator("surname", "name", "jobtitle")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        """
        Проверяет, что обязательное текстовое поле не состоит из одних пробелов.
        """
        value = value.strip()
        if not value:
            raise ValueError("Поле не должно быть пустым или состоять только из пробелов")
        return value

    @field_validator("middle_name", "mobile_number")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        """
        Очищает опциональные текстовые поля. Пустые строки преобразует в None.
        """
        if value is None:
            return None
        value = value.strip()
        return value or None


class LoginRequest(BaseModel):
    """
    Схема запроса на аутентификацию (вход в систему).
    
    Поле `identifier` универсально — может принимать как логин, так и e-mail.
    """
    identifier: str = Field(min_length=3, max_length=320, description="Логин или e-mail пользователя")
    password: SecretStr = Field(min_length=1, max_length=256, description="Пароль пользователя")

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        """Нормализует логин/email для регистронезависимого поиска в БД."""
        return value.strip().lower()


class UserResponse(BaseModel):
    """
    Схема ответа с данными профиля пользователя.
    
    ВАЖНО: Исключает чувствительные данные (хэши паролей, секреты 2FA).
    `model_config = {"from_attributes": True}` позволяет Pydantic автоматически 
    конвертировать ORM-модели SQLAlchemy в данный формат.
    """
    id: int
    login: str
    surname: str
    name: str
    middle_name: str | None = None
    gender: str
    jobtitle: str
    mobile_number: str | None = None
    email: str
    is_active: bool
    two_factor_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """
    Схема успешного ответа при авторизации.
    
    Содержит короткоживущий JWT-токен, метаданные о его типе и времени жизни,
    а также объект профиля вошедшего пользователя.
    """
    access_token: str = Field(description="Сгенерированный JWT access-токен")
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Время жизни токена в секундах")
    user: UserResponse = Field(description="Данные авторизованного пользователя")