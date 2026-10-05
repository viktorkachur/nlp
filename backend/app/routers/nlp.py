"""Публічний ендпоїнт миттєвого аналізу одного тексту (демонстрація NLP-модуля)."""
from fastapi import APIRouter, Request

from ..nlp.pipeline import analyze_text
from ..schemas import AnalyzeTextIn, AnalyzeTextOut
from ..security import RateLimiter

router = APIRouter(tags=["NLP"])
limiter = RateLimiter(limit=40, window=60)


@router.post("/analyze-text", response_model=AnalyzeTextOut)
def analyze_one(data: AnalyzeTextIn, request: Request):
    limiter.check(request.client.host if request.client else "-")
    a = analyze_text(data.text.strip())
    return AnalyzeTextOut(sentiment=a.sentiment, confidence=a.confidence, topic=a.topic, keywords=[w for w, _ in a.keywords], language=a.language)
