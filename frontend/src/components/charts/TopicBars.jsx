import { motion } from 'framer-motion'
import { SENTIMENTS } from '../../data/seed'
import styles from './Charts.module.css'

/** Горизонтальні стекові стовпчики: розподіл відгуків за темами та тональністю. */
export default function TopicBars({ topics, onSelect }) {
  const max = Math.max(1, ...topics.map((t) => t.total))
  return (
    <ul className={styles.bars}>
      {topics.map((t, i) => (
        <li key={t.topic} onClick={() => onSelect?.(t.topic)} className={onSelect ? styles.clickable : ''}>
          <span className={styles.barLabel}>{t.topic}</span>
          <div className={styles.track}>
            <motion.div className={styles.stack} initial={{ width: 0 }} animate={{ width: `${(t.total / max) * 100}%` }} transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}>
              {['positive', 'neutral', 'negative'].map((k) => t[k] > 0 && <i key={k} style={{ flex: t[k], background: SENTIMENTS[k].hex }} title={`${SENTIMENTS[k].short}: ${t[k]}`} />)}
            </motion.div>
          </div>
          <b className={styles.barValue}>{t.total}</b>
        </li>
      ))}
    </ul>
  )
}
