"""Генерація навчального корпусу відгуків (українською та англійською) за шаблонами.

Корпус складається комбінаторно: аспект + оцінка з узгодженням за родом/числом + вступні / завершальні фрази,
заперечення («не зручний»), змішані оцінки («гарний, але дорогий»). Класи: negative / neutral / positive.
"""
import random

# --- українська: аспекти за родом (m / f / n / p) -------------------------------------------------
ASPECTS_UK = {
    "m": ["застосунок", "додаток", "інтерфейс", "дизайн", "сервіс", "сайт", "магазин", "товар", "оператор", "кур'єр", "менеджер", "каталог", "пошук"],
    "f": ["підтримка", "доставка", "навігація", "програма", "якість", "упаковка", "ціна", "робота", "швидкість", "оплата", "реєстрація", "синхронізація", "версія"],
    "n": ["меню", "оновлення", "обслуговування", "пакування", "замовлення", "рішення", "керування"],
    "p": ["функції", "ціни", "кнопки", "товари", "відповіді", "налаштування", "звіти"],
}
SUFFIX = {"m": "ий", "f": "а", "n": "е", "p": "і"}
POS_STEMS = ["чудов", "чудес", "відмінн", "прекрасн", "зручн", "надійн", "якісн", "приємн", "швидк", "класн", "гарн", "стабільн", "зрозумілі", "професійн", "вигідн", "бездоганн", "чітк", "корисн", "сучасн", "оперативн"]
NEG_STEMS = ["жахлив", "поган", "повільн", "незручн", "ненадійн", "неякісн", "заплутан", "дорог", "складн", "нестабільн", "неприємн", "бракован", "пошкоджен", "зламан", "нікчемн", "невдал", "сумнівн", "хамськ"]
NEU_STEMS = ["нормальн", "звичайн", "середн", "стандартн", "прийнятн", "посередн"]

POS_INV_UK = ["все чудово", "просто супер", "без нарікань", "усе працює як годинник", "дуже задоволений", "дуже задоволена", "рекомендую", "дякую", "мені дуже сподобалось", "це топ", "всім раджу", "я в захваті", "найкращий вибір", "залишився дуже задоволений", "чудовий досвід", "працює бездоганно", "дякую розробникам", "порадував результат"]
NEG_INV_UK = ["жах", "повний жах", "дуже розчарований", "дуже розчарована", "це провал", "не рекомендую", "більше не куплю", "гірше не буває", "втратив час та гроші", "не працює", "постійно вилітає", "постійно зависає", "ігнорують звернення", "ніхто не відповідає", "це обман", "не раджу нікому", "повне розчарування", "дуже незадоволений", "ненавиджу це", "марна трата грошей", "дратує до нестями", "користуватися неможливо", "нічого не працює"]
NEU_INV_UK = ["нічого особливого", "так собі", "середньо", "без емоцій", "є плюси і мінуси", "нормально, але є що покращити", "можна користуватись", "звичайний сервіс", "нічого видатного", "в цілому нормально", "ні добре ні погано", "очікував більшого, але прийнятно", "працює, і на тому дякую"]
OPEN_UK = ["", "", "", "Загалом, ", "На мою думку, ", "Користуюсь вже місяць: ", "Замовляв вже вдруге. ", "Коротко: ", "Враження такі: ", "Чесно кажучи, ", "Після оновлення ", "Тестував тиждень. "]
CLOSE_UK = ["", "", ".", "!", "...", " Дякую.", " Ось так.", " Це мій відгук.", ""]
INTENS_UK = ["", "", "дуже ", "надзвичайно ", "просто ", "справді ", "цілком ", "вкрай "]

