"""Розбір завантажених файлів CSV / TXT на сервері (з перевіркою формату, розміру та кодування)."""
import csv
import io

from ..config import settings
from ..errors import ApiError

TEXT_COLUMNS = {"text", "review", "comment", "content", "відгук", "текст", "коментар"}
RATING_COLUMNS = {"rating", "stars", "score", "оцінка", "рейтинг"}
MIN_LEN, MAX_LEN = 5, 5000


def _decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "cp1251"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise ApiError(400, "Не вдалося визначити кодування файлу (очікується UTF-8 або Windows-1251)")


def _rating(value: str | None) -> int | None:
    try:
        r = int(float((value or "").strip().replace(",", ".")))
    except ValueError:
        return None
    return r if 1 <= r <= 5 else None


def parse_upload(filename: str, raw: bytes) -> tuple[list[dict], int, str]:
    """Повертає (відгуки [{text, rating}], кількість пропущених рядків, джерело 'csv'|'txt')."""
    name = (filename or "").lower()
    if not name.endswith((".csv", ".txt")):
        raise ApiError(400, "Підтримуються лише файли CSV та TXT")
    if len(raw) > settings.max_upload_mb * 1024 * 1024:
        raise ApiError(413, f"Файл перевищує {settings.max_upload_mb} МБ")
    content = _decode(raw)
    rows: list[dict] = []
    total_lines = 0

    if name.endswith(".csv"):
        source = "csv"
        sample = content[:4096]
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel
        table = [r for r in csv.reader(io.StringIO(content), dialect) if any(c.strip() for c in r)]
        total_lines = len(table)
        if not table:
            raise ApiError(400, "Файл порожній")
        head = [c.strip().lower() for c in table[0]]
        t_col = next((i for i, h in enumerate(head) if h in TEXT_COLUMNS), None)
        r_col = next((i for i, h in enumerate(head) if h in RATING_COLUMNS), None)
        body = table[1:] if t_col is not None else table
        total_lines = len(body)
        for r in body:
            text = (r[t_col if t_col is not None else 0] if len(r) > (t_col or 0) else "").strip()
            rows.append({"text": text, "rating": _rating(r[r_col]) if r_col is not None and len(r) > r_col else None})
    else:
        source = "txt"
        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        total_lines = len(lines)
        rows = [{"text": ln, "rating": None} for ln in lines]

    good = [{"text": r["text"][:MAX_LEN], "rating": r["rating"]} for r in rows if len(r["text"]) >= MIN_LEN]
    if not good:
        raise ApiError(400, "У файлі не знайдено жодного коректного відгуку (мінімум 5 символів)")
    if len(good) > settings.max_reviews_per_upload:
        raise ApiError(413, f"Забагато відгуків: максимум {settings.max_reviews_per_upload} за один імпорт")
    return good, total_lines - len(good), source
