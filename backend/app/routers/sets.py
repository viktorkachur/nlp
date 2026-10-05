"""Набори відгуків, відгуки, імпорт файлів та запуск аналізу."""
import logging
import math

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import ApiError
from ..models import Review, ReviewSet, AnalysisResult, Topic, User
from ..schemas import ImportOut, JobOut, ReviewIn, ReviewOut, ReviewsPage, SetIn, SetOut, SetPatch
from ..security import get_current_user, require_roles
from ..services import analysis as analysis_service
from ..services.access import get_set, visible_set_ids
from ..services.imports import parse_upload
from ..services.serialize import review_out, set_out

router = APIRouter(tags=["Набори та відгуки"])
log = logging.getLogger("sets")


# ---------------- набори ----------------
@router.get("/sets", response_model=list[SetOut])
def list_sets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ids = visible_set_ids(db, user)
    sets = db.scalars(select(ReviewSet).where(ReviewSet.id.in_(ids)).order_by(ReviewSet.id))
    return [set_out(db, s) for s in sets]


@router.post("/sets", response_model=SetOut, status_code=201)
def create_set(data: SetIn, db: Session = Depends(get_db), user: User = Depends(require_roles("analyst"))):
    exists = db.scalar(select(ReviewSet.id).where(ReviewSet.owner_id == user.id, func.lower(ReviewSet.name) == data.name.lower()))
    if exists:
        raise ApiError(409, "Набір з такою назвою вже існує", {"name": "Назва вже використовується"})
    s = ReviewSet(owner_id=user.id, name=data.name, description=(data.description or "").strip() or None)
    db.add(s)
    db.commit()
    return set_out(db, s)


@router.get("/sets/{set_id}", response_model=SetOut)
def get_one(set_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return set_out(db, get_set(db, user, set_id))


@router.patch("/sets/{set_id}", response_model=SetOut)
def update_set(set_id: int, data: SetPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = get_set(db, user, set_id, write=True)
    if data.name is not None:
        name = data.name.strip()
        clash = db.scalar(select(ReviewSet.id).where(ReviewSet.owner_id == user.id, func.lower(ReviewSet.name) == name.lower(), ReviewSet.id != s.id))
        if clash:
            raise ApiError(409, "Набір з такою назвою вже існує", {"name": "Назва вже використовується"})
        s.name = name
    if data.description is not None:
        s.description = data.description.strip() or None
    db.commit()
    return set_out(db, s)


@router.delete("/sets/{set_id}", status_code=204)
def delete_set(set_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = get_set(db, user, set_id, write=True)
    db.delete(s)  # відгуки, результати та звіти видаляються каскадно
    db.commit()
    log.info("Видалено набір %s користувачем %s", set_id, user.email)


# ---------------- відгуки ----------------
@router.get("/sets/{set_id}/reviews", response_model=ReviewsPage)
def list_reviews(
    set_id: int,
    sentiment: str = Query("all", pattern="^(all|positive|neutral|negative)$"),
    topic: str = "all",
    q: str = Query("", max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=100, alias="pageSize"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_set(db, user, set_id)
    stmt = select(Review).where(Review.set_id == set_id)
    if sentiment != "all" or topic != "all":
        stmt = stmt.join(AnalysisResult, AnalysisResult.review_id == Review.id)
        if sentiment != "all":
            stmt = stmt.where(AnalysisResult.sentiment == sentiment)
        if topic != "all":
            stmt = stmt.join(Topic, Topic.id == AnalysisResult.topic_id).where(Topic.label == topic)
    if q.strip():
        stmt = stmt.where(func.lower(Review.text).contains(q.strip().lower()))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Review.created_at.desc(), Review.id.desc()).offset((page - 1) * page_size).limit(page_size)).unique().all()
    return ReviewsPage(total=total, pages=max(1, math.ceil(total / page_size)), rows=[review_out(r) for r in rows])


@router.post("/sets/{set_id}/reviews", response_model=ReviewOut, status_code=201)
def add_review(set_id: int, data: ReviewIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = get_set(db, user, set_id, write=True)
    r = Review(set_id=s.id, text=data.text, rating=data.rating, source="manual")
    db.add(r)
    db.commit()
    return review_out(r)


@router.delete("/reviews/{review_id}", status_code=204)
def delete_review(review_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(Review, review_id)
    if r is None:
        raise ApiError(404, "Відгук не знайдено")
    get_set(db, user, r.set_id, write=True)
    db.delete(r)
    db.commit()


@router.post("/sets/{set_id}/import", response_model=ImportOut, status_code=201)
async def import_reviews(set_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Імпорт відгуків із файлу CSV або TXT (розбір і валідація виконуються на сервері)."""
    s = get_set(db, user, set_id, write=True)
    raw = await file.read()
    rows, skipped, source = parse_upload(file.filename or "", raw)
    db.add_all(Review(set_id=s.id, text=r["text"], rating=r["rating"], source=source) for r in rows)
    db.commit()
    log.info("Імпортовано %s відгуків у набір %s", len(rows), s.id)
    return ImportOut(imported=len(rows), skipped=skipped)


# ---------------- аналіз ----------------
@router.post("/sets/{set_id}/analyze", response_model=JobOut, status_code=202)
def analyze(set_id: int, background: BackgroundTasks, force: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Запускає аналіз у фоні. Опитуйте GET /sets/{id}/status до статусу done / failed."""
    s = get_set(db, user, set_id, write=True)
    if analysis_service.has_active_job(db, s.id):
        raise ApiError(409, "Аналіз цього набору вже виконується")
    job = analysis_service.create_job(db, s, force=force)
    background.add_task(analysis_service.run_job, job.id)
    return JobOut(id=job.id, set_id=s.id, status="pending", progress=0, total=job.total)


@router.get("/sets/{set_id}/status", response_model=JobOut)
def status(set_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    get_set(db, user, set_id)
    job = analysis_service.latest_job(db, set_id)
    if job is None:
        return JobOut(id=None, set_id=set_id, status="idle", progress=0, total=0)
    return JobOut(id=job.id, set_id=set_id, status=job.status, progress=job.progress, total=job.total, error=job.error_message)
