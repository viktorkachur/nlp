import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import styles from './ServerBanner.module.css'

/** Показує повідомлення, якщо сервер відповідає повільно (безкоштовний хостинг «прокидається» до хвилини). */
export default function ServerBanner() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const on = (e) => setSlow(!!e.detail)
    window.addEventListener('api-slow', on)
    return () => window.removeEventListener('api-slow', on)
  }, [])
  return (
    <AnimatePresence>
      {slow && (
        <motion.div className={`${styles.bar} no-print`} role="status" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}>
          <Loader2 size={18} className={styles.spin} />
          <span>Сервер прокидається після простою — це може тривати до хвилини. Зачекайте, будь ласка…</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
