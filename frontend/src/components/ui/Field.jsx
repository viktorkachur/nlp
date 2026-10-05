import { useId } from 'react'
import styles from './Field.module.css'

/**
 * Поле форми з підписом, підказкою та повідомленням про помилку.
 * Тип `textarea` / `select` задається через проп `as`.
 */
export default function Field({ label, error, hint, as = 'input', children, className = '', ...rest }) {
  const id = useId()
  const Tag = as
  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <Tag id={id} className={`${styles.control} ${error ? styles.invalid : ''}`} aria-invalid={!!error} aria-describedby={error ? id + '-e' : undefined} {...rest}>
        {children}
      </Tag>
      {error ? <p id={id + '-e'} className={styles.error} role="alert">{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
