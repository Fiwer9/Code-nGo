# Авторизация: текущая реализация

```text
Browser / Frontend
      |
      | HTTPS/TLS 1.2+
      v
Reverse proxy (production)
      |
      v
FastAPI /api/v1/auth/login
      |
      +--> search user by lower(login) OR lower(email)
      |
      +--> Argon2id.verify(password_hash, password)
      |
      +--> JWT access token
      v
PostgreSQL users
```

## Что хранится в users

Обязательные поля из задачи: `id`, `login`, `password_hash`, `surname`, `name`,
`middle_name`, `gender`, `jobtitle`, `mobile_number`, `email`.

Дополнительно: `is_active`, `two_factor_enabled`, `created_at`, `updated_at`.

## Salt

Отдельного поля `salt` нет намеренно. `argon2-cffi` генерирует новую случайную соль при
каждом `hash_password()` и сохраняет соль в encoded Argon2id строке в `password_hash`.

## Передача credentials

Login/email и password должны идти только через HTTPS. TLS отвечает за шифрование
credentials в пути между браузером и сервером. Пароль внутри БД не хранится.

## 2FA

Поле `two_factor_enabled` уже предусмотрено, но email OTP является следующей задачей:
понадобятся challenge storage, TTL, attempt limit, rate limiting и SMTP/email provider.
