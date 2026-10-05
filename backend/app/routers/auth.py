"""Автентифікація: реєстрація, вхід, поточний користувач."""
import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import ApiError
from ..models import Role, User
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, get_current_user, hash_password, login_limiter, verify_password
from ..services.serialize import user_out

router = APIRouter(prefix="/auth", tags=["Автентифікація"])
log = logging.getLogger("auth")


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """Реєстрація нового користувача (роль за замовчуванням – аналітик)."""
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise ApiError(409, "Користувач з таким e-mail уже існує", {"email": "E-mail вже зайнятий"})
    role = db.scalar(select(Role).where(Role.name == "analyst"))
    user = User(email=data.email, password_hash=hash_password(data.password), full_name=data.name, role_id=role.id)
    db.add(user)
    db.commit()
    db.refresh(user)
    log.info("Зареєстровано користувача %s", user.email)
    return TokenOut(token=create_token(user), user=user_out(user))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    key = f"{email}|{request.client.host if request.client else '-'}"
    login_limiter.check(key)
    user = db.scalar(select(User).where(User.email == email))
    # перевіряємо хеш навіть для неіснуючого користувача, щоб не розкривати наявність акаунта за часом відповіді
    ok = verify_password(data.password, user.password_hash if user else "$2b$12$" + "x" * 53)
    if not user or not ok:
        login_limiter.fail(key)
        log.warning("Невдала спроба входу: %s", email)
        raise ApiError(401, "Невірний e-mail або пароль")
    login_limiter.success(key)
    log.info("Вхід: %s", email)
    return TokenOut(token=create_token(user), user=user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user_out(user)
