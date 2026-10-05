"""Адміністрування користувачів (лише роль admin)."""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import ApiError
from ..models import Role, User
from ..schemas import RoleIn, UserOut
from ..security import require_roles
from ..services.serialize import user_out

router = APIRouter(prefix="/users", tags=["Користувачі"])
log = logging.getLogger("users")


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    return [user_out(u) for u in db.scalars(select(User).order_by(User.id))]


@router.patch("/{user_id}", response_model=UserOut)
def change_role(user_id: int, data: RoleIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(404, "Користувача не знайдено")
    if user.id == admin.id and data.role != "admin":
        raise ApiError(409, "Не можна позбавити себе ролі адміністратора")
    user.role_id = db.scalar(select(Role.id).where(Role.name == data.role))
    db.commit()
    db.refresh(user)
    log.info("Адміністратор %s змінив роль %s на %s", admin.email, user.email, data.role)
    return user_out(user)
