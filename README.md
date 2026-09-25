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

## Примечание для Windows / PowerShell

Если `npm` не находится — проверьте, что Node.js добавлен в PATH, и перезапустите терминал.

Если появляется ошибка про `npm.ps1` и Execution Policy, выполните один раз:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

либо вызывайте `npm.cmd` вместо `npm`.