# --- англійська ------------------------------------------------------------------------------------
ASPECTS_EN = ["app", "interface", "support", "delivery", "price", "quality", "service", "design", "website", "staff", "checkout", "search", "packaging", "navigation", "update"]
POS_EN = ["great", "excellent", "amazing", "fast", "smooth", "reliable", "helpful", "friendly", "easy to use", "perfect", "fantastic", "wonderful", "really nice", "very convenient", "impressive", "intuitive"]
NEG_EN = ["terrible", "awful", "slow", "buggy", "unreliable", "confusing", "too expensive", "useless", "broken", "horrible", "poor", "disappointing", "unusable", "frustrating", "overpriced", "a total mess"]
NEU_EN = ["okay", "fine", "average", "decent", "nothing special", "so-so", "acceptable", "not bad, not great", "mediocre"]
POS_INV_EN = ["I love it", "highly recommend", "works perfectly", "very happy with it", "thanks a lot", "best choice ever", "totally worth it", "five stars", "exceeded my expectations", "I am satisfied"]
NEG_INV_EN = ["I hate it", "never again", "total waste of money", "very disappointed", "do not recommend", "completely useless", "it keeps crashing", "worst experience ever", "nobody answers", "does not work at all", "I want a refund"]
NEU_INV_EN = ["it is fine", "nothing to complain about but nothing to praise", "has pros and cons", "does the job", "just average", "I expected more but it is acceptable"]
OPEN_EN = ["", "", "", "Overall, ", "In my opinion, ", "Honestly, ", "After a week of use, ", "Short review: ", "To be honest, "]
CLOSE_EN = ["", "", ".", "!", "...", " Thanks."]


def _adj(stem: str, g: str) -> str:
    return stem + SUFFIX[g] if not stem.endswith("і") else stem


def _uk_aspect(rng: random.Random):
    g = rng.choice(list(ASPECTS_UK))
    return g, rng.choice(ASPECTS_UK[g])


def _uk_sentence(rng: random.Random, label: str) -> str:
    kind = rng.random()
    g, a = _uk_aspect(rng)
    inten = rng.choice(INTENS_UK)
    pos, neg, neu = rng.choice(POS_STEMS), rng.choice(NEG_STEMS), rng.choice(NEU_STEMS)
    if label == "positive":
        if kind < 0.40:
            core = f"{a} {inten}{_adj(pos, g)}"
        elif kind < 0.55:
            g2, b = _uk_aspect(rng)
            core = f"{a} {_adj(rng.choice(POS_STEMS), g)}, {b} {_adj(rng.choice(POS_STEMS), g2)}"
        elif kind < 0.70:
            core = f"{a} зовсім не {_adj(neg, g)}"
        elif kind < 0.76:
            core = f"{a} не {rng.choice(['вилітає', 'зависає', 'гальмує', 'глючить', 'підводить', 'ламається', 'губиться', 'тормозить'])}"
        elif kind < 0.84:
            core = f"жодних проблем із {rng.choice(['доставкою', 'оплатою', 'роботою', 'підтримкою', 'додатком', 'сайтом'])}"
        else:
            core = rng.choice(POS_INV_UK)
            if rng.random() < 0.5:
                core = f"{a} {_adj(pos, g)}, {core}"
    elif label == "negative":
        if kind < 0.38:
            core = f"{a} {inten}{_adj(neg, g)}"
        elif kind < 0.52:
            core = f"{a} {rng.choice(['не', 'зовсім не', 'ніяк не'])} {_adj(pos, g)}"
        elif kind < 0.62:
            g2, b = _uk_aspect(rng)
            core = f"{a} {_adj(rng.choice(NEG_STEMS), g)}, {b} {_adj(rng.choice(NEG_STEMS), g2)}"
        elif kind < 0.72:
            core = f"{a} {_adj(pos, g)}, але {rng.choice(['постійно', 'часто', 'знову'])} {rng.choice(['вилітає', 'зависає', 'ламається', 'глючить'])}"
        else:
            core = rng.choice(NEG_INV_UK)
            if rng.random() < 0.5:
                core = f"{a} {_adj(neg, g)}, {core}"
    else:
        if kind < 0.30:
            core = f"{a} {_adj(neu, g)}"
        elif kind < 0.58:
            g2, b = _uk_aspect(rng)
            core = f"{a} {_adj(pos, g)}, але {b} {_adj(neg, g2)}"
        elif kind < 0.70:
            core = f"{a} {rng.choice(['трохи', 'дещо'])} {_adj(rng.choice(NEG_STEMS), g)}, зате {_adj(pos, g)} в іншому"
        elif kind < 0.78:
            core = f"{a} {_adj(neu, g)}, {rng.choice(NEU_INV_UK)}"
        else:
            core = rng.choice(NEU_INV_UK)
    s = rng.choice(OPEN_UK) + core + rng.choice(CLOSE_UK)
    return (s[0].upper() + s[1:]) if rng.random() < 0.7 else s


