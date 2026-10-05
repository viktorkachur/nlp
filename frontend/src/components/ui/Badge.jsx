import { SENTIMENTS } from '../../data/seed'
import styles from './Badge.module.css'

/** Кольорова позначка тональності (позитивна / нейтральна / негативна). */
export function SentimentBadge({ value }) {
  if (!value) return <span className={`${styles.badge} ${styles.pending}`}>Не проаналізовано</span>
  const s = SENTIMENTS[value]
  return (
    <span className={styles.badge} style={{ background: s.soft }}>
      <i style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }) {
  return <span className={`${styles.pill} ${styles['t_' + tone]}`}>{children}</span>
}
