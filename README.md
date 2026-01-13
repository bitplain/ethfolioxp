# Ethfolio

Личный ETH портфель с авторизацией, SQL базой и автоматической синхронизацией транзакций.

## Локальный запуск через Docker

1. Скопируй `.env.example` в `.env` и заполни системные переменные (например `NEXTAUTH_SECRET`).
2. Запусти Postgres + Next.js (production режим внутри Docker):

```bash
docker compose up --build
```

Если уже запускал ранее, пересобери образ после изменений Dockerfile:

```bash
docker compose build --no-cache
```

3. В отдельном окне примените миграции Prisma внутри контейнера:

```bash
docker compose exec web npx prisma migrate dev --name init
```

Если нужно быстро применить схему без миграций:

```bash
docker compose exec web npx prisma db push
```

## Настройки

- Etherscan API ключ и адрес кошелька вводятся в интерфейсе Settings и хранятся в базе.
- Значения не передаются в Docker Compose и не отображаются вне Settings.
- `NEXTAUTH_SECRET` — обязательный секрет для подписи сессий.
- `NEXTAUTH_URL` — публичный URL приложения.
- `DATABASE_URL` — строка подключения к базе (используется всегда).
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — нужны, если используешь встроенный контейнер Postgres.
- `ETHERSCAN_API_BASE` — базовый URL Etherscan API v2.
- `ETHERSCAN_CHAIN_ID` — chain id (для Ethereum mainnet = 1).
- `COINGECKO_API_BASE` — база CoinGecko (обычно не меняется).
- `PRICE_BUCKET_SECONDS` — шаг кеширования цены (по умолчанию 3600 сек).
- `PRICE_FALLBACK_MAX_AGE_SEC` — максимум “старой” цены при падении источников (по умолчанию 72 часа).
- `HTTP_TIMEOUT_MS` — таймаут внешних запросов (по умолчанию 8000 мс).
- `HTTP_RETRY_COUNT` — число ретраев внешних запросов (по умолчанию 2).
- `HTTP_RETRY_BASE_MS` — базовая задержка ретраев (по умолчанию 250 мс).
- `HTTP_CACHE_TTL_MS` — in-memory кеш внешних GET запросов (по умолчанию 0).

## Timeweb Cloud Apps

В панели Timeweb укажи переменные окружения (они попадут в контейнер):

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (если используешь контейнер `db` из compose)
- `ETHERSCAN_API_BASE`, `ETHERSCAN_CHAIN_ID`, `COINGECKO_API_BASE`, `PRICE_BUCKET_SECONDS` (по желанию)

Если используешь внешний Postgres, отключи/удали сервис `db` из compose и оставь только `DATABASE_URL`.

## Синхронизация

После входа нажми «Синхронизировать» на дашборде.
Данные сохраняются в Postgres и отображаются в таблице.

Ключ Etherscan можно вводить вручную в настройках — он будет сохранен для пользователя.

## Сервисные эндпоинты

- `GET /api/health` — health check (опция `?db=1` для проверки БД).
- `GET /api/metrics` — метрики внешних запросов.
- `POST /api/maintenance/prune-prices` — ручная очистка старых цен.

## Dependency notes

- Prisma зафиксирован на 5.x: в 7.x требуется перенос `DATABASE_URL` в `prisma.config.ts` и переход на драйвер‑адаптеры.

## Windows XP тема

Интерфейс выполнен в стиле Windows XP с рабочим столом, панелью задач и окнами.
Светлая и тёмная темы переключаются в панели задач и сохраняются локально.
Добавлены Start Menu с подменю программ и мини‑приложения (Notepad, Calculator, Clock).
Окна можно перетаскивать, сворачивать и восстанавливать через панель задач.
Ярлыки на рабочем столе открываются двойным кликом, как в XP.
Окна можно держать открытыми одновременно и переключать через панель задач.
Добавлены каскад и плитка, а позиции окон сохраняются между перезапусками.

### Звуки XP

Положи звуки в `public/sounds`:

- `xp-startup.wav`
- `xp-click.wav`
- `xp-notify.wav`

Если файлов нет, будет короткий запасной сигнал.

### Курсоры XP

Добавь курсоры в `public/cursors`:

- `xp-arrow.cur` (по умолчанию)
- `xp-hand.cur` (для ссылок/кнопок)

Есть PNG fallback: `xp-arrow.png`, `xp-hand.png`.

### Иконки XP

Используются иконки из `public/icons/xp` (примеры: `ethfolio.png`, `my-computer.png`).
