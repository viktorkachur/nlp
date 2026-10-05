import styles from './Card.module.css'

/** Базова картка-контейнер. `lift` додає підйом при наведенні, `accent` — жорстку тінь. */
export default function Card({ children, lift = false, accent = false, className = '', ...rest }) {
  return <div className={`${styles.card} ${lift ? styles.lift : ''} ${accent ? styles.accent : ''} ${className}`} {...rest}>{children}</div>
}
