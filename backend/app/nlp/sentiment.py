"""Класифікатор тональності: ансамбль ML-моделі (TF-IDF + логістична регресія) та лексичного аналізатора."""
from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion, Pipeline, make_pipeline
from sklearn.preprocessing import FunctionTransformer

from ..config import settings
from .lexicon import NEG_WINDOW, NEGATORS, lexicon_probs
from .preprocess import normalize, stem, tokenize

log = logging.getLogger("nlp.sentiment")
LABELS = ["negative", "neutral", "positive"]
ML_WEIGHT = 0.55  # частка ML-моделі в ансамблі (решта – лексичний аналізатор)


def _norm_list(texts) -> list[str]:
    return [normalize(t) for t in texts]


def _marked_stems(texts) -> list[str]:
    """Основи слів із позначкою заперечення: «не зручний» -> «не NOT_зручн»."""
    out = []
    for t in texts:
        marked, left = [], 0
        for tok in tokenize(t):
            if tok in NEGATORS:
                left = NEG_WINDOW
                marked.append(tok)
                continue
            marked.append(("NOT_" if left else "") + stem(tok))
            left = max(0, left - 1)
        out.append(" ".join(marked))
    return out


def build_pipeline() -> Pipeline:
    features = FeatureUnion([
        ("char", make_pipeline(FunctionTransformer(_norm_list), TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True))),
        ("word", make_pipeline(FunctionTransformer(_marked_stems), TfidfVectorizer(token_pattern=r"\S+", ngram_range=(1, 2), min_df=1, sublinear_tf=True))),
    ])
    clf = LogisticRegression(C=4.0, max_iter=3000, class_weight="balanced")
    return Pipeline([("features", features), ("clf", clf)])


class SentimentModel:
    def __init__(self, pipeline: Pipeline, ml_weight: float = ML_WEIGHT):
        self.pipeline = pipeline
        self.ml_weight = ml_weight

    def ml_proba(self, texts: list[str]) -> np.ndarray:
        return self.pipeline.predict_proba(texts)

    @staticmethod
    def lex_proba(texts: list[str]) -> np.ndarray:
        return np.array([lexicon_probs(t)[0] for t in texts])

    def predict_proba(self, texts: list[str], mode: str = "ensemble") -> np.ndarray:
        if mode == "ml":
            return self.ml_proba(texts)
        if mode == "lexicon":
            return self.lex_proba(texts)
        p = self.ml_weight * self.ml_proba(texts) + (1 - self.ml_weight) * self.lex_proba(texts)
        return p / p.sum(axis=1, keepdims=True)

    def predict(self, texts: list[str]) -> list[tuple[str, float]]:
        """[(тональність, впевненість)] для кожного тексту."""
        probs = self.predict_proba(texts)
        idx = probs.argmax(axis=1)
        return [(LABELS[i], float(probs[n, i])) for n, i in enumerate(idx)]


def fit_model(texts: list[str], labels: list[int]) -> SentimentModel:
    pipe = build_pipeline()
    pipe.fit(texts, labels)
    return SentimentModel(pipe)


def save_model(model: SentimentModel, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": model.pipeline, "ml_weight": model.ml_weight}, path, compress=3)


_cached: SentimentModel | None = None


def get_model() -> SentimentModel:
    """Завантажує навчену модель; якщо файлу немає – навчає її на згенерованому корпусі (кілька секунд)."""
    global _cached
    if _cached is not None:
        return _cached
    path = settings.model_path
    try:
        data = joblib.load(path)
        _cached = SentimentModel(data["pipeline"], data.get("ml_weight", ML_WEIGHT))
        log.info("Модель тональності завантажено: %s", path)
    except Exception as exc:  # файл відсутній або несумісна версія sklearn
        log.warning("Модель не завантажено (%s) – виконується навчання", exc)
        from .dataset import build_corpus

        texts, labels = build_corpus()
        _cached = fit_model(texts, labels)
        try:
            save_model(_cached, path)
        except OSError:
            pass
    return _cached
