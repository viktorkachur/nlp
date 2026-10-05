"""Інтеграційні тести REST API (автентифікація, авторизація, CRUD, імпорт, аналіз, статистика, звіти)."""
import pytest


# ---------------- службові ----------------
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "database": "ok"}


def test_unknown_route_returns_json_404(client):
    r = client.get("/api/nothing")
    assert r.status_code == 404 and r.json()["status"] == 404


# ---------------- автентифікація ----------------
def test_register_validation(client):
    r = client.post("/api/auth/register", json={"name": "A", "email": "bad", "password": "short"})
    assert r.status_code == 422
    assert {"name", "email", "password"} <= set(r.json()["fields"])


def test_register_weak_password_without_digit(client):
    r = client.post("/api/auth/register", json={"name": "Іван Петренко", "email": "ivan@test.com", "password": "onlyletters"})
    assert r.status_code == 422 and "password" in r.json()["fields"]


def test_register_and_duplicate(client):
    body = {"name": "Іван Петренко", "email": "Ivan@Test.com", "password": "Strong123"}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "analyst" and r.json()["user"]["email"] == "ivan@test.com"
    assert "Strong123" not in r.text and "hash" not in r.text
    dup = client.post("/api/auth/register", json=body)
    assert dup.status_code == 409 and "email" in dup.json()["fields"]


def test_login_wrong_password(client, users):
    r = client.post("/api/auth/login", json={"email": "analyst@test.com", "password": "WrongPass1"})
    assert r.status_code == 401 and r.json()["message"] == "Невірний e-mail або пароль"


def test_login_lockout_after_failed_attempts(client, users):
    for _ in range(5):
        client.post("/api/auth/login", json={"email": "analyst2@test.com", "password": "bad-password1"})
    r = client.post("/api/auth/login", json={"email": "analyst2@test.com", "password": "Test12345"})
    assert r.status_code == 429


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_me(client, users):
    r = client.get("/api/auth/me", headers=users["analyst"])
    assert r.status_code == 200 and r.json()["role"] == "analyst"


# ---------------- набори та відгуки ----------------
@pytest.fixture(scope="module")
def set_id(client, users):
    r = client.post("/api/sets", json={"name": "Тестовий набір", "description": "для тестів"}, headers=users["analyst"])
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_set_validation_and_duplicate(client, users, set_id):
    h = users["analyst"]
    assert client.post("/api/sets", json={"name": "ab"}, headers=h).status_code == 422
    dup = client.post("/api/sets", json={"name": "тестовий НАБІР"}, headers=h)
    assert dup.status_code == 409 and "name" in dup.json()["fields"]


def test_only_analyst_can_create_set(client, users):
    assert client.post("/api/sets", json={"name": "Набір менеджера"}, headers=users["manager"]).status_code == 403
    assert client.post("/api/sets", json={"name": "Набір без токена"}).status_code == 401


def test_import_txt_and_reject_bad_files(client, users, set_id):
    h = users["analyst"]
    txt = "Чудовий сервіс, дуже швидка підтримка!\nНічого не працює, жах.\nок\nДоставка запізнилась, кур'єр грубий.\n\nНормальний застосунок, нічого особливого.\n".encode()
    r = client.post(f"/api/sets/{set_id}/import", files={"file": ("reviews.txt", txt, "text/plain")}, headers=h)
    assert r.status_code == 201 and r.json() == {"imported": 4, "skipped": 1}
    bad = client.post(f"/api/sets/{set_id}/import", files={"file": ("virus.exe", b"x", "application/octet-stream")}, headers=h)
    assert bad.status_code == 400
    empty = client.post(f"/api/sets/{set_id}/import", files={"file": ("empty.txt", b"\n\n", "text/plain")}, headers=h)
    assert empty.status_code == 400


def test_import_csv_with_header_and_rating(client, users, set_id):
    csv = "id;text;rating\n1;Дуже зручний інтерфейс, дякую;5\n2;Занадто дорого за такий функціонал;1\n".encode()
    r = client.post(f"/api/sets/{set_id}/import", files={"file": ("data.csv", csv, "text/csv")}, headers=users["analyst"])
    assert r.status_code == 201 and r.json()["imported"] == 2


def test_add_review_validation(client, users, set_id):
    h = users["analyst"]
    assert client.post(f"/api/sets/{set_id}/reviews", json={"text": "ok"}, headers=h).status_code == 422
    assert client.post(f"/api/sets/{set_id}/reviews", json={"text": "Достатньо довгий відгук", "rating": 9}, headers=h).status_code == 422
    r = client.post(f"/api/sets/{set_id}/reviews", json={"text": "Достатньо довгий відгук", "rating": 4}, headers=h)
    assert r.status_code == 201 and r.json()["analysis"] is None


