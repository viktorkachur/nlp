import os
import tempfile

# налаштування середовища ДО імпорту застосунку: тестова БД у тимчасовому файлі, без демонстраційних даних
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SEED_DEMO"] = "false"
os.environ["STATIC_DIR"] = f"{_tmp}/no-static"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import SessionLocal
from app.main import app
from app.models import Role, User
from app.security import hash_password

PASSWORD = "Test12345"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, email):
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def users(client):
    """Створює аналітиків, менеджера та адміністратора й повертає заголовки авторизації."""
    out = {}
    with SessionLocal() as db:
        roles = {r.name: r.id for r in db.scalars(select(Role))}
        for key, role in (("analyst", "analyst"), ("analyst2", "analyst"), ("manager", "manager"), ("admin", "admin")):
            db.add(User(email=f"{key}@test.com", password_hash=hash_password(PASSWORD), full_name=f"User {key}", role_id=roles[role]))
        db.commit()
    for key in ("analyst", "analyst2", "manager", "admin"):
        out[key] = _login(client, f"{key}@test.com")
    return out
