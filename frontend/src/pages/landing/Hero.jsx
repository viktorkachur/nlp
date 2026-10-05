import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Play, ShieldCheck } from 'lucide-react'
import Button from '../../components/ui/Button'
import Mascot from '../../components/brand/Mascot'
import Donut from '../../components/charts/Donut'
import { SENTIMENTS } from '../../data/seed'
import styles from './Landing.module.css'

const BUBBLES = [
  { text: 'Нарешті без зависань, дуже швидко!', s: 'positive', x: '-4%', y: '6%', d: 0 },
  { text: 'Підтримка мовчить уже тиждень…', s: 'negative', x: '58%', y: '2%', d: 1.1 },
  { text: 'Інтерфейс нормальний, реклами забагато', s: 'neutral', x: '-6%', y: '80%', d: 2.2 },
]

/** Інтерактивний «макет дашборда» в героїчному блоці: плаваючі відгуки та легкий паралакс за курсором. */
function HeroVisual() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 80, damping: 18 })
  const sy = useSpring(my, { stiffness: 80, damping: 18 })
  const rotY = useTransform(sx, [-1, 1], [-6, 6])
  const rotX = useTransform(sy, [-1, 1], [5, -5])

  return (
    <div
      className={styles.visual}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
        my.set(((e.clientY - r.top) / r.height) * 2 - 1)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
    >
      <motion.div className={styles.dash} style={{ rotateY: rotY, rotateX: rotX }} initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
        <div className={styles.dashBar}><i /><i /><i /><span>Огляд · Мобільний застосунок</span></div>
        <div className={styles.dashBody}>
          <Donut size={150} thickness={22} data={[{ label: 'p', value: 46, color: SENTIMENTS.positive.hex }, { label: 'n', value: 24, color: SENTIMENTS.neutral.hex }, { label: 'g', value: 30, color: SENTIMENTS.negative.hex }]}>
            <div><b style={{ fontSize: 28, letterSpacing: '-0.03em' }}>96</b><br /><small style={{ color: 'var(--muted)' }}>відгуків</small></div>
          </Donut>
          <div className={styles.miniBars}>
            {[['Швидкодія', 78], ['Інтерфейс', 62], ['Підтримка', 44], ['Ціна', 30]].map(([n, v], i) => (
              <div key={n}><span>{n}</span><div><motion.i initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1, delay: 0.6 + i * 0.12 }} /></div></div>
            ))}
          </div>
        </div>
      </motion.div>

      {BUBBLES.map((b) => (
        <motion.div key={b.text} className={styles.bubble} style={{ left: b.x, top: b.y }}
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
          transition={{ opacity: { delay: 0.9 + b.d * 0.2 }, scale: { delay: 0.9 + b.d * 0.2, type: 'spring' }, y: { duration: 4.5, repeat: Infinity, delay: b.d, ease: 'easeInOut' } }}>
          <i style={{ background: SENTIMENTS[b.s].color }} />
          <div><span style={{ color: SENTIMENTS[b.s].hex }}>{SENTIMENTS[b.s].label}</span>{b.text}</div>
        </motion.div>
      ))}
      <div className={styles.heroMascot}><Mascot mood="happy" size={92} float /></div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className={styles.hero}>
      <i className={styles.glow1} /><i className={styles.glow2} />
      <div className={`container ${styles.heroGrid}`}>
        <div>
          <motion.span className={styles.badge} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <ShieldCheck size={16} /> Аналіз повністю локальний
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            Зрозумійте, що насправді <span className={styles.hl}>думають<svg viewBox="0 0 200 14" preserveAspectRatio="none"><motion.path d="M3 9 Q50 1 100 8 T197 6" fill="none" stroke="#f9bd2b" strokeWidth="9" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.8 }} /></svg></span> ваші користувачі
          </motion.h1>
          <motion.p className={styles.lead} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            Завантажте відгуки — система сама визначить тональність, виявить теми й покаже, що турбує людей найбільше. Без хмарних сервісів і передавання даних третім особам.
          </motion.p>
          <motion.div className={styles.cta} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Button to="/login" size="lg" icon={ArrowRight}>Спробувати демо</Button>
            <Button variant="secondary" size="lg" icon={Play} onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>Перевірити свій відгук</Button>
          </motion.div>
          <motion.ul className={styles.facts} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <li><b>100%</b> локально</li>
            <li><b>UA + EN</b> відгуки</li>
            <li><b>CSV · TXT</b> імпорт</li>
          </motion.ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  )
}
