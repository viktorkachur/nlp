"""ORM-моделі. Структура відповідає базі даних із лабораторної роботи № 5
(додатково: поля progress / total в analysis_jobs для відображення прогресу аналізу)."""
from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True)
    __table_args__ = (CheckConstraint("name IN ('analyst','manager','admin')", name="ck_roles_name"),)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    role: Mapped[Role] = relationship(lazy="joined")
    sets: Mapped[list["ReviewSet"]] = relationship(back_populates="owner", cascade="all, delete-orphan", passive_deletes=True)


class ReviewSet(Base):
    __tablename__ = "review_sets"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped[User] = relationship(back_populates="sets")
    reviews: Mapped[list["Review"]] = relationship(back_populates="review_set", cascade="all, delete-orphan", passive_deletes=True)
    jobs: Mapped[list["AnalysisJob"]] = relationship(back_populates="review_set", cascade="all, delete-orphan", passive_deletes=True)
    reports: Mapped[list["Report"]] = relationship(back_populates="review_set", cascade="all, delete-orphan", passive_deletes=True)
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_set_owner_name"),)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("review_sets.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(10), default="manual")
    rating: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[date] = mapped_column(Date, default=date.today)

    review_set: Mapped[ReviewSet] = relationship(back_populates="reviews")
    result: Mapped["AnalysisResult | None"] = relationship(back_populates="review", cascade="all, delete-orphan", passive_deletes=True, uselist=False)
    __table_args__ = (
        CheckConstraint("source IN ('manual','csv','txt')", name="ck_reviews_source"),
        CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 5", name="ck_reviews_rating"),
    )


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("review_sets.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(10), default="pending")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)

    review_set: Mapped[ReviewSet] = relationship(back_populates="jobs")
    __table_args__ = (CheckConstraint("status IN ('pending','running','done','failed')", name="ck_jobs_status"),)


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("analysis_jobs.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(80))
    __table_args__ = (UniqueConstraint("job_id", "label", name="uq_topic_job_label"),)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("analysis_jobs.id", ondelete="CASCADE"))
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"))
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"))
    sentiment: Mapped[str] = mapped_column(String(10))
    confidence: Mapped[float] = mapped_column(Float)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    review: Mapped[Review] = relationship(back_populates="result")
    topic: Mapped[Topic | None] = relationship(lazy="joined")
    keywords: Mapped[list["ResultKeyword"]] = relationship(cascade="all, delete-orphan", passive_deletes=True, lazy="selectin")
    __table_args__ = (
        UniqueConstraint("job_id", "review_id", name="uq_result_job_review"),
        CheckConstraint("sentiment IN ('positive','neutral','negative')", name="ck_results_sentiment"),
        CheckConstraint("confidence BETWEEN 0 AND 1", name="ck_results_confidence"),
        Index("idx_results_review", "review_id"),
        Index("idx_results_job_sent", "job_id", "sentiment"),
    )


class ResultKeyword(Base):
    __tablename__ = "result_keywords"
    result_id: Mapped[int] = mapped_column(ForeignKey("analysis_results.id", ondelete="CASCADE"), primary_key=True)
    keyword: Mapped[str] = mapped_column(String(80), primary_key=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    __table_args__ = (CheckConstraint("weight >= 0", name="ck_keywords_weight"), Index("idx_keywords_keyword", "keyword"))


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("review_sets.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    format: Mapped[str] = mapped_column(String(3))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    review_set: Mapped[ReviewSet] = relationship(back_populates="reports")
    author: Mapped[User] = relationship(lazy="joined")
    __table_args__ = (CheckConstraint("format IN ('csv','pdf')", name="ck_reports_format"),)
