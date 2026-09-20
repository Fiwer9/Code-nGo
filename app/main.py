from fastapi import FastAPI
from sqlalchemy import text
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

from app.database import engine
from app.routers.auth import router as auth_router
from app.settings import settings

# Инициализация основного приложения FastAPI.
# Метаданные (название, версия, описание) подтягиваются из глобальных настроек settings
# и отображаются в интерактивной документации Swagger UI (/docs) и ReDoc (/redoc).
app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description=(
        "Backend веб-сервиса Москоллектора. Локальная аутентификация: "
        "PostgreSQL + Argon2id + JWT."
    ),
)

# Перенаправление трафика HTTP -> HTTPS (Starlette Middleware).
# Включается только если в конфигурации (settings/env) установлен флаг force_https = True
# (актуально для продакшена за Reverse Proxy).
if settings.force_https:
    app.add_middleware(HTTPSRedirectMiddleware)

# Регистрация модуля авторизации (/api/v1/auth)
app.include_router(auth_router)


@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    """
    Эндпоинт проверки работоспособности (Healthcheck).
    
    Используется Docker Compose, Kubernetes или внешними системами мониторинга
    для проверки доступности как самого FastAPI приложения, так и соединения с PostgreSQL.
    Выполняет легкий тестовый запрос `SELECT 1` к базе данных.
    """
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}