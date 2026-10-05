import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_NAV } from './AppShell'
import EmptyState from '../ui/EmptyState'
import Button from '../ui/Button'

const KEY_BY_PATH = { '/app': 'dashboard', '/app/sets': 'sets', '/app/import': 'import', '/app/reports': 'reports', '/app/admin': 'admin' }

/**
 * Захист маршрутів: неавторизованих перенаправляє на /login,
 * а для ролі без доступу показує повідомлення (розмежування прав).
 */
export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />
  const section = Object.keys(KEY_BY_PATH).filter((p) => pathname === p || pathname.startsWith(p + '/')).sort((a, b) => b.length - a.length)[0]
  const allowed = !section || ROLE_NAV[user.role].includes(KEY_BY_PATH[section])
  if (!allowed) {
    return (
      <div style={{ padding: 40 }}>
        <EmptyState mood="sad" title="Немає доступу" text="Ваша роль не має прав для перегляду цього розділу. Змініть роль у верхній панелі або поверніться на головну." action={<Button to="/app" variant="secondary">До огляду</Button>} />
      </div>
    )
  }
  return children
}
