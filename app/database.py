from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.settings import settings


class Base(DeclarativeBase):
    """
    Базовый класс для всех ORM-моделей SQLAlchemy в приложении.
    
    Все модели базы данных (UserModel, ObjectModel и др.) должны наследоваться от него.
    Использует новый декларативный стиль SQLAlchemy 2.0.
    """


# Создание асинхронного движка базы данных (Database Engine)
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,  # Проверяет "живость" соединения перед выдачей из пула (защита от разрывов TCP со стороны PostgreSQL)
    future=True,         # Включает строгую совместимость со стандартом SQLAlchemy 2.0
)

# Фабрика асинхронных сессий (Session Factory)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # КРИТИЧНО ДЛЯ ASYNC: отключает очистку объектов после commit(),
                             # предотвращая попытки ленивой (lazy) загрузки и ошибку MissingGreenlet.
    autoflush=False,         # Отключает автоматический сброс несохраненных изменений в БД перед каждым SELECT-запросом.
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Dependency (зависимость), предоставляющая одну асинхронную сессию БД на один HTTP-запрос.
    
    Гарантирует:
    - Изоляцию транзакций между параллельными запросами.
    - Автоматический откат (rollback) изменений при возникновении ошибок во время работы эндпоинта.
    - Корректное закрытие сессии и возврат соединения в пул после обработки запроса.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            # При возникновении любого неперехваченного исключения откатываем текущую транзакцию
            await session.rollback()
            raise