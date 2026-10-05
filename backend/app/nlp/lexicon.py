"""Лексичний аналізатор тональності (українська та англійська) із запереченнями, підсилювачами та протиставленнями.

Слова задано префіксами: токен збігається, якщо починається з префікса (враховує відмінки та форми слова).
Вага показує силу полярності.
"""
import math

from .preprocess import tokenize

POSITIVE: dict[str, float] = {
    # українська
    "чудов": 2, "чудес": 2, "супер": 2, "відмінн": 2, "прекрасн": 2, "ідеальн": 2, "ідеал": 1.8, "найкращ": 2,
    "бездоганн": 2, "неймовірн": 2, "вражаюч": 2, "фантастичн": 2, "шикарн": 2, "класн": 1.5, "крут": 1.5,
    "добр": 1.2, "гарн": 1.2, "приємн": 1.3, "зручн": 1.5, "швидк": 1.3, "швидше": 1.1, "надійн": 1.5,
    "стабільн": 1.4, "якісн": 1.5, "дякую": 1.5, "дякуємо": 1.5, "вдячн": 1.6, "сподоба": 1.6, "подоба": 1.0,
    "рекоменду": 2, "раджу": 1.5, "задоволен": 1.8, "радує": 1.5, "люблю": 1.6, "обожнюю": 2, "корисн": 1.2,
    "інтуїтивн": 1.5, "ввічлив": 1.4, "професійн": 1.5, "вчасно": 1.3, "оперативн": 1.5, "чітко": 1.0,
    "допомог": 1.2, "допомож": 1.2, "вирішили": 1.2, "вирішив": 1.2, "вигідн": 1.3, "недорог": 1.3,
    "легк": 1.0, "плавн": 1.2, "кайф": 1.8, "топ": 1.5, "молодц": 1.6, "порадував": 1.6, "зрозумілий": 1.2,
    "зрозуміл": 1.0, "миттєв": 1.4, "бездоганно": 2, "ідеально": 2, "круто": 1.6, "чудово": 2, "відмінно": 2,
    "дружн": 1.3, "уважн": 1.3, "щиро": 1.0, "улюблен": 1.5, "сучасн": 1.0, "функціональн": 1.2, "без нарікань": 1.8,
    # англійська
    "great": 2, "good": 1.3, "excellent": 2, "amazing": 2, "awesome": 2, "love": 1.8, "perfect": 2,
    "fantastic": 2, "wonderful": 2, "best": 2, "fast": 1.3, "quick": 1.3, "easy": 1.2, "smooth": 1.4,
    "reliable": 1.5, "helpful": 1.5, "friendly": 1.4, "recommend": 2, "happy": 1.6, "satisfied": 1.6,
    "nice": 1.3, "beautiful": 1.5, "intuitive": 1.5, "thanks": 1.3, "thank": 1.3, "superb": 2,
    "brilliant": 2, "useful": 1.2, "convenient": 1.4, "stable": 1.4, "impressive": 1.6, "pleased": 1.5,
    "worth": 1.0, "enjoy": 1.5, "flawless": 2, "polite": 1.3, "efficient": 1.4, "responsive": 1.2,
}

NEGATIVE: dict[str, float] = {
    # українська
    "жахлив": 2, "жах": 2, "огидн": 2, "відстій": 2, "кошмар": 2, "паскудн": 2, "ужасн": 2, "погано": 1.8,
    "поган": 1.6, "гірш": 1.4, "найгірш": 2, "розчаров": 2, "незадовол": 2, "проблем": 1.2, "помилк": 1.2,
    "збій": 1.5, "збоїт": 1.5, "вилітає": 1.8, "вилітає": 1.8, "вилітан": 1.6, "зависа": 1.6, "зависан": 1.6,
    "гальму": 1.6, "глюч": 1.6, "баг": 1.2, "повільн": 1.5, "довго": 1.2, "дорого": 1.2, "дорог": 1.0,
    "обман": 2, "шахра": 2, "ігнору": 1.8, "мовчить": 1.8, "запізни": 1.5, "пошкодж": 1.6, "зламан": 1.8,
    "зламал": 1.8, "бракован": 2, "брак": 1.2, "неякісн": 2, "незручн": 1.8, "складн": 1.0, "заплутан": 1.5,
    "дратує": 1.5, "бісить": 1.8, "ненавиджу": 2, "марно": 1.5, "даремно": 1.5, "втратив": 1.6, "скарг": 1.2,
    "хамськ": 2, "грубо": 1.6, "груб": 1.4, "нікчемн": 2, "сумнівн": 1.2, "неприємн": 1.6, "провал": 1.8,
    "ненадійн": 1.8, "нестабільн": 1.8, "небезпечн": 1.4, "підозрілий": 1.2, "розчарування": 2, "неможливо": 1.5,
    "не працює": 2, "не відповід": 1.8, "не допомог": 1.8, "не рекоменду": 2, "не раджу": 2, "не вистачає": 1.0,
    "вилетіла": 1.6, "зависло": 1.6, "тормозить": 1.6, "нервує": 1.2, "жалкую": 1.8, "губ": 1.3, "затрим": 1.4, "затягу": 1.3, "затримк": 1.4, "втрачає": 1.3, "підводить": 1.5, "ламаєть": 1.6, "обдур": 2,
    # англійська
    "bad": 1.6, "terrible": 2, "awful": 2, "horrible": 2, "worst": 2, "hate": 2, "slow": 1.5, "crash": 1.8,
    "bug": 1.2, "broken": 1.8, "buggy": 1.7, "disappoint": 2, "poor": 1.6, "useless": 2, "waste": 1.6,
    "expensive": 1.2, "overpriced": 1.6, "scam": 2, "rude": 1.8, "ignore": 1.6, "late": 1.2, "delay": 1.2,
    "damaged": 1.6, "defective": 2, "fail": 1.6, "error": 1.2, "problem": 1.2, "issue": 1.0, "annoying": 1.5,
    "confusing": 1.4, "difficult": 1.0, "lag": 1.4, "freez": 1.6, "unusable": 2, "refund": 1.0, "unreliable": 1.8,
    "frustrat": 1.6, "garbage": 2, "nightmare": 2, "disgusting": 2, "misleading": 1.6, "unhappy": 1.6,
}

