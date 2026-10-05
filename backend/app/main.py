"""Точка входу FastAPI: REST API (/api), документація (/docs), роздача зібраного фронтенду (SPA)."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .config import settings
from .database import Base, SessionLocal, engine
from .errors import register_handlers
from .nlp.sentiment import get_model
from .routers import auth, nlp, reports, sets, users
from .services.seed import ensure_roles, seed_demo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)  # створення таблиць, якщо їх ще немає
    with SessionLocal() as db:
        seed_demo(db) if settings.seed_demo else ensure_roles(db)
    get_model()  # завантаження NLP-моделі під час запуску (а не під час першого запиту)
    log.info("Сервер готовий. БД: %s", engine.url.render_as_string(hide_password=True))
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan,
              description="REST API системи інтелектуального аналізу відгуків користувачів (лабораторна робота № 8–10).")
register_handlers(app)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def access_log(request: Request, call_next):
    """Журнал подій: метод, адреса, статус та тривалість кожного запиту до API."""
    start = time.perf_counter()
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        log.info("%s %s -> %s (%.0f мс)", request.method, request.url.path, response.status_code, (time.perf_counter() - start) * 1000)
    return response


api = APIRouter(prefix="/api")


@api.get("/health", tags=["Службові"])
def health():
    """Перевірка працездатності (для хостингу): стан сервера та БД."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


for r in (auth.router, users.router, sets.router, reports.router, nlp.router):
    api.include_router(r)
app.include_router(api)

# Зібраний фронтенд (каталог static/ створюється Dockerfile-ом); без нього працює лише API
if settings.static_dir.is_dir():
    app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="frontend")
