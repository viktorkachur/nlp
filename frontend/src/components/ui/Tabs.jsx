import { useId } from 'react'
import { motion } from 'framer-motion'
import styles from './Tabs.module.css'

/** Перемикач-таби з анімованим «повзунком» (спільна анімація layoutId). */
export default function Tabs({ items, value, onChange, className = '' }) {
  const uid = useId()
  return (
    <div className={`${styles.tabs} ${className}`} role="tablist">
      {items.map((t) => (
        <button type="button" key={t.value} role="tab" aria-selected={value === t.value} className={`${styles.tab} ${value === t.value ? styles.active : ''}`} onClick={() => onChange(t.value)}>
          {value === t.value && <motion.span layoutId={uid} className={styles.thumb} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className={styles.label}>{t.label}{t.count != null && <em>{t.count}</em>}</span>
        </button>
      ))}
    </div>
  )
}
