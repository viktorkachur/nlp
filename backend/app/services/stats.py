"""Агрегована статистика аналізу (розподіл тональності, теми, ключові слова, динаміка за тижнями)."""
import csv
import io
from collections import Counter
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AnalysisResult, Review, ResultKeyword, Topic, User, ReviewSet

SENTIMENT_UA = {"positive": "Позитивний", "neutral": "Нейтральний", "negative": "Негативний"}


def compute_stats(db: Session, set_ids: list[int]) -> dict:
    zero = {"total": 0, "sentiments": {"positive": 0, "neutral": 0, "negative": 0}, "avgConfidence": 0.0,
            "topics": [], "keywords": [], "weeks": [], "reviewsTotal": 0}
    if not set_ids:
        zero["weeks"] = _weeks([], date.today())
        return zero

    reviews_total = db.scalar(select(func.count(Review.id)).where(Review.set_id.in_(set_ids))) or 0
    rows = db.execute(
        select(AnalysisResult.id, AnalysisResult.sentiment, AnalysisResult.confidence, Topic.label, Review.created_at)
        .join(Review, Review.id == AnalysisResult.review_id)
        .outerjoin(Topic, Topic.id == AnalysisResult.topic_id)
        .where(Review.set_id.in_(set_ids))
    ).all()

    sentiments = {"positive": 0, "neutral": 0, "negative": 0}
    topics: dict[str, dict] = {}
    for _, sentiment, _, label, _ in rows:
        sentiments[sentiment] += 1
        t = topics.setdefault(label or "Без теми", {"topic": label or "Без теми", "positive": 0, "neutral": 0, "negative": 0, "total": 0})
        t[sentiment] += 1
        t["total"] += 1

    kw = db.execute(
        select(ResultKeyword.keyword, func.count(ResultKeyword.result_id))
        .join(AnalysisResult, AnalysisResult.id == ResultKeyword.result_id)
        .join(Review, Review.id == AnalysisResult.review_id)
        .where(Review.set_id.in_(set_ids))
        .group_by(ResultKeyword.keyword)
        .order_by(func.count(ResultKeyword.result_id).desc(), ResultKeyword.keyword)
        .limit(22)
    ).all()

    end = max((r[4] for r in rows), default=date.today())
    return {
        "total": len(rows),
        "sentiments": sentiments,
        "avgConfidence": round(sum(r[2] for r in rows) / len(rows), 2) if rows else 0.0,
        "topics": sorted(topics.values(), key=lambda t: -t["total"]),
        "keywords": [{"word": w, "n": n} for w, n in kw],
        "weeks": _weeks([(r[1], r[4]) for r in rows], end),
        "reviewsTotal": reviews_total,
    }


def _weeks(items: list[tuple[str, date]], end: date) -> list[dict]:
    """8 тижневих інтервалів, що закінчуються датою end."""
    weeks = [{"i": i, "label": f"Т{i + 1}", "positive": 0, "neutral": 0, "negative": 0} for i in range(8)]
    counter: Counter = Counter()
    for sentiment, created in items:
        back = min(7, max(0, (end - created).days // 7))
        counter[(7 - back, sentiment)] += 1
    for (i, s), n in counter.items():
        weeks[i][s] = n
    return weeks


def report_rows(db: Session, set_id: int) -> list[Review]:
    return list(db.scalars(select(Review).where(Review.set_id == set_id, Review.result.has()).order_by(Review.created_at.desc(), Review.id.desc())))


def build_csv(db: Session, review_set: ReviewSet) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "текст", "тональність", "впевненість", "тема", "ключові слова", "дата"])
    for r in report_rows(db, review_set.id):
        a = r.result
        w.writerow([r.id, r.text, SENTIMENT_UA[a.sentiment], a.confidence, a.topic.label if a.topic else "", " ".join(k.keyword for k in a.keywords), r.created_at.isoformat()])
    return "﻿" + buf.getvalue()
