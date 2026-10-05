import styles from './Skeleton.module.css'

/** Заглушка під час завантаження даних (видимість стану системи). */
export default function Skeleton({ h = 20, w = '100%', r = 8, className = '' }) {
  return <div className={`${styles.sk} ${className}`} style={{ height: h, width: w, borderRadius: r }} />
}
