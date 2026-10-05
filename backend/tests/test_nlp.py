"""Модульні тести NLP-модуля та розбору файлів."""
import pytest

from app.errors import ApiError
from app.nlp.keywords import extract_keywords
from app.nlp.lexicon import score_text
from app.nlp.pipeline import analyze_text
from app.nlp.preprocess import detect_language, normalize, stem, tokenize
from app.nlp.topics import detect_topic
from app.services.imports import parse_upload


def test_normalize_and_tokenize():
    assert normalize("Кур’єр НЕ приїхав https://x.com") == "кур'єр не приїхав"
    assert tokenize("Don't panic!") == ["do", "not", "panic"]


def test_language_and_stem():
    assert detect_language("Привіт, світе") == "uk" and detect_language("Hello world") == "en"
    assert stem("зручний") == stem("зручна") == "зручн"


@pytest.mark.parametrize("text,expected", [
    ("Чудовий сервіс, дуже задоволений!", "positive"),
    ("Додаток постійно вилітає, жах.", "negative"),
    ("Нормальний сервіс, нічого особливого.", "neutral"),
    ("Інтерфейс не зручний.", "negative"),
    ("Доставка не затримується, усе вчасно.", "positive"),
    ("I love this app, it works perfectly", "positive"),
    ("Terrible support, nobody replied", "negative"),
    ("The design is nice but the search is slow.", "neutral"),
])
def test_sentiment(text, expected):
    assert analyze_text(text).sentiment == expected


def test_negation_flips_lexicon_polarity():
    assert score_text("зручний")["z"] > 0
    assert score_text("не зручний")["z"] < 0
    assert score_text("дуже зручний")["z"] > score_text("зручний")["z"]


def test_confidence_range():
    a = analyze_text("Дуже швидка підтримка")
    assert 0.34 <= a.confidence <= 0.99


@pytest.mark.parametrize("text,topic", [
    ("Підтримка не відповідає на звернення", "Підтримка"),
    ("Кур'єр запізнився з доставкою", "Доставка"),
    ("Занадто дорога підписка", "Ціна"),
    ("Додаток постійно вилітає", "Стабільність"),
    ("Просто якийсь текст без теми", None),
])
def test_topics(text, topic):
    assert detect_topic(text) == topic


def test_keywords_prefer_informative_words():
    kws = extract_keywords(["Дуже швидка підтримка допомогла", "Доставка була довгою", "Інтерфейс зручний"])
    words = [w for w, _ in kws[0]]
    assert "підтримка" in words and "дуже" not in words
    assert extract_keywords([]) == [] and extract_keywords(["і в на"]) == [[]]


def test_parse_txt_and_csv():
    rows, skipped, src = parse_upload("a.txt", "Перший відгук\nок\nДругий відгук".encode())
    assert [r["text"] for r in rows] == ["Перший відгук", "Другий відгук"] and skipped == 1 and src == "txt"
    rows, _, src = parse_upload("a.csv", 'text,rating\n"Відгук, з комою",5\nКоротко,1\nДовший відгук,7'.encode("cp1251"))
    assert src == "csv" and rows[0] == {"text": "Відгук, з комою", "rating": 5} and rows[-1]["rating"] is None


def test_parse_rejects_wrong_input():
    for name, data in (("a.pdf", b"x"), ("a.txt", b""), ("a.csv", b"\n")):
        with pytest.raises(ApiError):
            parse_upload(name, data)
