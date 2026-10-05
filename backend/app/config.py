"""Налаштування застосунку (зчитуються зі змінних середовища)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _bool(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        data_dir = BASE_DIR / "data"
        data_dir.mkdir(exist_ok=True)
        return f"sqlite:///{(data_dir / 'reviews.db').as_posix()}"
    # Render та інші хостинги віддають postgres:// — SQLAlchemy очікує драйвер psycopg
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings:
    app_name = "Відгуки.AI API"
    database_url: str = _database_url()
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-me-in-production-0123456789")
    jwt_algorithm = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
    seed_demo: bool = _bool("SEED_DEMO", "true")
    cors_origins: list[str] = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "10"))
    max_reviews_per_upload: int = int(os.getenv("MAX_REVIEWS_PER_UPLOAD", "5000"))
    max_login_attempts: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    lockout_minutes: int = int(os.getenv("LOCKOUT_MINUTES", "5"))
    static_dir: Path = Path(os.getenv("STATIC_DIR", str(BASE_DIR / "static")))
    model_path: Path = Path(os.getenv("MODEL_PATH", str(BASE_DIR / "app" / "nlp" / "artifacts" / "sentiment.joblib")))


settings = Settings()
