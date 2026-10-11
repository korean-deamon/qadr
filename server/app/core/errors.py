"""Stable error codes: the API returns codes, the frontend maps them to localized text."""

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, code: str, status: int = 400, message: str | None = None, **extra: Any) -> None:
        self.code = code
        self.status = status
        self.message = message or code
        self.extra = extra
        super().__init__(self.message)


def not_found(what: str = "RESOURCE") -> AppError:
    return AppError(f"{what}_NOT_FOUND", 404)


def forbidden(code: str = "FORBIDDEN") -> AppError:
    return AppError(code, 403)


def conflict(code: str) -> AppError:
    return AppError(code, 409)


async def app_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    headers = {}
    if "retry_after" in exc.extra:
        headers["Retry-After"] = str(exc.extra["retry_after"])
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, **exc.extra}},
        headers=headers,
    )


async def validation_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    fields = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        fields.append({"field": ".".join(loc), "code": str(err.get("type", "invalid")).upper()})
    return JSONResponse(
        status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Invalid input", "fields": fields}}
    )
