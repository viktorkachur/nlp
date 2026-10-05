# Відгуки.AI — система інтелектуального аналізу відгуків користувачів

Лабораторна робота № 8–10: бекенд (FastAPI) + локальний NLP-модуль + база даних + фронтенд (React) в одному застосунку.

**Працюючий застосунок:** https://reviewai-assr.onrender.com (Swagger-документація API: `/docs`)

## Розгортання
Застосунок розгорнуто на Render за Blueprint-файлом `render.yaml`: один вебсервіс (Docker: збірка React + FastAPI + NLP-модель)
і безкоштовна база PostgreSQL, підключена змінною `DATABASE_URL`. Для власного розгортання: Render → **New + → Blueprint** →
репозиторій `viktorkachur/nlp` → гілка `Lab8-10` → **Apply**.

> Безкоштовний тариф Render «присипляє» сервіс після 15 хвилин простою: перший запит після паузи може тривати до хвилини
> (інтерфейс показує відповідне повідомлення). Безкоштовна база PostgreSQL діє 30 днів.

## Демо-доступ
Під час першого запуску створюються демонстраційні дані (відгуки проходять через справжню NLP-модель):

| Роль | E-mail | Пароль |
|---|---|---|
| Аналітик | `analyst@example.com` | `Demo12345` |
| Менеджер продукту | `manager@example.com` | `Demo12345` |
| Адміністратор | `admin@example.com` | `Demo12345` |

Також можна **зареєструватися** (отримаєте роль аналітика) і завантажити власні відгуки у форматі CSV / TXT.
Для відключення демо-даних встановіть `SEED_DEMO=false`.

## Архітектура
```
React (Vite) ── HTTP / JSON ──▶ FastAPI ──▶ сервіси ──▶ SQLAlchemy ──▶ PostgreSQL / SQLite
                                   │
                                   └──▶ NLP-модуль (scikit-learn): тональність, теми, ключові слова
```
Фронтенд збирається в Docker-образі й віддається самим сервером, тому CORS не потрібен.

## Локальний запуск
```bash
# бекенд
cd backend
python -m venv .venv && .venv/Scripts/activate        # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
python -m app.nlp.train                               # навчання NLP-моделі (кілька секунд)
uvicorn app.main:app --reload                         # http://localhost:8000  (Swagger: /docs)

# фронтенд (у режимі розробки, проксі на :8000)
cd frontend
npm install
npm run dev                                           # http://localhost:5173
```
Без `DATABASE_URL` використовується SQLite (`backend/data/reviews.db`). Для PostgreSQL:
`DATABASE_URL=postgresql://user:pass@host:5432/db`.

Тести: `cd backend && pytest -q` (41 тест: API, автентифікація, авторизація, імпорт, аналіз, NLP).

## REST API (префікс `/api`, документація — `/docs`)
| Метод | Адреса | Призначення | Доступ |
|---|---|---|---|
| GET | `/health` | перевірка стану сервера й БД | усі |
| POST | `/auth/register`, `/auth/login` | реєстрація, вхід (JWT) | усі |
| GET | `/auth/me` | поточний користувач | авторизовані |
| POST | `/analyze-text` | миттєвий NLP-аналіз тексту | усі (ліміт запитів) |
| GET, POST | `/sets` | список / створення наборів | авторизовані / аналітик |
| GET, PATCH, DELETE | `/sets/{id}` | набір | власник (читання: менеджер, адмін) |
| GET, POST | `/sets/{id}/reviews` | відгуки з фільтрами / додавання | авторизовані / власник |
| DELETE | `/reviews/{id}` | видалення відгуку | власник |
| POST | `/sets/{id}/import` | імпорт CSV / TXT (multipart) | власник |
| POST | `/sets/{id}/analyze` | запуск аналізу (фонове завдання) | власник |
| GET | `/sets/{id}/status` | прогрес аналізу | авторизовані |
| GET | `/stats?setId=` | статистика | авторизовані |
| GET, POST | `/reports`, `/sets/{id}/reports` | звіти | аналітик, менеджер |
| GET | `/reports/{id}/download` | завантаження CSV | аналітик, менеджер |
| GET, PATCH | `/users`, `/users/{id}` | керування ролями | адміністратор |

Помилки мають єдиний формат: `{"status": 404, "message": "...", "fields": {...}}`.

## NLP-модуль (`backend/app/nlp`)
* **Тональність** — ансамбль: TF-IDF (символьні n-грами + слова з маркуванням заперечень) + логістична регресія,
  та лексичний аналізатор (укр. / англ.) з запереченнями, підсилювачами й протиставленнями («але»).
  Модель навчається на згенерованому корпусі (`dataset.py`) командою `python -m app.nlp.train`.
* **Теми** — словник аспектів (швидкодія, інтерфейс, підтримка, ціна, доставка …).
* **Ключові слова** — TF-IDF за корпусом набору з підвищенням ваги тематичних та оцінних слів.
* Усе виконується локально, без зовнішніх API.

## Структура
```
backend/   app/{routers,services,nlp,models.py,schemas.py,security.py,...}, tests/, requirements*.txt
frontend/  src/{api,pages,components,context,hooks,...}  (Vite + React)
Dockerfile, render.yaml
```
