import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Layers, LayoutDashboard, LogOut, UploadCloud, Users, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../data/seed'
import Logo from '../brand/Logo'
import Mascot from '../brand/Mascot'
import styles from './AppShell.module.css'

// Меню залежить від ролі користувача (розмежування доступу)
const NAV = {
  dashboard: { to: '/app', label: 'Огляд', icon: LayoutDashboard, end: true },
  sets: { to: '/app/sets', label: 'Набори відгуків', icon: Layers },
  import: { to: '/app/import', label: 'Імпорт та аналіз', icon: UploadCloud },
  reports: { to: '/app/reports', label: 'Звіти', icon: FileText },
  admin: { to: '/app/admin', label: 'Користувачі', icon: Users },
}
export const ROLE_NAV = {
  analyst: ['dashboard', 'sets', 'import', 'reports'],
  manager: ['dashboard', 'sets', 'reports'],
  admin: ['dashboard', 'admin'],
}

/** Каркас застосунку: бічне меню (desktop), нижня панель (mobile), верхня панель та область контенту. */
export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const items = ROLE_NAV[user.role].map((k) => NAV[k])

  const logout = () => {
    signOut()
    navigate('/')
  }
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.logoRow}><Logo to="/app" /></div>
        <nav aria-label="Основне меню">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="navpill" className={styles.pill} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  <n.icon size={20} className={styles.ico} />
                  <span className={styles.txt}>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className={styles.demo}>
          <Mascot mood="happy" size={64} float />
          <p><b>Підключено до сервера</b><br />Дані зберігаються в базі даних, аналіз виконує локальна NLP-модель.</p>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.top}>
          <div className={styles.topLogo}><Logo to="/app" /></div>
          <div className={styles.topSpacer} />
          <span className={styles.role}><ShieldCheck size={16} />{ROLES[user.role]}</span>
          <div className={styles.user}>
            <span className={styles.avatar}>{user.name.split(' ').map((p) => p[0]).join('')}</span>
            <span className={styles.uname}>{user.name}</span>
          </div>
          <button className={styles.logout} onClick={logout} aria-label="Вийти" title="Вийти"><LogOut size={18} /></button>
        </header>

        <AnimatePresence mode="wait">
          <motion.main key={location.pathname} className={styles.content} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      <nav className={styles.bottom} aria-label="Мобільне меню">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `${styles.bLink} ${isActive ? styles.bActive : ''}`}>
            <n.icon size={22} />
            <span>{n.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
