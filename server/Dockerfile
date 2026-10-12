# syntax=docker/dockerfile:1.7
# Qadr API, Celery worker/beat and Telegram bot share one image (targets: api, bot).
# Dependencies come only from uv.lock; no secrets are baked in (env at runtime).

FROM ghcr.io/astral-sh/uv:0.12.5 AS uv

FROM python:3.13.9-slim-bookworm AS build
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /src
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.13.9-slim-bookworm AS runtime
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    MEDIA_ROOT=/app/media
RUN groupadd --system --gid 10001 qadr \
 && useradd --system --uid 10001 --gid qadr --home-dir /app --shell /usr/sbin/nologin qadr
WORKDIR /app
COPY --from=build /opt/venv /opt/venv
COPY --chown=qadr:qadr alembic.ini ./
COPY --chown=qadr:qadr alembic ./alembic
COPY --chown=qadr:qadr app ./app
RUN mkdir -p /app/media && chown qadr:qadr /app/media
USER qadr

FROM runtime AS api
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=4s --start-period=20s --retries=5 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=3).status == 200 else 1)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-server-header", "--no-access-log"]

FROM runtime AS bot
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=4s --start-period=15s --retries=5 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8081/tg/health', timeout=3).status == 200 else 1)"]
CMD ["python", "-m", "app.bot.main"]
