"""Попередня обробка тексту: нормалізація, токенізація, прості стеммери (uk / en), визначення мови."""
import re

_URL = re.compile(r"https?://\S+|www\.\S+|\S+@\S+\.\S+")
_APOS = str.maketrans({"’": "'", "ʼ": "'", "`": "'", "‘": "'", "´": "'"})
_TOKEN = re.compile(r"[a-zа-яіїєґ0-9]+(?:'[a-zа-яіїєґ]+)?", re.IGNORECASE)
_CYR = re.compile(r"[а-яіїєґ]", re.IGNORECASE)
_LAT = re.compile(r"[a-z]", re.IGNORECASE)

STOPWORDS_UK = set(
    """і й та а але або чи що щоб як так то це цей ця ці той та те ті тут там де коли
    який яка яке які якого якій яку я ти він вона воно ми ви вони мене мені мій моя моє мої
    його її їх нас вас них себе свій своя своє свої на в у до з із зі від по за при про під над
    для без через між ще вже ось дуже лише тільки також теж же би б ж ли був була було були
    буде будуть є бути можна треба потрібно весь вся все всі всім цього цьому цій цих тому
    адже проте однак якщо тоді тобто навіть вона одна один одне одні мало багато більше менше
    саме просто дуже""".split()
)
STOPWORDS_EN = set(
    """a an the and or but if then than that this these those is are was were be been being am
    i you he she it we they me my your his her its our their to of in on at for with from by
    as so very just also too have has had do does did not no will would can could should
    there here what which who when where how all any some more most really""".split()
)
STOPWORDS = STOPWORDS_UK | STOPWORDS_EN

_UK_ENDINGS = sorted(
    """ість ості істю ення ення енню ання анню ями ами ові еві ого ому ими іми ої ою ій ім их
    ях ах ів ам ям ом ем єю ія ії ую юю ий ть ти ла ли ло ся сь а я у ю і и е є о ь""".split(),
    key=len,
    reverse=True,
)
_EN_ENDINGS = ("ing", "edly", "ed", "ly", "es", "s")


def normalize(text: str) -> str:
    """Нижній регістр, уніфікація апострофів, видалення посилань, розгортання n't."""
    t = _URL.sub(" ", text.translate(_APOS).lower())
    t = re.sub(r"n't\b", " not", t)
    t = re.sub(r"\bcan't\b|\bcannot\b", "can not", t)
    return re.sub(r"\s+", " ", t).strip()


def tokenize(text: str) -> list[str]:
    return _TOKEN.findall(normalize(text))


def detect_language(text: str) -> str:
    cyr = len(_CYR.findall(text))
    lat = len(_LAT.findall(text))
    return "uk" if cyr >= lat else "en"


def stem(token: str) -> str:
    """Дуже простий стемер: відкидає типові закінчення, залишаючи основу не коротшу за 4 літери."""
    if _CYR.search(token):
        for end in _UK_ENDINGS:
            if token.endswith(end) and len(token) - len(end) >= 4:
                return token[: -len(end)]
        return token
    for end in _EN_ENDINGS:
        if token.endswith(end) and len(token) - len(end) >= 3:
            return token[: -len(end)]
    return token


def content_tokens(text: str) -> list[str]:
    """Значущі слова (без стоп-слів, чисел і надто коротких токенів)."""
    return [t for t in tokenize(text) if t not in STOPWORDS and len(t) > 2 and not t.isdigit()]
