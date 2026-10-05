"""Безпека: хешування паролів (bcrypt), JWT-токени, перевірка ролей, захист від підбору пароля."""
import logging
import time
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .errors import ApiError
from .models import User

log = logging.getLogger("security")
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("ascii"))
    except ValueError:
        return False


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role.name,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if creds is None:
        raise ApiError(401, "Необхідна автентифікація")
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise ApiError(401, "Недійсний або прострочений токен") from None
    if user is None:
        raise ApiError(401, "Користувача не існує")
    return user


def require_roles(*roles: str):
    """Залежність-фабрика: дозволяє доступ лише вказаним ролям (авторизація)."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in roles:
            raise ApiError(403, "Недостатньо прав для цієї дії")
        return user
    return checker


class LoginLimiter:
    """Тимчасове блокування після кількох невдалих спроб входу (захист від підбору пароля)."""

    def __init__(self) -> None:
        self._state: dict[str, tuple[int, float]] = {}

    def check(self, key: str) -> None:
        count, locked_until = self._state.get(key, (0, 0.0))
        if locked_until > time.time():
            minutes = int((locked_until - time.time()) // 60) + 1
            raise ApiError(429, f"Забагато невдалих спроб входу. Спробуйте через {minutes} хв.")

    def fail(self, key: str) -> None:
        count, _ = self._state.get(key, (0, 0.0))
        count += 1
        locked = time.time() + settings.lockout_minutes * 60 if count >= settings.max_login_attempts else 0.0
        self._state[key] = (0 if locked else count, locked)
        if locked:
            log.warning("Тимчасове блокування входу для %s", key)

    def success(self, key: str) -> None:
        self._state.pop(key, None)


login_limiter = LoginLimiter()


class RateLimiter:
    """Простий ліміт запитів за IP (для публічних ендпоїнтів)."""

    def __init__(self, limit: int, window: int = 60) -> None:
        self.limit, self.window = limit, window
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        now = time.time()
        hits = [t for t in self._hits.get(key, []) if now - t < self.window]
        if len(hits) >= self.limit:
            raise ApiError(429, "Забагато запитів. Спробуйте за хвилину.")
        hits.append(now)
        self._hits[key] = hits
