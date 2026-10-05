// Спрощений «аналізатор» для демонстрації у браузері (у реальній системі аналіз виконує NLP-модуль на сервері)

const POS = ['чудов', 'супер', 'відмінн', 'добр', 'зручн', 'швидк', 'дякую', 'сподоба', 'приємн', 'задоволен', 'найкращ', 'класн', 'ідеальн', 'надійн', 'люблю', 'рекомендую', 'вчасно']
const NEG = ['жахлив', 'погано', 'поган', 'гальму', 'вилітає', 'зависа', 'повільн', 'довго', 'дорог', 'розчаров', 'не працює', 'ігнорують', 'ненавиджу', 'проблем', 'збій', 'помилк', 'гірш', 'зламал', 'запізни', 'незручн', 'мовчить']
const TOPICS = {
  Швидкодія: ['швидк', 'гальму', 'зависа', 'довго', 'завантаж', 'повільн'],
  Інтерфейс: ['інтерфейс', 'дизайн', 'кнопк', 'меню', 'навігац', 'зручн'],
  Підтримка: ['підтримк', 'оператор', 'звернен', 'відповід', 'допомог'],
  Стабільність: ['вилітає', 'збій', 'помилк', 'стабільн', 'надійн'],
  Ціна: ['ціна', 'ціну', 'дорог', 'підписк', 'дешев', 'вартіст'],
  Доставка: ['доставк', 'кур’єр', 'посилк', 'вчасно', 'запізни'],
}
const STOP = new Set(['і', 'в', 'на', 'що', 'не', 'це', 'але', 'та', 'як', 'з', 'до', 'за', 'для', 'дуже', 'мене', 'мій', 'ще', 'вже', 'усе', 'все', 'чи', 'при', 'так', 'ніж'])

const count = (t, list) => list.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0)

export function analyzeText(raw) {
  const text = raw.toLowerCase()
  const pos = count(text, POS)
  const neg = count(text, NEG)
  let sentiment = 'neutral'
  if (pos > neg) sentiment = 'positive'
  else if (neg > pos) sentiment = 'negative'
  const diff = Math.abs(pos - neg)
  const confidence = sentiment === 'neutral' ? 0.55 : Math.min(0.97, 0.7 + diff * 0.09)

  let topic = null
  let best = 0
  for (const [name, words] of Object.entries(TOPICS)) {
    const c = count(text, words)
    if (c > best) { best = c; topic = name }
  }
  const keywords = [...new Set(text.replace(/[^\p{L}\s’]/gu, ' ').split(/\s+/).filter((w) => w.length > 4 && !STOP.has(w)))].slice(0, 3)
  return { sentiment, confidence: +confidence.toFixed(2), topic, keywords, pos, neg }
}
