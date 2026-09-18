from fastapi import FastAPI
from sqlalchemy import text
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

from app.database import engine
from app.routers.auth import router as auth_router
from app.settings import settings

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description=(
        "Backend веб-сервиса Москоллектора. Локальная аутентификация: "
        "PostgreSQL + Argon2id + JWT."
    ),
)

if settings.force_https:
    app.add_middleware(HTTPSRedirectMiddleware)

app.include_router(auth_router)


@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
