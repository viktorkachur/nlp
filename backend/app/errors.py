"""Єдиний формат помилок API: {"status": <код>, "message": <текст>, "fields": {<поле>: <повідомлення>}}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("api")


class ApiError(Exception):
    def __init__(self, status: int, message: str, fields: dict[str, str] | None = None):
        self.status, self.message, self.fields = status, message, fields or {}


def _body(status: int, message: str, fields: dict | None = None) -> dict:
    body = {"status": status, "message": message}
    if fields:
        body["fields"] = fields
    return body


def register_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return JSONResponse(_body(exc.status, exc.message, exc.fields), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(p) for p in err["loc"] if p not in ("body", "query", "path")]
            msg = err.get("msg", "Некоректне значення")
            fields[".".join(loc) or "body"] = msg.removeprefix("Value error, ")
        return JSONResponse(_body(422, "Помилка валідації вхідних даних", fields), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        messages = {401: "Необхідна автентифікація", 403: "Доступ заборонено", 404: "Ресурс не знайдено", 405: "Метод не підтримується"}
        return JSONResponse(_body(exc.status_code, messages.get(exc.status_code, str(exc.detail))), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("Необроблена помилка: %s", exc)
        return JSONResponse(_body(500, "Внутрішня помилка сервера"), status_code=500)
