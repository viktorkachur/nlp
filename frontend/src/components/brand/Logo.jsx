import { Link } from 'react-router-dom'
import styles from './Logo.module.css'

/** Логотип-посилання на головну сторінку. */
export default function Logo({ to = '/', dark = false }) {
  return (
    <Link to={to} className={`${styles.logo} ${dark ? styles.dark : ''}`} aria-label="Відгуки.AI — на головну">
      <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#f54e00" />
        <path d="M12 16h36a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H28l-10 8v-8h-6a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z" fill="#fdfdf8" transform="translate(0 -1)" />
        <circle cx="23" cy="29" r="2.6" fill="#151515" />
        <circle cx="37" cy="29" r="2.6" fill="#151515" />
        <path d="M23 35q7 6 14 0" stroke="#151515" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span>Відгуки<b>.AI</b></span>
    </Link>
  )
}
