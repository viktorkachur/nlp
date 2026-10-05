"""Підключення до бази даних (SQLAlchemy). Підтримуються SQLite (за замовчуванням) та PostgreSQL."""
from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,
)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _):  # у SQLite зовнішні ключі вимкнені за замовчуванням
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        # вбудована lower() у SQLite не розуміє кирилицю — підміняємо на Python-версію
        dbapi_connection.create_function("lower", 1, lambda v: v.lower() if v is not None else None, deterministic=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """Залежність FastAPI: сесія БД на час одного запиту."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
