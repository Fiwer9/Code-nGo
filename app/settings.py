from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Moscollector API"
    environment: str = "development"

    database_url: str = (
        "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/moscollector"
    )

    # Replace in production with a long random value (at least 32 bytes).
    jwt_secret: str = "dev-only-change-me-dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Public registration is convenient for hackathon/dev, but should normally be
    # disabled in production when accounts come from admins or LDAP/AD.
    allow_public_registration: bool = True

    # When enabled Starlette redirects HTTP -> HTTPS. In production put the app
    # behind an HTTPS reverse proxy and set this to true.
    force_https: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
