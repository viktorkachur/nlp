"""Навчання та оцінювання моделі тональності.

Запуск:  python -m app.nlp.train
Результат: файл app/nlp/artifacts/sentiment.joblib та метрики (accuracy, macro-F1) у консолі й у файлі metrics.json.
"""
import json
import time

import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

from ..config import settings
from .dataset import build_corpus
from .sentiment import LABELS, SentimentModel, fit_model, save_model
from .testset import TEST_SET


def evaluate(model: SentimentModel, texts, labels, title):
    out = {}
    for mode in ("lexicon", "ml", "ensemble"):
        pred = model.predict_proba(texts, mode).argmax(axis=1)
        out[mode] = {"accuracy": round(accuracy_score(labels, pred), 4), "macro_f1": round(f1_score(labels, pred, average="macro"), 4)}
    pred = model.predict_proba(texts, "ensemble").argmax(axis=1)
    print(f"\n=== {title} (n={len(texts)}) ===")
    for mode, m in out.items():
        print(f"{mode:9s} accuracy={m['accuracy']:.3f}  macro-F1={m['macro_f1']:.3f}")
    print(classification_report(labels, pred, target_names=LABELS, digits=3, zero_division=0))
    out["confusion_matrix"] = confusion_matrix(labels, pred).tolist()
    return out


def main():
    t0 = time.time()
    texts, labels = build_corpus()
    x_tr, x_te, y_tr, y_te = train_test_split(texts, labels, test_size=0.15, random_state=1, stratify=labels)
    model = fit_model(x_tr, y_tr)
    metrics = {
        "corpus_size": len(texts),
        "train_size": len(x_tr),
        "holdout": evaluate(model, x_te, y_te, "Відкладена частина згенерованого корпусу"),
    }
    tx, ty = zip(*TEST_SET)
    metrics["handmade_test"] = evaluate(model, list(tx), list(ty), "Незалежна ручна вибірка")
    model = fit_model(texts, labels)  # фінальна модель — на всьому корпусі
    save_model(model, settings.model_path)
    metrics["train_seconds"] = round(time.time() - t0, 1)
    (settings.model_path.parent / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nМодель збережено: {settings.model_path}  ({metrics['train_seconds']} с)")


if __name__ == "__main__":
    np.random.seed(1)
    main()
