// Клієнт REST API (fetch). Сигнатури методів збережені з лабораторної роботи № 6–7,
// тому сторінки працюють без змін; тепер усі дані надходять із FastAPI-сервера.
const BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'reviewai.token'
const TIMEOUT_MS = 70_000 // безкоштовний хостинг може «прокидатися» майже хвилину

export class ApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* сховище недоступне */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* сховище недоступне */ } },
}

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))

/**
 * Єдина точка виконання запитів: токен авторизації, JSON / FormData, таймаут,
 * розбір помилок сервера у ApiError, подія «api-slow» для повідомлення про повільний старт сервера.
 */
async function request(path, { method = 'GET', body, form, auth = true, blob = false } = {}) {
  const headers = {}
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const slow = setTimeout(() => emit('api-slow', true), 3500)
  try {
    const res = await fetch(BASE + path, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined), signal: ctrl.signal })
    if (!res.ok) {
      let data = {}
      try { data = await res.json() } catch { /* тіло не JSON */ }
      if (res.status === 401 && auth && token) { tokenStore.clear(); emit('auth-expired') }
      throw new ApiError(data.message || `Помилка сервера (${res.status})`, res.status, data.fields || {})
    }
    if (res.status === 204) return null
    return blob ? await res.blob() : await res.json()
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(e.name === 'AbortError' ? 'Сервер не відповідає. Спробуйте ще раз за хвилину.' : 'Не вдалося з’єднатися із сервером. Перевірте підключення.', 0)
  } finally {
    clearTimeout(timeout)
    clearTimeout(slow)
    emit('api-slow', false)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const qs = (o) => {
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.set(k, v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  /* ---------- автентифікація ---------- */
  async login({ email, password }) {
    const r = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false })
    tokenStore.set(r.token)
    return r
  },
  async register({ name, email, password }) {
    const r = await request('/auth/register', { method: 'POST', body: { name, email, password }, auth: false })
    tokenStore.set(r.token)
    return r
  },
  me: () => request('/auth/me'),

  /* ---------- набори відгуків ---------- */
  listSets: () => request('/sets'),
  getSet: (id) => request(`/sets/${id}`),
  createSet: ({ name, description }) => request('/sets', { method: 'POST', body: { name, description } }),
  updateSet: (id, patch) => request(`/sets/${id}`, { method: 'PATCH', body: patch }),
  deleteSet: (id) => request(`/sets/${id}`, { method: 'DELETE' }),

  /* ---------- відгуки ---------- */
  listReviews: ({ setId, sentiment = 'all', topic = 'all', q = '', page = 1, pageSize = 8 }) =>
    request(`/sets/${setId}/reviews${qs({ sentiment, topic, q: q.trim(), page, pageSize })}`),
  addReview: (setId, { text, rating }) => request(`/sets/${setId}/reviews`, { method: 'POST', body: { text, rating } }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  importFile(setId, file) {
    const form = new FormData()
    form.append('file', file, file.name)
    return request(`/sets/${setId}/import`, { method: 'POST', form })
  },

  /** Запускає аналіз на сервері й опитує статус до завершення; onProgress отримує 0..100. */
  async analyzeSet(setId, onProgress = () => {}) {
    try {
      await request(`/sets/${setId}/analyze`, { method: 'POST' })
    } catch (e) {
      if (e.status !== 409) throw e // 409 – аналіз уже виконується, просто чекаємо на нього
    }
    for (;;) {
      await sleep(450)
      const job = await request(`/sets/${setId}/status`)
      onProgress(job.total ? Math.round((job.progress / job.total) * 100) : job.status === 'done' ? 100 : 0)
      if (job.status === 'done') { onProgress(100); return { analyzed: job.total } }
      if (job.status === 'failed') throw new ApiError(job.error || 'Не вдалося виконати аналіз', 500)
      if (job.status === 'idle') return { analyzed: 0 }
    }
  },

  /* ---------- статистика та звіти ---------- */
  getStats: (setId = 'all') => request(`/stats${setId === 'all' ? '' : qs({ setId })}`),
  listReports: () => request('/reports'),
  createReport: ({ setId, format }) => request(`/sets/${setId}/reports`, { method: 'POST', body: { format } }),
  getReportRows: (setId) => request(`/sets/${setId}/report-data`),
  downloadReport: (id) => request(`/reports/${id}/download`, { blob: true }),

  /* ---------- адміністрування ---------- */
  listUsers: () => request('/users'),
  updateUserRole: (id, role) => request(`/users/${id}`, { method: 'PATCH', body: { role } }),

  /* ---------- NLP-демо (публічний ендпоїнт) ---------- */
  analyzeText: (text) => request('/analyze-text', { method: 'POST', body: { text }, auth: false }),
  health: () => request('/health', { auth: false }),
}
