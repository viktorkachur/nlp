"""Запуск аналізу набору відгуків як фонового завдання (таблиця analysis_jobs) із відображенням прогресу."""
import logging
from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import AnalysisJob, AnalysisResult, ResultKeyword, Review, ReviewSet, Topic
from ..nlp.pipeline import analyze_texts

log = logging.getLogger("analysis")
CHUNK = 250


def latest_job(db: Session, set_id: int) -> AnalysisJob | None:
    return db.scalars(select(AnalysisJob).where(AnalysisJob.set_id == set_id).order_by(AnalysisJob.id.desc()).limit(1)).first()


def has_active_job(db: Session, set_id: int) -> bool:
    job = latest_job(db, set_id)
    return job is not None and job.status in ("pending", "running")


def create_job(db: Session, review_set: ReviewSet, force: bool = False) -> AnalysisJob:
    """Створює завдання; при force=True попередні результати набору видаляються й відгуки аналізуються заново."""
    if force:
        ids = select(Review.id).where(Review.set_id == review_set.id)
        db.execute(delete(AnalysisResult).where(AnalysisResult.review_id.in_(ids)))
    todo = db.scalar(
        select(func.count(Review.id)).where(Review.set_id == review_set.id, ~Review.result.has())
    )
    job = AnalysisJob(set_id=review_set.id, status="pending", total=todo or 0, progress=0)
    db.add(job)
    db.commit()
    return job


def run_job(job_id: int) -> None:
    """Виконується у фоні: окрема сесія БД, оновлення прогресу після кожної порції."""
    db = SessionLocal()
    try:
        job = db.get(AnalysisJob, job_id)
        job.status, job.started_at = "running", datetime.now(timezone.utc)
        db.commit()
        reviews = list(db.scalars(select(Review).where(Review.set_id == job.set_id, ~Review.result.has()).order_by(Review.id)))
        job.total = len(reviews)
        db.commit()
        topics: dict[str, Topic] = {}
        done = 0
        for start in range(0, len(reviews), CHUNK):
            chunk = reviews[start:start + CHUNK]
            for review, a in zip(chunk, analyze_texts([r.text for r in chunk])):
                topic = None
                if a.topic:
                    if a.topic not in topics:
                        topics[a.topic] = Topic(job_id=job.id, label=a.topic)
                        db.add(topics[a.topic])
                        db.flush()
                    topic = topics[a.topic]
                result = AnalysisResult(job_id=job.id, review_id=review.id, topic_id=topic.id if topic else None,
                                        sentiment=a.sentiment, confidence=a.confidence)
                db.add(result)
                db.flush()
                db.add_all(ResultKeyword(result_id=result.id, keyword=w, weight=wt) for w, wt in a.keywords)
            done += len(chunk)
            job.progress = done
            db.commit()
        job.status, job.finished_at = "done", datetime.now(timezone.utc)
        db.commit()
        log.info("Аналіз набору %s завершено: %s відгуків", job.set_id, done)
    except Exception as exc:  # завдання не повинно «зависати» у статусі running
        db.rollback()
        log.exception("Помилка аналізу")
        job = db.get(AnalysisJob, job_id)
        if job:
            job.status, job.error_message, job.finished_at = "failed", str(exc)[:500], datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
