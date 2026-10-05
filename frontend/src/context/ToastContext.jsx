import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import styles from './Toast.module.css'

const ToastContext = createContext(null)
const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

/** Спливаючі повідомлення про результат операцій (видимість стану системи). */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l, { id, message, type }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3800)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className={styles.stack} aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICONS[t.type]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60 }}
                className={`${styles.toast} ${styles[t.type]}`}
              >
                <Icon size={20} />
                <span>{t.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
