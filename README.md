# Qadr

Neighbourhood borrowing and item-sharing for Uzbekistan. *Har narsaning qadri bor.*

The specification lives in [`docs/SPEC.md`](docs/SPEC.md); project rules in [`CLAUDE.md`](CLAUDE.md).

## Layout

- `client/`: Next.js 16 (App Router), TypeScript strict, Tailwind v4, shadcn/ui,
  next-intl (`uz` default, `ru`, `en`), Motion, Lenis.
- `server/`: FastAPI modular monolith with SQLAlchemy 2 (async), Alembic,
  Celery (worker + beat), Redis and an aiogram Telegram bot.
- `infra/`: Postgres init script and the Caddy reverse-proxy config.
- `docker-compose.yml`: development stack. `docker-compose.prod.yml`: production stack.

## Demo accounts

`python -m app.seed` (run automatically by Docker) creates categories, 15 listings
with photos, requests, loans, conversations, notifications and an open report.

| Role  | Email            | Password      |
|-------|------------------|---------------|
| User  | `demo@qadr.uz`   | `Demo12345!`  |
| Admin | `admin@qadr.uz`  | `Admin12345!` |

These also use `Demo12345!`: `sardor@`, `malika@`, `jasur@`, `olga@`, `nodira@` and `timur@qadr.uz`.
To start over, run `uv run python -m app.seed --reset` (in Docker: `docker compose run --rm migrate python -m app.seed --reset`).

## 1. Configure `.env`

```bash
cp .env.example .env
```

Fill in `POSTGRES_PASSWORD`, `SECRET_KEY` and `TELEGRAM_WEBHOOK_SECRET` with random
values (`python -c "import secrets;print(secrets.token_urlsafe(32))"`), and use the same
password inside `DATABASE_URL` and `TEST_DATABASE_URL`. `.env` is gitignored. Never commit it.

**Telegram bot (required).** Qadr sends no email. Telegram is how accounts are verified:
after sign-up a user can only see `/connect-telegram` until they link it, password-reset
codes arrive in the bot, and accounts that never link are deleted after 24 hours.
Create a bot with [@BotFather](https://t.me/BotFather), then set:

```
TELEGRAM_BOT_TOKEN=123456:ABC...     # from BotFather
TELEGRAM_BOT_USERNAME=qadr_bot       # without @
```

If no token is set, the bot container only serves its health check and the connect page
says linking is temporarily unavailable, so new accounts cannot be completed. The demo
accounts below already count as verified.

**Cloudinary (optional).** Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` to store photos on Cloudinary. If they are empty, photos go to
local disk (`server/media`, or the `media` volume in production) as WebP in three sizes.

## 2a. Run everything with Docker (easiest)

```bash
docker compose up --build
```

| What                        | Where                    |
|-----------------------------|--------------------------|
| Website (via Caddy)         | http://localhost:8080    |
| Postgres / Redis (host)     | `localhost:5433` / `localhost:6380` |

The one-off `migrate` service applies migrations and seeds demo data before the API,
worker, beat and bot start. Every service has a healthcheck (`docker compose ps`).
Host ports are bound to `127.0.0.1` and avoid the defaults (5432/6379), so the stack
does not clash with other local databases.

## 2b. Run on the host (hot reload)

```bash
docker compose up -d db redis              # infrastructure only

cd server
uv sync --group dev
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --port 8000
uv run celery -A app.tasks.celery_app worker -B --loglevel=INFO   # second terminal: Telegram delivery, reminders, cleanup
uv run python -m app.bot.main                                     # third terminal: Telegram bot (needed to sign up)

cd client
npm install
npm run dev            # http://localhost:3000 → /uz (proxies /api/v1 to :8000)
```

Both modes share the same database and `server/media`, but run only one of them at a time.

## Checks

```bash
cd server && uv run pytest -q && uv run ruff check app/ && uv run mypy app
cd client && npx tsc --noEmit && npx eslint . && npx vitest run && npm run build
cd client && npx playwright install chromium && npx playwright test   # E2E against `next start` on :3200 (API on :8000)
E2E_PORT=8080 npx playwright test                                     # or against the Docker stack
```

## Production

1. Copy `.env.example` to `.env.production` and set at least:
   - `APP_ENV=production`
   - `SITE_ADDRESS=qadr.uz` (Caddy gets HTTPS from Let's Encrypt automatically)
   - `FRONTEND_URL`, `CORS_ORIGINS` and `NEXT_PUBLIC_SITE_URL` to `https://qadr.uz`
   - `COOKIE_SECURE=true`
   - strong values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `SECRET_KEY` and `TELEGRAM_WEBHOOK_SECRET`
   - Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_MODE=webhook`, `TELEGRAM_WEBHOOK_URL=https://qadr.uz`
   - Cloudinary keys (recommended), otherwise photos stay in the `media` volume.
2. Point the domain's DNS at the server, then open ports 80 and 443.
3. Start:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

Only Caddy publishes ports. Postgres, Redis, the API, the worker, beat and the bot are
reachable only on the compose network. Images are multi-stage builds that install
from the lockfiles (`uv.lock`, `package-lock.json`), run as non-root users and contain
no secrets. Secrets are read from the env file at runtime. API logs are JSON lines.
Docker rotates logs at 20 MB × 5.

To check performance, run PageSpeed Insights against the deployed URL.

## Design system

- Tokens: `client/src/app/globals.css` (SPEC §2 palette; `muted-ink` is the AA-safe
  secondary text colour).
- Type: Brygada 1918 (display) and Onest (UI), both verified for Latin, Cyrillic and ʻ (U+02BB).
- Motifs: `client/src/components/branding/motifs.tsx`: girih lattice, Registan arch, suzani rosette.
- Photo credits: `client/public/images/CREDITS.md` (CC0 placeholders).