def _en_sentence(rng: random.Random, label: str) -> str:
    kind = rng.random()
    a = rng.choice(ASPECTS_EN)
    pos, neg, neu = rng.choice(POS_EN), rng.choice(NEG_EN), rng.choice(NEU_EN)
    inten = rng.choice(["", "", "really ", "very ", "absolutely ", "quite "])
    if label == "positive":
        if kind < 0.45:
            core = f"the {a} is {inten}{pos}"
        elif kind < 0.6:
            core = f"the {a} was {pos} and the {rng.choice(ASPECTS_EN)} was {rng.choice(POS_EN)}"
        elif kind < 0.72:
            core = f"the {a} is not {rng.choice(['bad', 'slow', 'confusing', 'expensive', 'broken'])} at all"
        else:
            core = rng.choice(POS_INV_EN)
    elif label == "negative":
        if kind < 0.45:
            core = f"the {a} is {inten}{neg}"
        elif kind < 0.6:
            core = f"the {a} is not {rng.choice(['good', 'great', 'helpful', 'reliable', 'easy', 'fast'])}"
        elif kind < 0.7:
            core = f"the {a} was {neg} and the {rng.choice(ASPECTS_EN)} was {rng.choice(NEG_EN)}"
        else:
            core = rng.choice(NEG_INV_EN)
    else:
        if kind < 0.3:
            core = f"the {a} is {neu}"
        elif kind < 0.6:
            core = f"the {a} is {pos}, but the {rng.choice(ASPECTS_EN)} is {neg}"
        else:
            core = rng.choice(NEU_INV_EN)
    s = rng.choice(OPEN_EN) + core + rng.choice(CLOSE_EN)
    return s[0].upper() + s[1:] if rng.random() < 0.7 else s


def _noise(rng: random.Random, s: str) -> str:
    if rng.random() < 0.15:
        s = s.lower()
    if rng.random() < 0.08 and len(s) > 8:  # випадкова помилка набору
        i = rng.randrange(1, len(s) - 1)
        s = s[:i] + s[i + 1:]
    return s


LABELS = ["negative", "neutral", "positive"]


def build_corpus(n_per_class: int = 1400, seed: int = 7, uk_share: float = 0.78) -> tuple[list[str], list[int]]:
    """Повертає тексти та мітки (0 – negative, 1 – neutral, 2 – positive), без дублікатів."""
    rng = random.Random(seed)
    texts: list[str] = []
    labels: list[int] = []
    seen: set[str] = set()
    for idx, label in enumerate(LABELS):
        count = attempts = 0
        while count < n_per_class and attempts < n_per_class * 30:
            attempts += 1
            s = _uk_sentence(rng, label) if rng.random() < uk_share else _en_sentence(rng, label)
            s = _noise(rng, s)
            if s.lower() in seen:
                continue
            seen.add(s.lower())
            texts.append(s)
            labels.append(idx)
            count += 1
    order = list(range(len(texts)))
    rng.shuffle(order)
    return [texts[i] for i in order], [labels[i] for i in order]