def test_access_control_between_users(client, users, set_id):
    assert client.get(f"/api/sets/{set_id}", headers=users["analyst2"]).status_code == 404  # чужий набір
    assert client.get(f"/api/sets/{set_id}", headers=users["manager"]).status_code == 200  # менеджер бачить усі
    assert client.delete(f"/api/sets/{set_id}", headers=users["manager"]).status_code == 403
    assert client.post(f"/api/sets/{set_id}/analyze", headers=users["manager"]).status_code == 403


def test_analysis_job_stats_and_filters(client, users, set_id):
    h = users["analyst"]
    r = client.post(f"/api/sets/{set_id}/analyze", headers=h)
    assert r.status_code == 202
    status = client.get(f"/api/sets/{set_id}/status", headers=h).json()
    assert status["status"] == "done" and status["progress"] == status["total"] > 0
    s = client.get(f"/api/sets/{set_id}", headers=h).json()
    assert s["status"] == "done" and s["analyzed"] == s["total"]

    stats = client.get("/api/stats", params={"setId": set_id}, headers=h).json()
    assert stats["total"] == s["total"]
    assert sum(stats["sentiments"].values()) == stats["total"]
    assert len(stats["weeks"]) == 8 and stats["keywords"]

    neg = client.get(f"/api/sets/{set_id}/reviews", params={"sentiment": "negative"}, headers=h).json()
    assert neg["total"] >= 1 and all(x["analysis"]["sentiment"] == "negative" for x in neg["rows"])
    found = client.get(f"/api/sets/{set_id}/reviews", params={"q": "кур'єр"}, headers=h).json()
    assert found["total"] == 1
    bad = client.get(f"/api/sets/{set_id}/reviews", params={"sentiment": "wrong"}, headers=h)
    assert bad.status_code == 422


def test_reports(client, users, set_id):
    h = users["manager"]
    r = client.post(f"/api/sets/{set_id}/reports", json={"format": "csv"}, headers=h)
    assert r.status_code == 201
    rid = r.json()["id"]
    dl = client.get(f"/api/reports/{rid}/download", headers=h)
    assert dl.status_code == 200 and dl.headers["content-type"].startswith("text/csv")
    assert "тональність" in dl.text and dl.text.count("\n") >= 5
    assert client.post(f"/api/sets/{set_id}/reports", json={"format": "doc"}, headers=h).status_code == 422
    assert client.get("/api/reports", headers=h).json()[0]["setName"] == "Тестовий набір"
    assert client.get("/api/reports", headers=users["admin"]).status_code == 403


def test_report_requires_analyzed_reviews(client, users):
    s = client.post("/api/sets", json={"name": "Порожній набір"}, headers=users["analyst"]).json()
    r = client.post(f"/api/sets/{s['id']}/reports", json={"format": "csv"}, headers=users["analyst"])
    assert r.status_code == 409


def test_delete_review_and_set_cascade(client, users):
    h = users["analyst"]
    s = client.post("/api/sets", json={"name": "Тимчасовий набір"}, headers=h).json()
    rv = client.post(f"/api/sets/{s['id']}/reviews", json={"text": "Відгук для видалення"}, headers=h).json()
    assert client.delete(f"/api/reviews/{rv['id']}", headers=h).status_code == 204
    assert client.delete(f"/api/reviews/{rv['id']}", headers=h).status_code == 404
    assert client.delete(f"/api/sets/{s['id']}", headers=h).status_code == 204
    assert client.get(f"/api/sets/{s['id']}", headers=h).status_code == 404


# ---------------- користувачі ----------------
def test_admin_users_and_roles(client, users):
    assert client.get("/api/users", headers=users["analyst"]).status_code == 403
    lst = client.get("/api/users", headers=users["admin"]).json()
    target = next(u for u in lst if u["email"] == "analyst2@test.com")
    r = client.patch(f"/api/users/{target['id']}", json={"role": "manager"}, headers=users["admin"])
    assert r.status_code == 200 and r.json()["role"] == "manager"
    assert client.patch(f"/api/users/{target['id']}", json={"role": "superuser"}, headers=users["admin"]).status_code == 422
    me = next(u for u in lst if u["email"] == "admin@test.com")
    assert client.patch(f"/api/users/{me['id']}", json={"role": "analyst"}, headers=users["admin"]).status_code == 409
    assert client.patch("/api/users/9999", json={"role": "analyst"}, headers=users["admin"]).status_code == 404


# ---------------- NLP ----------------
def test_analyze_text_endpoint(client):
    r = client.post("/api/analyze-text", json={"text": "Дуже швидка доставка, дякую!"})
    assert r.status_code == 200
    body = r.json()
    assert body["sentiment"] == "positive" and body["topic"] == "Доставка" and body["language"] == "uk"
    assert client.post("/api/analyze-text", json={"text": "x"}).status_code == 422
