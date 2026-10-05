"""Виявлення тем (аспектів) відгуку за словником аспектів (українські та англійські основи слів)."""
from .preprocess import tokenize

ASPECTS: dict[str, list[str]] = {
    "Швидкодія": ["швидк", "швидш", "повільн", "гальму", "тормоз", "зависа", "зависан", "завантаж", "лагає", "лаги", "миттєв", "довго", "вантажи", "fast", "slow", "speed", "lag", "freez", "loading", "performance", "quick"],
    "Інтерфейс": ["інтерфейс", "дизайн", "кнопк", "меню", "навігац", "незручн", "зручн", "заплутан", "зрозуміл", "вигляд", "шрифт", "інтуїтивн", "interface", "design", "button", "menu", "navigation", "layout", "intuitive", "confusing", "ui"],
    "Підтримка": ["підтримк", "оператор", "менеджер", "звернен", "відповід", "відповів", "консультац", "допомог", "допомож", "support", "operator", "agent", "helpdesk", "response", "reply", "replied", "answer"],
    "Стабільність": ["вилітає", "вилітан", "вилетіла", "збій", "збоїт", "помилк", "баг", "глюч", "стабільн", "нестабільн", "ненадійн", "надійн", "crash", "bug", "error", "stable", "glitch", "reliable", "unreliable"],
    "Ціна": ["ціна", "ціну", "ціни", "цін", "дорог", "дешев", "недорог", "вартіст", "підписк", "знижк", "оплат", "гроші", "грошей", "price", "expensive", "cheap", "cost", "subscription", "pricing", "overpriced", "money"],
    "Доставка": ["доставк", "доставил", "кур'єр", "курєр", "посилк", "відправ", "запізни", "вчасно", "упаков", "пакуван", "delivery", "courier", "shipping", "package", "packaging", "parcel", "arrived", "late"],
    "Якість товару": ["якіст", "якісн", "неякісн", "товар", "бракован", "пошкодж", "матеріал", "зламан", "quality", "product", "defective", "damaged", "material", "broken"],
    "Функціонал": ["функці", "можливост", "налаштуван", "звіт", "синхронізац", "пошук", "опці", "feature", "function", "option", "setting", "sync", "search", "report"],
    "Асортимент": ["асортимент", "вибір", "вибору", "каталог", "наявн", "selection", "catalog", "choice", "stock"],
    "Обслуговування": ["обслуговуван", "персонал", "хамськ", "грубо", "груб", "ввічлив", "service", "staff", "rude", "polite", "friendly"],
    "Акаунт": ["акаунт", "реєстрац", "пароль", "логін", "увійти", "вхід", "account", "login", "password", "sign"],
}


# оцінні прикметники слабше вказують на тему, ніж іменники («швидка доставка» – це про доставку, а не про швидкодію)
WEAK = ("швидк", "швидш", "повільн", "зручн", "незручн", "надійн", "ненадійн", "стабільн", "нестабільн", "дорог", "дешев", "недорог",
        "якісн", "неякісн", "довго", "fast", "slow", "quick", "reliable", "unreliable", "stable", "cheap", "expensive", "friendly", "polite")


def _hits(tokens: list[str]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for tok in tokens:
        for aspect, prefixes in ASPECTS.items():
            if any(tok.startswith(p) for p in prefixes):
                scores[aspect] = scores.get(aspect, 0) + (0.6 if tok.startswith(WEAK) else 1.0)
    return scores


def detect_topic(text: str) -> str | None:
    """Назва теми або None, якщо жоден аспект не згадано."""
    scores = _hits(tokenize(text))
    if not scores:
        return None
    best = max(scores.values())
    # за однакової кількості збігів перемагає аспект, що йде раніше у словнику
    return next(a for a in ASPECTS if scores.get(a) == best)


def is_aspect_word(token: str) -> bool:
    return any(token.startswith(p) for prefixes in ASPECTS.values() for p in prefixes)
