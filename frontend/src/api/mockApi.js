// Фейковий REST API: імітує мережеві затримки, помилки та CRUD-операції.
// Дані зберігаються в localStorage, щоб зміни переживали перезавантаження сторінки.
// Сигнатури функцій відповідають ендпоїнтам, спроєктованим у лабораторній роботі № 4.
import { createSeed, DEMO_CODE, DEMO_PASSWORD } from '../data/seed'
import { analyzeText } from '../lib/analyzer'

const KEY = 'reviewai.db.v1'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const latency = (min = 250, max = 650) => sleep(min + Math.random() * (max - min))

export class ApiError extends Error {
  constructor(message, status = 400, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

let db
function load() {
  if (db) return db
  try {
    const raw = localStorage.getItem(KEY)
    db = raw ? JSON.parse(raw) : createSeed()
  } catch {
    db = createSeed()
  }
  return db
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* сховище недоступне — працюємо лише в пам'яті */
  }
}
const nextId = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1
const today = () => new Date().toISOString().slice(0, 10)

function setWithCounts(s) {
  const rs = load().reviews.filter((r) => r.setId === s.id)
  const analyzed = rs.filter((r) => r.analysis)
  return { ...s, total: rs.length, analyzed: analyzed.length }
}

export const api = {
  /* ---------- автентифікація (крок 1: пароль, крок 2: код) ---------- */
  async login({ email, password }) {
    await latency()
    const user = load().users.find((u) => u.email === email.trim().toLowerCase())
    if (!user || password !== DEMO_PASSWORD) throw new ApiError('Невірний e-mail або пароль', 401)
    return { challenge: user.id }
  },
  async verifyCode({ challenge, code }) {
    await latency(300, 500)
    if (code !== DEMO_CODE) throw new ApiError('Невірний код підтвердження', 401)
    const user = load().users.find((u) => u.id === challenge)
    return { token: 'demo-jwt-' + user.id, user }
  },
  async register({ name, email, password }) {
    await latency()
    const d = load()
    if (d.users.some((u) => u.email === email.toLowerCase())) throw new ApiError('Користувач з таким e-mail уже існує', 409, { email: 'E-mail вже зайнятий' })
    const user = { id: nextId(d.users), email: email.toLowerCase(), name, role: 'analyst', created: today() }
    d.users.push(user)
    save()
    return { token: 'demo-jwt-' + user.id, user }
  },

  /* ---------- набори відгуків (CRUD) ---------- */
  async listSets() {
    await latency()
    return load().sets.map(setWithCounts)
  },
  async getSet(id) {
    await latency(150, 350)
    const s = load().sets.find((x) => x.id === id)
    if (!s) throw new ApiError('Набір не знайдено', 404)
    return setWithCounts(s)
  },
  async createSet({ name, description }) {
    await latency()
    const d = load()
    if (d.sets.some((s) => s.name.toLowerCase() === name.trim().toLowerCase()))
      throw new ApiError('Набір з такою назвою вже існує', 409, { name: 'Назва вже використовується' })
    const s = { id: nextId(d.sets), name: name.trim(), description: description?.trim() || '', created: today(), status: 'pending', ownerId: 1 }
    d.sets.push(s)
    save()
    return setWithCounts(s)
  },
  async updateSet(id, patch) {
    await latency()
    const s = load().sets.find((x) => x.id === id)
    if (!s) throw new ApiError('Набір не знайдено', 404)
    Object.assign(s, patch)
    save()
    return setWithCounts(s)
  },
  async deleteSet(id) {
    await latency()
    const d = load()
    d.sets = d.sets.filter((s) => s.id !== id)
    d.reviews = d.reviews.filter((r) => r.setId !== id) // каскадне видалення
    d.reports = d.reports.filter((r) => r.setId !== id)
    save()
    return { ok: true }
  },

  /* ---------- відгуки ---------- */
  async listReviews({ setId, sentiment = 'all', topic = 'all', q = '', page = 1, pageSize = 8 }) {
    await latency(200, 450)
    let rows = load().reviews.filter((r) => r.setId === setId)
    if (sentiment !== 'all') rows = rows.filter((r) => r.analysis?.sentiment === sentiment)
    if (topic !== 'all') rows = rows.filter((r) => r.analysis?.topic === topic)
    if (q.trim()) rows = rows.filter((r) => r.text.toLowerCase().includes(q.trim().toLowerCase()))
    const total = rows.length
    return { total, pages: Math.max(1, Math.ceil(total / pageSize)), rows: rows.slice((page - 1) * pageSize, page * pageSize) }
  },
  async addReview(setId, { text, rating }) {
    await latency()
    if (!text || text.trim().length < 5) throw new ApiError('Відгук надто короткий', 422, { text: 'Мінімум 5 символів' })
    const d = load()
    const r = { id: nextId(d.reviews), setId, text: text.trim(), source: 'manual', rating: rating || null, created: today(), analysis: null }
    d.reviews.unshift(r)
    const s = d.sets.find((x) => x.id === setId)
    if (s) s.status = 'pending'
    save()
    return r
  },
  async deleteReview(id) {
    await latency(150, 300)
    const d = load()
    d.reviews = d.reviews.filter((r) => r.id !== id)
    save()
    return { ok: true }
  },
  async importReviews(setId, texts) {
    await latency(500, 900)
    const d = load()
    let id = nextId(d.reviews)
    texts.forEach((text) => d.reviews.unshift({ id: id++, setId, text, source: 'csv', rating: null, created: today(), analysis: null }))
    const s = d.sets.find((x) => x.id === setId)
    if (s) s.status = 'pending'
    save()
    return { imported: texts.length }
  },

  /* ---------- запуск аналізу (імітація фонового завдання з прогресом) ---------- */
  async analyzeSet(setId, onProgress = () => {}) {
    const d = load()
    const s = d.sets.find((x) => x.id === setId)
    if (!s) throw new ApiError('Набір не знайдено', 404)
    s.status = 'running'
    const todo = d.reviews.filter((r) => r.setId === setId && !r.analysis)
    const steps = 20
    for (let i = 1; i <= steps; i++) {
      await sleep(130)
      onProgress(Math.round((i / steps) * 100))
    }
    todo.forEach((r) => {
      const a = analyzeText(r.text)
      r.analysis = { sentiment: a.sentiment, confidence: a.confidence, topic: a.topic, keywords: a.keywords }
    })
    s.status = 'done'
    save()
    return { analyzed: todo.length }
  },

  /* ---------- статистика ---------- */
  async getStats(setId = 'all') {
    await latency(250, 500)
    const d = load()
    const rows = d.reviews.filter((r) => r.analysis && (setId === 'all' || r.setId === setId))
    const sentiments = { positive: 0, neutral: 0, negative: 0 }
    const topics = {}
    const words = {}
    let conf = 0
    rows.forEach((r) => {
      sentiments[r.analysis.sentiment]++
      conf += r.analysis.confidence
      const t = r.analysis.topic || 'Без теми'
      topics[t] ??= { topic: t, positive: 0, neutral: 0, negative: 0, total: 0 }
      topics[t][r.analysis.sentiment]++
      topics[t].total++
      r.analysis.keywords.forEach((k) => (words[k] = (words[k] || 0) + 1))
    })
    // тижневий тренд (останні 8 тижнів до контрольної дати)
    const ref = new Date('2026-03-01T12:00:00')
    const weeks = Array.from({ length: 8 }, (_, i) => ({ i, label: `Т${i + 1}`, positive: 0, neutral: 0, negative: 0 }))
    rows.forEach((r) => {
      const diff = Math.floor((ref - new Date(r.created)) / 86400000 / 7)
      const w = 7 - Math.min(7, Math.max(0, diff))
      weeks[w][r.analysis.sentiment]++
    })
    return {
      total: rows.length,
      sentiments,
      avgConfidence: rows.length ? +(conf / rows.length).toFixed(2) : 0,
      topics: Object.values(topics).sort((a, b) => b.total - a.total),
      keywords: Object.entries(words).map(([word, n]) => ({ word, n })).sort((a, b) => b.n - a.n).slice(0, 22),
      weeks,
      reviewsTotal: d.reviews.filter((r) => setId === 'all' || r.setId === setId).length,
    }
  },

  /* ---------- звіти ---------- */
  async listReports() {
    await latency()
    const d = load()
    return d.reports.map((r) => ({ ...r, setName: d.sets.find((s) => s.id === r.setId)?.name || '—' })).sort((a, b) => b.id - a.id)
  },
  async createReport({ setId, format, author = 'Ви' }) {
    await latency(500, 900)
    const d = load()
    if (!d.sets.find((s) => s.id === setId)) throw new ApiError('Оберіть набір відгуків', 422, { setId: 'Обов’язкове поле' })
    const rep = { id: nextId(d.reports), setId, format, created: today(), author }
    d.reports.push(rep)
    save()
    return rep
  },
  async getReportRows(setId) {
    await latency(150, 300)
    return load().reviews.filter((r) => r.setId === setId && r.analysis)
  },

  /* ---------- адміністрування ---------- */
  async listUsers() {
    await latency()
    return load().users
  },
  async updateUserRole(id, role) {
    await latency(200, 400)
    const u = load().users.find((x) => x.id === id)
    if (!u) throw new ApiError('Користувача не знайдено', 404)
    u.role = role
    save()
    return u
  },
  async resetDemo() {
    db = createSeed()
    save()
  },
}
