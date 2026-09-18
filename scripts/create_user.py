"""Create a local user without exposing a public registration endpoint.

Usage inside Docker:
    docker compose exec backend-api python scripts/create_user.py
"""

import asyncio
from getpass import getpass

from sqlalchemy import func, or_, select

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models import UserModel


async def main() -> None:
    login = input("Login: ").strip().lower()
    email = input("Email: ").strip().lower()
    password = getpass("Password (min 10 chars): ")
    password_confirm = getpass("Repeat password: ")

    if len(login) < 3:
        raise SystemExit("Login must contain at least 3 characters")
    if len(password) < 10:
        raise SystemExit("Password must contain at least 10 characters")
    if password != password_confirm:
        raise SystemExit("Passwords do not match")

    surname = input("Surname: ").strip()
    name = input("Name: ").strip()
    middle_name = input("Middle name (optional): ").strip() or None
    jobtitle = input("Job title: ").strip()
    gender = input("Gender [male/female/unspecified]: ").strip().lower() or "unspecified"
    mobile_number = input("Mobile number (optional): ").strip() or None

    if gender not in {"male", "female", "unspecified"}:
        raise SystemExit("Invalid gender")

    async with AsyncSessionLocal() as db:
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
            raise SystemExit("User with this login or email already exists")

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
        print(f"Created user id={user.id}, login={user.login}")


if __name__ == "__main__":
    asyncio.run(main())
