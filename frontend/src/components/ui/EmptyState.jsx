import Mascot from '../brand/Mascot'
import styles from './EmptyState.module.css'

/** Порожній стан списку з підказкою, що робити далі. */
export default function EmptyState({ title, text, action, mood = 'neutral' }) {
  return (
    <div className={styles.box}>
      <Mascot mood={mood} size={96} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
