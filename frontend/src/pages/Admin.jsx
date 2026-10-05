import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { ROLES } from '../data/seed'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import styles from './Admin.module.css'

const TONE = { analyst: 'var(--blue)', manager: 'var(--green)', admin: 'var(--orange)' }

/** Адміністрування: перегляд користувачів та зміна їхніх ролей (оптимістичне оновлення з відкатом при помилці). */
export default function Admin() {
  const toast = useToast()
  const users = useAsync(() => api.listUsers(), [])

  const change = async (u, role) => {
    const prev = users.data
    users.setData(prev.map((x) => (x.id === u.id ? { ...x, role } : x))) // оптимістично оновлюємо інтерфейс
    try {
      await api.updateUserRole(u.id, role) // PATCH /users/{id}
      toast(`Роль користувача ${u.name} змінено`)
    } catch (e) {
      users.setData(prev) // відкат
      toast(e.message, 'error')
    }
  }

  const counts = users.data ? Object.keys(ROLES).map((r) => [r, users.data.filter((u) => u.role === r).length]) : []

  return (
    <>
      <PageHeader title="Користувачі" subtitle="Керуйте обліковими записами та ролями доступу до системи." />
      <div className={styles.cards}>
        {counts.map(([r, n]) => (
          <Card key={r} lift className={styles.count}>
            <b style={{ color: TONE[r] }}>{n}</b>
            <span>{ROLES[r]}</span>
          </Card>
        ))}
      </div>
      <Card className={styles.card}>
        {users.loading ? <Skeleton h={220} r={12} /> : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.head}`}><span>Користувач</span><span>E-mail</span><span>Реєстрація</span><span>Роль</span></div>
            {users.data.map((u, i) => (
              <motion.div key={u.id} className={styles.row} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className={styles.who}>
                  <span className={styles.avatar} style={{ background: TONE[u.role] }}>{u.name.split(' ').map((p) => p[0]).join('')}</span>
                  <b>{u.name}</b>
                </div>
                <span className={styles.mail}>{u.email}</span>
                <span className={styles.date}>{u.created.split('-').reverse().join('.')}</span>
                <select value={u.role} onChange={(e) => change(u, e.target.value)} aria-label={`Роль користувача ${u.name}`}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
