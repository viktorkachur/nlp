import { motion } from 'framer-motion'
import styles from './Charts.module.css'

const COLORS = ['var(--orange)', 'var(--blue)', 'var(--green)', 'var(--ink)', '#b86e00']

/** Хмара ключових слів: розмір шрифту залежить від частоти. */
export default function KeywordCloud({ words, onSelect }) {
  const max = Math.max(1, ...words.map((w) => w.n))
  return (
    <div className={styles.cloud}>
      {words.map((w, i) => (
        <motion.button
          key={w.word}
          className={styles.word}
          style={{ fontSize: 14 + (w.n / max) * 22, color: COLORS[i % COLORS.length] }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.035, type: 'spring', stiffness: 260, damping: 18 }}
          whileHover={{ scale: 1.15, rotate: i % 2 ? 2 : -2 }}
          onClick={() => onSelect?.(w.word)}
          title={`${w.n} згадок`}
        >
          {w.word}
        </motion.button>
      ))}
    </div>
  )
}
