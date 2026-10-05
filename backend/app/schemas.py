"""Pydantic-схеми запитів і відповідей (валідація вхідних даних на сервері). У JSON поля віддаються в camelCase."""
import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
Role = Literal["analyst", "manager", "admin"]
Sentiment = Literal["positive", "neutral", "negative"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- автентифікація та користувачі ----------
class RegisterIn(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return v.strip()

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Некоректна електронна адреса")
        return v

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        if not re.search(r"\d", v) or not re.search(r"[A-Za-zА-Яа-яІіЇїЄєҐґ]", v):
            raise ValueError("Пароль має містити літери та хоча б одну цифру")
        return v


class LoginIn(CamelModel):
    email: str
    password: str = Field(max_length=72)


class UserOut(CamelModel):
    id: int
    email: str
    name: str
    role: str
    created: date


class TokenOut(CamelModel):
    token: str
    user: UserOut


class RoleIn(CamelModel):
    role: Role


# ---------- набори відгуків ----------
class SetIn(CamelModel):
    name: str = Field(min_length=3, max_length=60)
    description: str | None = Field(default=None, max_length=200)

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Назва має містити щонайменше 3 символи")
        return v


class SetPatch(CamelModel):
    name: str | None = Field(default=None, min_length=3, max_length=60)
    description: str | None = Field(default=None, max_length=200)


class SetOut(CamelModel):
    id: int
    name: str
    description: str | None
    created: date
    status: Literal["pending", "running", "done"]
    owner_id: int
    total: int
    analyzed: int


# ---------- відгуки ----------
class ReviewIn(CamelModel):
    text: str = Field(min_length=5, max_length=5000)
    rating: int | None = Field(default=None, ge=1, le=5)

    @field_validator("text")
    @classmethod
    def _text(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Відгук надто короткий (мінімум 5 символів)")
        return v


class AnalysisOut(CamelModel):
    sentiment: Sentiment
    confidence: float
    topic: str | None
    keywords: list[str]


class ReviewOut(CamelModel):
    id: int
    text: str
    source: str
    rating: int | None
    created: date
    analysis: AnalysisOut | None


class ReviewsPage(CamelModel):
    total: int
    pages: int
    rows: list[ReviewOut]


class ImportOut(CamelModel):
    imported: int
    skipped: int


class JobOut(CamelModel):
    id: int | None
    set_id: int
    status: Literal["idle", "pending", "running", "done", "failed"]
    progress: int
    total: int
    error: str | None = None


# ---------- статистика ----------
class TopicStat(CamelModel):
    topic: str
    positive: int
    neutral: int
    negative: int
    total: int


class KeywordStat(CamelModel):
    word: str
    n: int


class WeekStat(CamelModel):
    i: int
    label: str
    positive: int
    neutral: int
    negative: int


class StatsOut(CamelModel):
    total: int
    sentiments: dict[str, int]
    avg_confidence: float
    topics: list[TopicStat]
    keywords: list[KeywordStat]
    weeks: list[WeekStat]
    reviews_total: int


# ---------- звіти ----------
class ReportIn(CamelModel):
    format: Literal["csv", "pdf"]


class ReportOut(CamelModel):
    id: int
    set_id: int
    set_name: str
    format: str
    created: date
    author: str


# ---------- миттєвий аналіз тексту ----------
class AnalyzeTextIn(CamelModel):
    text: str = Field(min_length=3, max_length=2000)


class AnalyzeTextOut(CamelModel):
    sentiment: Sentiment
    confidence: float
    topic: str | None
    keywords: list[str]
    language: str
