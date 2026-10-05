"""Правила доступу до наборів відгуків: аналітик бачить лише свої набори, менеджер та адміністратор – усі (лише читання)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..errors import ApiError
from ..models import ReviewSet, User


def visible_set_ids(db: Session, user: User) -> list[int]:
    stmt = select(ReviewSet.id)
    if user.role.name == "analyst":
        stmt = stmt.where(ReviewSet.owner_id == user.id)
    return list(db.scalars(stmt))


def get_set(db: Session, user: User, set_id: int, write: bool = False) -> ReviewSet:
    s = db.get(ReviewSet, set_id)
    if s is None:
        raise ApiError(404, "Набір відгуків не знайдено")
    if user.role.name == "analyst" and s.owner_id != user.id:
        raise ApiError(404, "Набір відгуків не знайдено")  # не розкриваємо існування чужих наборів
    if write and (user.role.name != "analyst" or s.owner_id != user.id):
        raise ApiError(403, "Змінювати набори може лише їх власник-аналітик")
    return s
