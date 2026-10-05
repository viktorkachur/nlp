"""Статистика та звіти."""
import logging

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import ApiError
from ..models import Report, ReviewSet, User
from ..schemas import ReportIn, ReportOut, ReviewOut, StatsOut
from ..security import get_current_user, require_roles
from ..services.access import get_set, visible_set_ids
from ..services.serialize import report_out, review_out
from ..services.stats import build_csv, compute_stats, report_rows

router = APIRouter(tags=["Статистика та звіти"])
log = logging.getLogger("reports")


@router.get("/stats", response_model=StatsOut)
def stats(set_id: int | None = Query(None, alias="setId"), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Статистика за одним набором (?setId=) або за всіма доступними користувачу наборами."""
    if set_id is not None:
        get_set(db, user, set_id)
        ids = [set_id]
    else:
        ids = visible_set_ids(db, user)
    return compute_stats(db, ids)


@router.get("/reports", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), user: User = Depends(require_roles("analyst", "manager"))):
    ids = visible_set_ids(db, user)
    reports = db.scalars(select(Report).where(Report.set_id.in_(ids)).order_by(Report.id.desc()))
    return [report_out(r) for r in reports]


@router.post("/sets/{set_id}/reports", response_model=ReportOut, status_code=201)
def create_report(set_id: int, data: ReportIn, db: Session = Depends(get_db), user: User = Depends(require_roles("analyst", "manager"))):
    s = get_set(db, user, set_id)
    if not report_rows(db, s.id):
        raise ApiError(409, "У наборі немає проаналізованих відгуків — спочатку запустіть аналіз")
    r = Report(set_id=s.id, created_by=user.id, format=data.format)
    db.add(r)
    db.commit()
    db.refresh(r)
    log.info("Сформовано звіт %s (%s) за набором %s", r.id, r.format, s.id)
    return report_out(r)


@router.get("/sets/{set_id}/report-data", response_model=list[ReviewOut])
def report_data(set_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("analyst", "manager"))):
    """Проаналізовані відгуки набору (для перегляду звіту та друку в PDF)."""
    s = get_set(db, user, set_id)
    return [review_out(r) for r in report_rows(db, s.id)]


@router.get("/reports/{report_id}/download")
def download(report_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("analyst", "manager"))):
    r = db.get(Report, report_id)
    if r is None:
        raise ApiError(404, "Звіт не знайдено")
    s = get_set(db, user, r.set_id)
    if r.format != "csv":
        raise ApiError(400, "Для PDF-звіту використовуйте перегляд і друк у браузері")
    return Response(
        build_csv(db, s),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="report_{s.id}.csv"'},
    )
