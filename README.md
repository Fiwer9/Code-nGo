# Москоллектор — фронтенд

Фронтенд веб-приложения системы мониторинга коллекторов АО «Москоллектор»: дашборд, журналы инцидентов и прогнозов, оборудование, аналитика и админ-раздел.

На ранней стадии данные на экранах — **заглушки** (`lib/mockData.ts`). В дальнейшем UI будет ходить в API микросервисов.

## Стек

- [Next.js](https://nextjs.org/) 14 (App Router)
- React 18, TypeScript
- Tailwind CSS, Lucide, Recharts

Список зависимостей и их версий — в [`package.json`](./package.json). Точные зафиксированные версии после `npm install` — в [`package-lock.json`](./package-lock.json).

## Требования

- **Node.js** 18 или 20 (LTS), см. [`.nvmrc`](./.nvmrc)
- **npm** (идёт вместе с Node.js)

## Быстрый старт

```bash
# клонировать репозиторий и перейти в каталог
cd Code-nGo

# установить зависимости
npm install

# запуск в режиме разработки
npm run dev
```

Откройте в браузере: [http://localhost:3000](http://localhost:3000).

Корень сайта перенаправляет на `/login`. Сейчас вход — заглушка: любой email и пароль длиной от 4 символов.

### Переменные окружения

Скопируйте пример и при необходимости отредактируйте:

```bash
cp .env.example .env.local
```

Пока API не подключено, файл можно не создавать.

## Скрипты

| Команда           | Описание                          |
|-------------------|-----------------------------------|
| `npm run dev`     | Dev-сервер с hot reload           |
| `npm run build`   | Production-сборка                 |
| `npm run start`   | Запуск собранного приложения      |

## Docker

Сборка использует [standalone](https://nextjs.org/docs/app/api-reference/next-config-js/output) (`output: 'standalone'` в `next.config.js`).

### Локально

```bash
cp .env.example .env.local
# заполните TICKETS_API_KEY, NEXT_PUBLIC_YANDEX_MAPS_KEY и URL API

# для build-args при docker compose build (подстановка ${VAR})
cp .env.local .env

docker compose build
docker compose up -d
```

Приложение: [http://localhost:3000](http://localhost:3000).

Логи: `docker compose logs -f frontend`. Остановка: `docker compose down`.

### Переменные

| Переменная | Когда |
|------------|--------|
| `API_PROXY_TARGET`, `NEXT_PUBLIC_YANDEX_MAPS_KEY` | **Сборка образа** — после смены нужен `docker compose build` |
| `TICKETS_API_URL`, `TICKETS_API_KEY`, `TICKETS_USER_ID_MAP` | **Запуск контейнера** (`.env.local`) |

Если auth/monitoring крутится **на том же хосте**, что и Docker, укажите  
`API_PROXY_TARGET=http://host.docker.internal:8000` (в compose уже добавлен `extra_hosts`).

Не задавайте `NEXT_PUBLIC_API_URL=http://127.0.0.1:...` — в браузере пользователей это не сработает.

### На VPS

```bash
git clone <repo> && cd Code-nGo
cp .env.example .env.local && nano .env.local
cp .env.local .env
docker compose build
docker compose up -d
```

Снаружи откройте порт `3000` или поставьте nginx → `127.0.0.1:3000`.

Обновление: `git pull && docker compose build && docker compose up -d`.

## Структура

```
app/           # страницы (App Router)
components/    # UI-компоненты
lib/           # утилиты и мок-данные
public/        # статика (при появлении)
```

### Яндекс.Карты

На `/map` используется [JavaScript API Яндекс.Карт](https://yandex.ru/dev/maps/). Ключ задаётся в `.env.local`:

```bash
NEXT_PUBLIC_YANDEX_MAPS_KEY=ваш_ключ
```

Координаты объектов пока демо (см. `mapObjects` в `lib/mockData.ts`). Правки положения на карте сохраняются в `localStorage` браузера.

### Модуль заявок (Ticket Service)

Раздел `/requests` ходит в Ticket Service через BFF `/api/ticket-service/*` (сервер Next.js подставляет `X-API-Key`, `X-User-Id`, `X-Role` из JWT auth-сервиса).

В `.env.local`:

```bash
TICKETS_API_URL=http://139.100.207.246:8081
TICKETS_API_KEY=ваш_ключ
```

Роли UI: ADMIN / MANAGER / ENGINEER / OBSERVER — маппинг из ролей сервера авторизации; фактические `allowed_actions` при возможности берутся из `GET /api/v1/users/me` Ticket Service.

## Примечание для Windows / PowerShell

Если `npm` не находится — проверьте, что Node.js добавлен в PATH, и перезапустите терминал.

Если появляется ошибка про `npm.ps1` и Execution Policy, выполните один раз:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

либо вызывайте `npm.cmd` вместо `npm`.