NEGATORS = {"не", "ні", "нема", "немає", "без", "ніколи", "ніяк", "ніхто", "нічого", "not", "no", "never", "without", "hardly", "nothing", "nobody", "neither"}
INTENSIFIERS = {"дуже", "надто", "вкрай", "надзвичайно", "украй", "зовсім", "абсолютно", "цілком", "максимально", "супер", "very", "extremely", "really", "so", "totally", "absolutely", "completely", "super", "too"}
DIMINISHERS = {"трохи", "дещо", "ледь", "майже", "трішки", "слегка", "relatively", "slightly", "somewhat", "bit", "little", "fairly", "kinda", "quite"}
CONTRAST = {"але", "проте", "однак", "зате", "only", "but", "however", "though", "although", "хоча"}

NEG_WINDOW = 3


def _match(token: str, table: dict[str, float]) -> float:
    best = 0.0
    for prefix, w in table.items():
        if " " not in prefix and token.startswith(prefix) and w > best:
            best = w
    return best


def score_text(text: str) -> dict:
    """Повертає сумарну полярність та зафіксовані слова.

    Заперечення в межах 3 слів інвертує полярність (з послабленням), підсилювач множить вагу на 1.5,
    слова після протиставного сполучника («але») отримують більшу вагу, ніж слова до нього.
    """
    tokens = tokenize(text)
    joined = " " + " ".join(tokens) + " "
    pos_total = neg_total = 0.0
    hits: list[tuple[str, float]] = []

    # багатослівні вирази
    consumed: set[int] = set()
    for table, sign in ((POSITIVE, 1), (NEGATIVE, -1)):
        for phrase, w in table.items():
            if " " in phrase and f" {phrase}" in joined:
                if sign > 0:
                    pos_total += w
                else:
                    neg_total += w
                hits.append((phrase, sign * w))
                for i, tok in enumerate(tokens):
                    if tok in phrase.split():
                        consumed.add(i)

    contrast_at = next((i for i, t in enumerate(tokens) if t in CONTRAST), None)
    for i, tok in enumerate(tokens):
        if i in consumed:
            continue
        w_pos, w_neg = _match(tok, POSITIVE), _match(tok, NEGATIVE)
        if not (w_pos or w_neg):
            continue
        sign, w = (1, w_pos) if w_pos >= w_neg else (-1, w_neg)
        window = tokens[max(0, i - NEG_WINDOW): i]
        # межа речення/протиставлення перериває дію заперечення
        if contrast_at is not None and max(0, i - NEG_WINDOW) <= contrast_at < i:
            window = tokens[contrast_at + 1: i]
        if any(t in NEGATORS for t in window):
            sign, w = -sign, w * 0.9
        if any(t in INTENSIFIERS for t in window):
            w *= 1.5
        if any(t in DIMINISHERS for t in window):
            w *= 0.6
        if contrast_at is not None:
            w *= 1.35 if i > contrast_at else 0.75
        if sign > 0:
            pos_total += w
        else:
            neg_total += w
        hits.append((tok, sign * w))
    return {"pos": pos_total, "neg": neg_total, "z": pos_total - neg_total, "hits": hits}


def lexicon_probs(text: str) -> tuple[list[float], dict]:
    """Ймовірності класів [negative, neutral, positive] за лексичною оцінкою."""
    s = score_text(text)
    z, mixed = s["z"], min(s["pos"], s["neg"])
    logits = [-1.15 * z + 0.25 * mixed, 0.55 + 0.35 * mixed - 0.1 * abs(z), 1.15 * z + 0.25 * mixed]
    m = max(logits)
    exp = [math.exp(x - m) for x in logits]
    total = sum(exp)
    return [x / total for x in exp], s
