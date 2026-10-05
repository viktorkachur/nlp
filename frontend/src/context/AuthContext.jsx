import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const KEY = 'reviewai.session'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

/** Глобальний стан автентифікації: поточний користувач та його роль. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession)

  const signIn = useCallback((u) => {
    setUser(u)
    try { localStorage.setItem(KEY, JSON.stringify(u)) } catch { /* ignore */ }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  }, [])

  // демонстраційне перемикання ролі (показує розмежування доступу в меню)
  const switchRole = useCallback((role) => signIn({ ...user, role }), [user, signIn])

  const value = useMemo(() => ({ user, signIn, signOut, switchRole }), [user, signIn, signOut, switchRole])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
