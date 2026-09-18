# Code-nGo backend

Backend-прототип для проекта Москоллектора.

## Реализовано в модуле пользователей и авторизации

- PostgreSQL-таблица `users` с обязательными полями:
  `ID`, `LOGIN`, `PASSWORD_HASH`, `SURNAME`, `NAME`, `MIDDLE_NAME`,
  `GENDER`, `JOBTITLE`, `MOBILE_NUMBER`, `EMAIL`.
- Пароль **никогда не хранится в открытом виде**.
- Хэширование: **Argon2id** (`argon2-cffi`).
- На каждый пароль генерируется новая криптографически случайная `SALT`.
  Отдельная колонка `salt` не нужна: соль уже является частью encoded Argon2id hash.
- Вход по **login или email + password**.
- Сравнение пароля во время авторизации через `Argon2.verify()`.
- Короткоживущий JWT access token для авторизованного сеанса.
- `password_hash` не присутствует в API response-схемах.
- Case-insensitive уникальность login/email.
- Поле `two_factor_enabled` оставлено как точка расширения для будущей 2FA по email.
- Пример TLS termination через nginx, потому что логин/пароль должны передаваться по HTTPS.

## Почему логин/пароль не шифруются вручную в JSON

Требование "передаваться в зашифрованном виде" на транспортном уровне выполняется через
**HTTPS/TLS 1.2+**. Клиент отправляет login/email и password по TLS-каналу, backend получает
их внутри защищенного соединения, проверяет пароль и не сохраняет plaintext.
Дополнительное самодельное шифрование пароля в JSON не заменяет TLS.

## API

После старта OpenAPI/Swagger доступен по `/docs`.

### Регистрация

`POST /api/v1/auth/register`

```json
{
  "login": "dispatcher01",
  "password": "StrongPassword!123",
  "surname": "Иванов",
  "name": "Иван",
  "middle_name": "Иванович",
  "gender": "male",
  "jobtitle": "Диспетчер ОДС",
  "mobile_number": "+79991234567",
  "email": "dispatcher01@example.ru"
}
```

В production публичную регистрацию лучше отключить:

```env
ALLOW_PUBLIC_REGISTRATION=false
```

и создавать локальных пользователей администратором или подключить LDAP/AD.

### Вход

`POST /api/v1/auth/login`

```json
{
  "identifier": "dispatcher01",
  "password": "StrongPassword!123"
}
```

В `identifier` можно передать как login, так и email.

Ответ:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "login": "dispatcher01",
    "surname": "Иванов",
    "name": "Иван",
    "middle_name": "Иванович",
    "gender": "male",
    "jobtitle": "Диспетчер ОДС",
    "mobile_number": "+79991234567",
    "email": "dispatcher01@example.ru",
    "is_active": true,
    "two_factor_enabled": false,
    "created_at": "2026-09-18T10:00:00Z",
    "updated_at": "2026-09-18T10:00:00Z"
  }
}
```

### Проверка текущего пользователя

`GET /api/v1/auth/me`

Header:

```text
Authorization: Bearer <jwt>
```

### Healthcheck

`GET /health`

## Запуск

1. Скопировать настройки:

```bash
cp .env.example .env
```

2. Обязательно заменить `JWT_SECRET` в `.env` на длинное случайное значение.

3. Запустить:

```bash
docker compose up --build
```

4. Открыть:

```text
http://localhost:8000/docs
```

Для production наружный трафик должен идти через HTTPS. Пример nginx-конфига находится в
`deploy/nginx-https.conf.example`.

## Создание пользователя из CLI

Если публичная регистрация отключена:

```bash
docker compose exec backend-api python scripts/create_user.py
```

Пароль вводится через `getpass`, не отображается в терминале и в БД записывается только
Argon2id hash.

## Проверка SALT

```bash
python -m pytest -q tests/test_security.py
```

Тест дважды хэширует один и тот же пароль и проверяет, что encoded hashes различаются.
Это демонстрирует уникальную случайную соль для каждого хэширования.

## Важное про существующий Docker volume

`db/init.sql` выполняется PostgreSQL автоматически только при создании **нового** volume.
Если у вас уже есть старый `postgres_data`, для локальной разработки проще пересоздать его:

```bash
docker compose down -v
docker compose up --build
```

Это удаляет локальные данные БД, поэтому не используйте команду на среде, где данные нужно
сохранить.

## Будущая 2FA по email

В БД уже есть `two_factor_enabled`, но отправка кодов пока намеренно не реализована.
Следующий безопасный шаг: отдельная таблица одноразовых challenge-кодов/их хэшей,
короткий TTL, лимит попыток, rate limit и отправка через почтовый провайдер.
