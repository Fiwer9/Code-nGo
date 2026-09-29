# Code-nGo Backend

Backend веб-сервиса системы предиктивного мониторинга Москоллектора (разработка для хакатона ЛЦТ).

## Что реализовано

1. **Модуль аутентификации**:
   - PostgreSQL + Argon2id + JWT. Уникальная соль, защищенное хранение паролей.
2. **Модуль прав доступа (RBAC)**:
   - Роли (`Administrator`, `City Dispatcher`, `District Dispatcher`).
   - Настраиваемые `permissions`.
3. **Мониторинг оборудования (Equipment API)**:
   - Интеграция больших датасетов (`channels`, `objects`, `sensor_logs`).
   - Оптимизированный расчет последних состояний.
   - Нормализация типов датчиков и автоматическое определение статусов (`online`, `warning`, `offline`, `maintenance`).
4. **Предиктивная аналитика (Predictions API)**:
   - Хранение результатов ML-моделей.
   - Просмотр прогнозов (risk_score).
   - Принятие решений диспетчером (`accepted`, `rejected`, `verified`).
5. **Журнал инцидентов (Incidents API)**:
   - Фиксация аварий и тревожных событий.
   - Фильтрация по статусам и поиск.
   - Экспорт в CSV.

## Схема таблиц БД

- `users`: Пользователи системы.
- `roles`, `permissions`, `user_roles`, `role_permissions`: Ролевая модель доступа.
- `objects`: Инфраструктурные объекты (с иерархией и геоданными PostGIS + latitude/longitude).
- `channels`: Каналы данных (датчики), привязанные к объектам.
- `sensor_states`: Справочник состояний датчиков.
- `sensor_logs`: Журнал событий датчиков (партиционирован по дате для 1+ ГБ логов).
- `predictions`: Журнал прогнозов ML.
- `incidents`: Журнал зарегистрированных инцидентов.

## Логика определения статусов оборудования (Demo Logic)

- `warning`: Последнее зафиксированное событие по датчику имеет флаг `is_alarm = true`.
- `online`: По датчику есть свежие данные и они не тревожные.
- `offline`: Если данные старше 24 часов от максимального времени в логах.
- `maintenance`: Пока возвращается 0, так как исходный датасет не содержит признака ТО.

> **Примечание:** Определение "устаревших" данных происходит относительно максимальной даты в загруженном датасете, а не текущего реального времени, чтобы демо-данные не стали `offline`.

## Демонстрационные данные (Важно!)

- **Координаты**: Исходные датасеты не содержали GPS-координат. Скрипт `seed_demo_monitoring.py` генерирует детерминированные (по фиксированному seed) демонстрационные координаты в радиусе центра Москвы.
- **Прогнозы и инциденты**: Так как ML-модель еще не подключена к пайплайну в реальном времени, создаются демонстрационные (seed) записи для отображения во frontend-интерфейсе.

---

## Развертывание и Запуск

### 1. Подготовка конфигурации
```bash
cp .env.example .env
```
Обязательно измените `JWT_SECRET` на случайную строку.

### 2. Запуск Docker Compose
```bash
docker compose up -d --build
```
Документация Swagger станет доступна по адресу: `http://localhost:8000/docs`.

### 3. Загрузка Датасетов (CSV)
Положите 4 CSV файла в папку `data/` в корне проекта:
- `data/справочник_объектов_диспетчер.csv`
- `data/справочник_каналов_датчиков.csv`
- `data/справочник_состояний.csv`
- `data/журнал_событий_пример.csv` (или полная версия)

Маппинг CSV -> PostgreSQL:
- `справочник_объектов_диспетчер.csv` -> `objects` (id, hierarchy_level, parent_id, object_type, disp_name)
- `справочник_каналов_датчиков.csv` -> `channels` (id, sys_type, sensor_type, tag, name, object_id)
- `справочник_состояний.csv` -> `sensor_states` (sensor_type, state_set_id, state_name, is_alarm)
- `журнал_событий...csv` -> `sensor_logs` (id, channel_id, event_date, event_time, is_alarm, sensor_value)

Выполните скрипт загрузки внутри контейнера:
```bash
docker compose exec backend-api python scripts/load_dataset.py
```
> **Внимание:** Загрузка `sensor_logs` использует сверхбыстрый драйверный `COPY STDIN WITH CSV`. 

### 4. Генерация Demo Data
```bash
docker compose exec backend-api python scripts/seed_demo_monitoring.py
```

### 5. Миграции существующей БД
Если БД уже существует, новые таблицы и колонки применяются через SQL миграцию:
```bash
docker compose exec db psql -U postgres -d moscollector -f /docker-entrypoint-initdb.d/../db/migrations/003_monitoring_data.sql
```

---

## Frontend Integration

Ветка `web/site` выступает источником контрактов. API разработано так, чтобы минимизировать преобразования на стороне фронтенда.

**Авторизация**: Для выполнения запросов нужно получить JWT токен через `/api/v1/auth/login` и передавать его в заголовке `Authorization: Bearer <token>`. Администратор имеет полный доступ.

### 1. Оборудование
`GET /api/v1/equipment?limit=50&offset=0&status=online&search=120298`

```json
{
  "items": [
    {
      "id": "120298",
      "name": "Темп. ВШ ПК88,5",
      "location": "6",
      "type": "temperature",
      "sensor_type": "Датчик температуры",
      "system_type": "Температурная подсистема",
      "status": "online",
      "lastCheck": "2026-08-01T12:17:17",
      "objectId": 20,
      "parentId": 6
    }
  ],
  "stats": {
    "total": 1,
    "online": 1,
    "warning": 0,
    "offline": 0,
    "maintenance": 0
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

### 2. Прогнозы (Предиктивная аналитика)
`GET /api/v1/predictions?limit=50&offset=0&status=pending`

```json
{
  "items": [
    {
      "id": "P-00124",
      "object": "ДУ объект Альфа",
      "objectId": 5122,
      "type": "Подтопление",
      "horizon": "24ч",
      "horizonHours": 24,
      "probability": 92,
      "model": "FloodNet v3.2",
      "verified": false,
      "status": "pending",
      "inferenceSeconds": 4.2,
      "factors": [
        {
          "label": "Температура",
          "value": 85.0
        }
      ],
      "createdAt": "2026-09-19T14:32:00"
    }
  ],
  "pagination": { ... }
}
```

**Решение по прогнозу:**
`POST /api/v1/predictions/P-00124/decision`
```json
{
  "decision": "accepted"
}
```

### 3. Журнал Инцидентов
`GET /api/v1/incidents?limit=50&offset=0&status=critical`

```json
{
  "items": [
    {
      "id": "INC-2026-0842",
      "object": "ДУ объект Альфа",
      "objectId": 5122,
      "type": "Подтопление",
      "status": "critical",
      "probability": 92,
      "date": "2026-09-19T14:32:00",
      "location": "5"
    }
  ],
  "pagination": { ... }
}
```

**Экспорт CSV:**
`GET /api/v1/incidents/export.csv`
Отдаст файл `incidents.csv`.
