// Константи інтерфейсу (дані надходять із сервера)

export const SENTIMENTS = {
  positive: { label: 'Позитивний', short: 'Позитивні', color: 'var(--green)', soft: 'var(--green-soft)', hex: '#3fa66b' },
  neutral: { label: 'Нейтральний', short: 'Нейтральні', color: 'var(--yellow)', soft: 'var(--yellow-soft)', hex: '#f9bd2b' },
  negative: { label: 'Негативний', short: 'Негативні', color: 'var(--red)', soft: 'var(--red-soft)', hex: '#e5392b' },
}

export const ROLES = {
  analyst: 'Аналітик',
  manager: 'Менеджер продукту',
  admin: 'Адміністратор',
}

// Демонстраційні облікові записи, створені на сервері під час першого запуску
export const DEMO_ACCOUNTS = [
  { email: 'analyst@example.com', role: 'analyst' },
  { email: 'manager@example.com', role: 'manager' },
  { email: 'admin@example.com', role: 'admin' },
]
export const DEMO_PASSWORD = 'Demo12345'
