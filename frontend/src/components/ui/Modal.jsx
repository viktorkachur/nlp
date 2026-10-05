import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

/** Модальне вікно з анімацією, закриттям за Esc та кліком по фону (контроль користувача). */
export default function Modal({ open, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`${styles.overlay} no-print`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`${styles.dialog} ${wide ? styles.wide : ''}`}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header>
              <h3>{title}</h3>
              <button className={styles.close} onClick={onClose} aria-label="Закрити"><X size={20} /></button>
            </header>
            <div className={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
