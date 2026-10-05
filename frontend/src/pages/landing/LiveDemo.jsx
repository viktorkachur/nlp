import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { analyzeText } from '../../lib/analyzer'
import { SENTIMENTS } from '../../data/seed'
import Mascot from '../../components/brand/Mascot'
import Button from '../../components/ui/Button'
import { Pill, SentimentBadge } from '../../components/ui/Badge'
import styles from './Landing.module.css'

const EXAMPLES = [
  'Чудовий застосунок, дуже зручний та швидкий, дякую!',
  'Після оновлення все гальмує і постійно вилітає, розчарований.',
  'Звичайний сервіс, нічого особливого.',
]
const MOOD = { positive: 'happy', neutral: 'neutral', negative: 'sad' }

/** Інтерактивний міні-аналізатор: користувач вводить відгук і одразу бачить результат (виконується в браузері). */
export default function LiveDemo() {
  const [text, setText] = useState(EXAMPLES[0])
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = () => {
    if (text.trim().length < 5) return setRes({ error: 'Введіть відгук мінімум із 5 символів' })
    setBusy(true)
    setTimeout(() => { setRes(analyzeText(text)); setBusy(false) }, 650)
  }

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoIn}>
        <label htmlFor="demo-text"><b>Ваш відгук</b></label>
        <textarea id="demo-text" value={text} onChange={(e) => { setText(e.target.value); setRes(null) }} rows={4} />
        <div className={styles.chips}>
          {EXAMPLES.map((ex, i) => <button key={i} onClick={() => { setText(ex); setRes(null) }}>Приклад {i + 1}</button>)}
        </div>
        <Button icon={Sparkles} loading={busy} onClick={run}>Проаналізувати</Button>
      </div>

      <div className={styles.demoOut}>
        <AnimatePresence mode="wait">
          {!res ? (
            <motion.div key="idle" className={styles.demoIdle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Mascot mood="neutral" size={96} float />
              <p>Натисніть «Проаналізувати» — і я розповім, що думає автор відгуку.</p>
            </motion.div>
          ) : res.error ? (
            <motion.p key="err" className={styles.demoErr} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{res.error}</motion.p>
          ) : (
            <motion.div key={text + res.sentiment} className={styles.result} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Mascot mood={MOOD[res.sentiment]} size={96} />
              <div className={styles.resBody}>
                <SentimentBadge value={res.sentiment} />
                <div className={styles.gauge}>
                  <div><motion.i initial={{ width: 0 }} animate={{ width: `${res.confidence * 100}%` }} transition={{ duration: 0.9 }} style={{ background: SENTIMENTS[res.sentiment].hex }} /></div>
                  <span>впевненість {Math.round(res.confidence * 100)}%</span>
                </div>
                <div className={styles.tags}>
                  {res.topic && <Pill tone="blue">Тема: {res.topic}</Pill>}
                  {res.keywords.map((k) => <Pill key={k}>#{k}</Pill>)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
