import styles from './PageHeader.module.css'

/** Заголовок сторінки: назва, опис та область дій (кнопки). */
export default function PageHeader({ title, subtitle, actions, hand }) {
  return (
    <div className={styles.head}>
      <div>
        {hand && <span className={`hand ${styles.hand}`}>{hand}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
