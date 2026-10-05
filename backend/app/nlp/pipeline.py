"""Єдина точка входу NLP-модуля: тональність + тема + ключові слова."""
from dataclasses import dataclass, field

from .keywords import extract_keywords
from .preprocess import detect_language
from .sentiment import get_model
from .topics import detect_topic


@dataclass
class Analysis:
    sentiment: str
    confidence: float
    topic: str | None
    language: str
    keywords: list[tuple[str, float]] = field(default_factory=list)


def analyze_texts(texts: list[str]) -> list[Analysis]:
    """Пакетний аналіз відгуків одного набору (TF-IDF рахується за всім набором)."""
    if not texts:
        return []
    sentiments = get_model().predict(texts)
    keywords = extract_keywords(texts)
    return [
        Analysis(
            sentiment=label,
            confidence=round(min(0.99, max(0.34, conf)), 2),
            topic=detect_topic(text),
            language=detect_language(text),
            keywords=kw,
        )
        for text, (label, conf), kw in zip(texts, sentiments, keywords)
    ]


def analyze_text(text: str) -> Analysis:
    return analyze_texts([text])[0]
