from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Глобальная конфигурация приложения и управление переменными окружения.
    
    Использует `pydantic-settings` для автоматического считывания настроек 
    из файла `.env` или системных переменных окружения (Environment Variables).
    Значения по умолчанию используются при отсутствии заданных переменных.
    """
    app_name: str = "Moscollector API"
    environment: str = "development"

    # Строка подключения к базе данных PostgreSQL (асинхронный драйвер asyncpg)
    database_url: str = (
        "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/moscollector"
    )

    # ВАЖНО ДЛЯ БЕЗОПАСНОСТИ: В продакшене обязательно переопределить в .env 
    # на длинную криптографически стойкую случайную строку (минимум 32 байта/символа).
    jwt_secret: str = "dev-only-change-me-dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30  # Время жизни JWT access-токена (в минутах)

    # Разрешение публичной регистрации пользователей через API.
    # Удобно для хакатона и разработки, но в продакшене обычно отключается 
    # (когда аккаунты создаются администраторами или импортируются из LDAP/Active Directory).
    allow_public_registration: bool = True

    # Принудительный редирект с HTTP на HTTPS средствами Starlette middleware.
    # В продакшене включается (True), когда приложение находится за HTTPS Reverse Proxy (Nginx/Traefik).
    force_https: bool = False

    # Настройки загрузки конфигурации Pydantic
    model_config = SettingsConfigDict(
        env_file=".env",              # Файл, из которого авто-загружаются переменные
        env_file_encoding="utf-8",    # Кодировка файла конфигурации
        case_sensitive=False,         # Игнорировать регистр названий переменных (DATABASE_URL == database_url)
        extra="ignore",               # Игнорировать лишние переменные из .env без вызова ошибки
    )


@lru_cache
def get_settings() -> Settings:
    """
    Возвращает экземпляр настроек с кешированием через паттерн Singleton (@lru_cache).
    
    Считывание `.env` файла и парсинг переменных происходят **ровно один раз** при первом вызове,
    после чего объект сохраняется в памяти, что исключает накладные расходы при повторных обращениях.
    """
    return Settings()


# Глобальный объект настроек для импорта в другие модули приложения
settings = get_settings()