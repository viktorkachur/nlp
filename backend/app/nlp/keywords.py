"""Вилучення ключових слів: TF-IDF за корпусом набору відгуків із підвищенням ваги тематичних та оцінних слів."""
from sklearn.feature_extraction.text import TfidfVectorizer

from .lexicon import NEGATIVE, POSITIVE
from .preprocess import content_tokens
from .topics import is_aspect_word

_POLAR = {p for p in list(POSITIVE) + list(NEGATIVE) if " " not in p}


def _boost(token: str) -> float:
    if is_aspect_word(token):
        return 1.5
    if any(token.startswith(p) for p in _POLAR):
        return 1.3
    return 1.0


def extract_keywords(texts: list[str], top_k: int = 3) -> list[list[tuple[str, float]]]:
    """Для кожного тексту повертає до top_k пар (слово, вага 0..1)."""
    if not texts:
        return []
    token_lists = [content_tokens(t) for t in texts]
    if not any(token_lists):
        return [[] for _ in texts]
    vec = TfidfVectorizer(analyzer=lambda x: x, sublinear_tf=True)  # вхід — уже токени
    matrix = vec.fit_transform(token_lists)
    vocab = vec.get_feature_names_out()
    result: list[list[tuple[str, float]]] = []
    for row, tokens in enumerate(token_lists):
        if not tokens:
            result.append([])
            continue
        row_data = matrix.getrow(row)
        scored = [(vocab[j], v * _boost(vocab[j])) for j, v in zip(row_data.indices, row_data.data) if len(vocab[j]) >= 4]
        scored.sort(key=lambda x: -x[1])
        top = scored[:top_k]
        norm = max((s for _, s in top), default=1.0) or 1.0
        result.append([(w, round(float(min(1.0, s / norm)), 2)) for w, s in top])
    return result
