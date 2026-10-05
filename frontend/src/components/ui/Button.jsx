import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import styles from './Button.module.css'

/**
 * Кнопка системи. Варіанти: primary | secondary | ghost | danger.
 * Якщо передано `to` — рендериться як посилання (React Router).
 * Стан loading блокує повторне натискання (запобігання помилкам).
 */
export default function Button({ variant = 'primary', size = 'md', loading = false, to, icon: Icon, children, className = '', ...rest }) {
  const cls = `${styles.btn} ${styles[variant]} ${styles[size]} ${className}`
  const content = (
    <>
      {loading ? <Loader2 size={18} className={styles.spin} /> : Icon && <Icon size={18} />}
      <span>{children}</span>
    </>
  )
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>
  return <button className={cls} disabled={loading || rest.disabled} {...rest}>{content}</button>
}
