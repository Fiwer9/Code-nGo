"""
Скрипт прямого создания пользователя/администратора через консольный CLI.
Используется для ручного добавления пользователей, если публичная регистрация отключена
в настройках (allow_public_registration = False).

Использование внутри Docker-контейнера:
    docker compose exec backend-api python scripts/create_user.py
"""

import asyncio
from getpass import getpass

from sqlalchemy import func, or_, select

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models import UserModel


async def main() -> None:
    print("=== Создание локального пользователя / Администратора ===")
    
    # 1. Ввод учетных данных
    login = input("Логин: ").strip().lower()
    email = input("E-mail: ").strip().lower()
    
    # Функция getpass скрывает символ ввода пароля в терминале
    password = getpass("Пароль (минимум 10 символов): ")
    password_confirm = getpass("Повторите пароль: ")

    # 2. Валидация логина и пароля
    if len(login) < 3:
        raise SystemExit("Ошибка: Логин должен содержать минимум 3 символа")
    if len(password) < 10:
        raise SystemExit("Ошибка: Пароль должен содержать минимум 10 символов")
    if password != password_confirm:
        raise SystemExit("Ошибка: Введенные пароли не совпадают")

    # 3. Ввод личных данных пользователя
    surname = input("Фамилия: ").strip()
    name = input("Имя: ").strip()
    middle_name = input("Отчество (опционально): ").strip() or None
    jobtitle = input("Должность: ").strip()
    gender = input("Пол [male/female/unspecified] (по умолчанию unspecified): ").strip().lower() or "unspecified"
    mobile_number = input("Номер телефона (опционально): ").strip() or None

    # Проверка перечисления gender (согласно CheckConstraint в БД)
    if gender not in {"male", "female", "unspecified"}:
        raise SystemExit("Ошибка: Недопустимый пол (выберите: male, female или unspecified)")

    # 4. Проверка дубликатов и сохранение в PostgreSQL
    async with AsyncSessionLocal() as db:
        # Проверяем, свободен ли логин и email без учета регистра
        existing = (
            await db.execute(
                select(UserModel).where(
                    or_(
                        func.lower(UserModel.login) == login,
                        func.lower(UserModel.email) == email,
                    )
                )
            )
        ).scalar_one_or_none()

        if existing:
            raise SystemExit("Ошибка: Пользователь с таким логином или e-mail уже существует")

        # Хэширование пароля с помощью Argon2id и генерация случайной соли
        user = UserModel(
            login=login,
            email=email,
            password_hash=hash_password(password),
            surname=surname,
            name=name,
            middle_name=middle_name,
            gender=gender,
            jobtitle=jobtitle,
            mobile_number=mobile_number,
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        print(f"\n✅ Пользователь успешно создан: ID={user.id}, Login={user.login}")


if __name__ == "__main__":
    # Запуск асинхронной главной функции
    asyncio.run(main())