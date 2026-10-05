// Розбір завантажених файлів із відгуками (CSV та TXT) безпосередньо в браузері

export const MAX_SIZE = 10 * 1024 * 1024 // 10 МБ (нефункціональна вимога)

export const SAMPLE = [
  'Дуже зручний застосунок, дякую розробникам!',
  'Після останнього оновлення все гальмує і постійно вилітає.',
  'Підтримка відповіла швидко та допомогла вирішити питання.',
  'Ціна занадто висока для такого функціоналу.',
  'Інтерфейс нормальний, нічого особливого.',
  'Чудовий дизайн, але хотілося б більше налаштувань.',
  'Не можу увійти в акаунт, ніхто не відповідає на звернення.',
  'Швидка доставка, товар якісний, рекомендую!',
].join('\n')

/** Розбір одного CSV-рядка з урахуванням лапок. */
function splitCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted
    } else if ((ch === ',' || ch === ';') && !quoted) {
      out.push(cur); cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/**
 * Повертає { rows, skipped }.
 * CSV: якщо є заголовок «text» / «відгук» — беремо цю колонку, інакше — першу.
 * TXT: один відгук на рядок.
 */
export function parseReviews(content, filename) {
  const lines = content.split(/\r?\n/)
  const isCsv = /\.csv$/i.test(filename)
  let texts
  if (isCsv) {
    const table = lines.filter((l) => l.trim()).map(splitCsvLine)
    const head = table[0]?.map((h) => h.toLowerCase()) || []
    const col = head.findIndex((h) => ['text', 'review', 'відгук', 'текст'].includes(h))
    const body = col >= 0 ? table.slice(1) : table
    texts = body.map((r) => r[col >= 0 ? col : 0] || '')
  } else {
    texts = lines
  }
  const cleaned = texts.map((t) => t.trim()).filter(Boolean)
  const rows = cleaned.filter((t) => t.length >= 5)
  return { rows, skipped: lines.filter((l) => l.trim()).length - rows.length }
}
