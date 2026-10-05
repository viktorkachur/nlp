import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)
const KEY = 'reviewai.session'

function readSession() {
  try {
    return tokenStore.get() ? JSON.parse(localStorage.getItem(KEY)) || null : null
  } catch {
    return null
  }
}

/** Глобальний стан автентифікації: поточний користувач (токен зберігається в api/client). */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession)

  const signIn = useCallback((u) => {
    setUser(u)
    try { localStorage.setItem(KEY, JSON.stringify(u)) } catch { /* ignore */ }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    tokenStore.clear()
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  }, [])

  // сервер відхилив токен (прострочений / недійсний) — виходимо з системи
  useEffect(() => {
    window.addEventListener('auth-expired', signOut)
    return () => window.removeEventListener('auth-expired', signOut)
  }, [signOut])

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
