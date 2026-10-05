"""Перетворення ORM-об'єктів у відповіді API."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AnalysisResult, Report, Review, ReviewSet, User
from ..schemas import AnalysisOut, ReportOut, ReviewOut, SetOut, UserOut
from .analysis import has_active_job


def user_out(u: User) -> UserOut:
    return UserOut(id=u.id, email=u.email, name=u.full_name, role=u.role.name, created=u.created_at.date())


def review_out(r: Review) -> ReviewOut:
    a = r.result
    analysis = None
    if a:
        words = [k.keyword for k in sorted(a.keywords, key=lambda k: -k.weight)]
        analysis = AnalysisOut(sentiment=a.sentiment, confidence=a.confidence, topic=a.topic.label if a.topic else None, keywords=words)
    return ReviewOut(id=r.id, text=r.text, source=r.source, rating=r.rating, created=r.created_at, analysis=analysis)


def set_out(db: Session, s: ReviewSet) -> SetOut:
    total = db.scalar(select(func.count(Review.id)).where(Review.set_id == s.id)) or 0
    analyzed = db.scalar(select(func.count(AnalysisResult.id)).join(Review, Review.id == AnalysisResult.review_id).where(Review.set_id == s.id)) or 0
    status = "running" if has_active_job(db, s.id) else ("done" if total and analyzed >= total else "pending")
    return SetOut(id=s.id, name=s.name, description=s.description, created=s.created_at.date(), status=status,
                  owner_id=s.owner_id, total=total, analyzed=analyzed)


def report_out(r: Report) -> ReportOut:
    return ReportOut(id=r.id, set_id=r.set_id, set_name=r.review_set.name, format=r.format, created=r.created_at.date(), author=r.author.full_name)
