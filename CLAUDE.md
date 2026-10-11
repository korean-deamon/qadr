# Qadr — project rules

Source of truth: `docs/SPEC.md`. Read the relevant section before any task.

## Structure
- `client/` — Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui, next-intl
- `server/` — FastAPI modular monolith, SQLAlchemy 2 async, Alembic, Celery
- `docs/SPEC.md` — full specification

## Commands
Server (inside `server/`, use `uv` only, never pip):
- Install: `uv sync --group dev`
- Migrate: `uv run alembic upgrade head`
- Run: `uv run uvicorn app.main:app --reload --port 8000`
- Test: `uv run pytest -q`
- Lint: `uv run ruff check app/`

Client (inside `client/`):
- Install: `npm install`
- Run: `npm run dev`
- Checks: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build`

## Working rules
- Extend existing code; never rewrite working parts without asking.
- Before saying a task is done: tests, lint, type-check and build must pass.
  Report real results, never claim something works without running it.
- After each finished phase: git commit with a clear message.
  No co-author lines, no "Generated with Claude" lines. Never push.
- Ask me before adding big dependencies or changing the architecture.

## Design rules (top priority)
- Must never look like a generic AI/SaaS template. Follow SPEC section 3.
- Colors only through design tokens, never hardcoded hex in components.
- Logo: `client/public/icons/logo.svg`.
- Fonts must support Latin, Cyrillic and Uzbek ʻ (U+02BB).
- Animations smooth (60fps), respect `prefers-reduced-motion`.
- After any UI change: screenshot with Playwright at 1440px and 390px,
  look at the screenshots with the Read tool, fix problems before moving on.
- Mobile: fixed bottom navigation; content never hidden behind it.

## i18n rules
- Every user-facing string goes in `client/messages/{uz,ru,en}.json`.
- All three files must have the same keys. Never show raw keys.
- Uzbek uses oʻ and gʻ with ʻ (U+02BB), not apostrophe '.

## Backend rules
- Authorization checked on the backend for every protected resource.
- Booking integrity decided in PostgreSQL transactions, never in Celery.
- API returns stable error codes; frontend translates them.
- Secrets only in `.env`, never committed, never in `NEXT_PUBLIC_`.
