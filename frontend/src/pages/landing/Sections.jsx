import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, FileText, Hash, Lock, Menu, Plus, ShieldCheck, Smile, UploadCloud, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { SENTIMENTS } from '../../data/seed'
import Logo from '../../components/brand/Logo'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import Donut from '../../components/charts/Donut'
import TopicBars from '../../components/charts/TopicBars'
import styles from './Landing.module.css'

/** Обгортка: елемент плавно з’являється під час прокручування сторінки. */
export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

export function SectionTitle({ hand, title, text }) {
  return (
    <Reveal className={styles.sTitle}>
      <span className="hand">{hand}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </Reveal>
  )
}

/* ------------------------------------------------------------------ Navbar */
const LINKS = [['features', 'Можливості'], ['how', 'Як це працює'], ['demo', 'Спробувати'], ['faq', 'Питання']]

export function Navbar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const go = (id) => { setOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={`container ${styles.navIn}`}>
        <Logo />
        <nav className={styles.navLinks} aria-label="Розділи сторінки">
          {LINKS.map(([id, t]) => <button key={id} onClick={() => go(id)}>{t}</button>)}
        </nav>
        <div className={styles.navCta}>
          {user ? <Button to="/app" size="sm">Відкрити застосунок</Button> : (<><Button to="/login" variant="ghost" size="sm">Увійти</Button><Button to="/login" size="sm">Спробувати демо</Button></>)}
        </div>
        <button className={styles.burger} onClick={() => setOpen(!open)} aria-label="Меню">{open ? <X /> : <Menu />}</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className={styles.mobileMenu} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {LINKS.map(([id, t]) => <button key={id} onClick={() => go(id)}>{t}</button>)}
            <Button to="/login" size="md">Спробувати демо</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/* ----------------------------------------------------------------- Marquee */
const WORDS = ['швидкість', 'інтерфейс', 'підтримка', 'ціна', 'стабільність', 'доставка', 'дизайн', 'навігація', 'якість', 'оновлення', 'зручність', 'надійність']
const COLORS = ['var(--orange)', 'var(--blue)', 'var(--green)', 'var(--ink)']

export function Marquee() {
  const row = (rev) => (
    <div className={`${styles.track} ${rev ? styles.rev : ''}`}>
      {[...WORDS, ...WORDS].map((w, i) => <span key={i} style={{ color: COLORS[(i + (rev ? 2 : 0)) % 4] }}>#{w}</span>)}
    </div>
  )
  return <div className={styles.marquee} aria-hidden="true">{row(false)}{row(true)}</div>
}

/* ---------------------------------------------------------------- Features */
const FEATURES = [
  { icon: Smile, color: 'var(--green)', t: 'Тональність відгуків', d: 'Кожен відгук отримує мітку: позитивний, нейтральний чи негативний — разом із показником впевненості.' },
  { icon: Hash, color: 'var(--blue)', t: 'Теми та ключові слова', d: 'Система групує відгуки за темами й показує слова, які згадують найчастіше.' },
  { icon: Lock, color: 'var(--orange)', t: 'Локально й приватно', d: 'NLP-аналіз виконується на вашому сервері: дані не передаються до хмарних сервісів.' },
  { icon: UploadCloud, color: '#b86e00', t: 'Імпорт CSV та TXT', d: 'Перетягніть файл — система перевірить формат, покаже попередній перегляд і запустить аналіз.' },
  { icon: FileText, color: 'var(--green)', t: 'Звіти в один клік', d: 'Експортуйте результати у CSV або збережіть PDF-звіт зі статистикою та прикладами.' },
  { icon: Users, color: 'var(--blue)', t: 'Ролі та доступ', d: 'Аналітик, менеджер продукту й адміністратор бачать лише потрібні їм розділи.' },
]

export function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className="container">
        <SectionTitle hand="що вміє система" title="Усе, щоб зрозуміти відгуки" text="Від завантаження файлу до готового звіту — без складних налаштувань." />
        <div className={styles.featGrid}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 0.08}>
              <motion.div className={styles.feat} whileHover={{ y: -6 }}>
                <motion.span className={styles.featIcon} style={{ background: f.color }} whileHover={{ rotate: [0, -10, 10, 0] }}><f.icon size={24} /></motion.span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- How it works */
const STEPS = [
  { n: 1, icon: UploadCloud, t: 'Завантажте відгуки', d: 'Додайте файл CSV або TXT чи впишіть відгук вручну.' },
  { n: 2, icon: BarChart3, t: 'Запустіть аналіз', d: 'NLP-модуль очищає текст, визначає тональність і теми.' },
  { n: 3, icon: FileText, t: 'Отримайте звіт', d: 'Дивіться графіки, фільтруйте відгуки та експортуйте звіт.' },
]

export function HowItWorks() {
  return (
    <section id="how" className={`${styles.section} ${styles.dark}`}>
      <div className="container">
        <SectionTitle hand="просто як раз-два-три" title="Як це працює" />
        <div className={styles.steps}>
          <svg className={styles.stepLine} viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
            <motion.line x1="8" y1="2" x2="92" y2="2" stroke="var(--yellow)" strokeWidth="0.8" strokeDasharray="2 2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4 }} />
          </svg>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.15} className={styles.step}>
              <motion.div className={styles.stepIcon} whileHover={{ scale: 1.1, rotate: 4 }}>
                <s.icon size={34} />
                <b>{s.n}</b>
              </motion.div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- Showcase */
const TOPICS = [
  { topic: 'Швидкодія', positive: 14, neutral: 5, negative: 9, total: 28 },
  { topic: 'Інтерфейс', positive: 12, neutral: 7, negative: 3, total: 22 },
  { topic: 'Підтримка', positive: 7, neutral: 3, negative: 10, total: 20 },
  { topic: 'Ціна', positive: 5, neutral: 4, negative: 4, total: 13 },
]

export function Showcase() {
  const [tab, setTab] = useState('sentiment')
  const panels = {
    sentiment: {
      t: 'Одразу видно загальний настрій',
      d: 'Кільцева діаграма показує частку позитивних, нейтральних та негативних відгуків — без ручного читання сотень рядків.',
      v: (
        <div className={styles.showDonut}>
          <Donut size={210} thickness={30} data={[{ label: 'p', value: 46, color: SENTIMENTS.positive.hex }, { label: 'n', value: 24, color: SENTIMENTS.neutral.hex }, { label: 'g', value: 30, color: SENTIMENTS.negative.hex }]}>
            <div><b style={{ fontSize: 40, letterSpacing: '-0.04em' }}>46%</b><br /><small style={{ color: 'var(--muted)' }}>позитивних</small></div>
          </Donut>
          <ul>{Object.entries({ positive: 46, neutral: 24, negative: 30 }).map(([k, v]) => <li key={k}><i style={{ background: SENTIMENTS[k].hex }} />{SENTIMENTS[k].short}<b>{v}%</b></li>)}</ul>
        </div>
      ),
    },
    topics: {
      t: 'Знаходьте проблемні теми',
      d: 'Відгуки групуються за темами. Стовпчики показують, де найбільше негативу — і з чого почати покращення.',
      v: <div style={{ width: '100%' }}><TopicBars topics={TOPICS} /></div>,
    },
    reports: {
      t: 'Звіт для команди за хвилину',
      d: 'Експортуйте таблицю CSV або збережіть PDF зі статистикою, темами та прикладами відгуків.',
      v: (
        <div className={styles.paper}>
          <b>Звіт про аналіз відгуків</b>
          <div className={styles.lines}>{[90, 70, 82, 55, 76, 64].map((w, i) => <motion.i key={i} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 0.1 * i, duration: 0.5 }} />)}</div>
          <div className={styles.paperRow}><span>CSV</span><span>PDF</span></div>
        </div>
      ),
    },
  }
  const p = panels[tab]
  return (
    <section className={styles.section}>
      <div className="container">
        <SectionTitle hand="подивіться самі" title="Результати, які зрозуміє кожен" />
        <Reveal className={styles.showWrap}>
          <Tabs value={tab} onChange={setTab} items={[{ value: 'sentiment', label: 'Тональність' }, { value: 'topics', label: 'Теми' }, { value: 'reports', label: 'Звіти' }]} />
          <AnimatePresence mode="wait">
            <motion.div key={tab} className={styles.showBody} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
              <div><h3>{p.t}</h3><p>{p.d}</p></div>
              <div className={styles.showVisual}>{p.v}</div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------- FAQ */
const FAQ = [
  ['Куди надсилаються мої відгуки?', 'Нікуди. Аналіз виконується локально на вашому сервері за допомогою NLP-моделей, тому дані не передаються зовнішнім сервісам.'],
  ['Які формати файлів підтримуються?', 'CSV та TXT розміром до 10 МБ. У TXT кожен відгук — окремий рядок, у CSV використовується колонка «text» або перша колонка.'],
  ['Якими мовами можна аналізувати відгуки?', 'Українською та англійською.'],
  ['Хто має доступ до системи?', 'Доступ розмежовано за ролями: аналітик працює з відгуками, менеджер продукту переглядає статистику й звіти, адміністратор керує користувачами.'],
]

export function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className={styles.section}>
      <div className={`container ${styles.faqWrap}`}>
        <SectionTitle hand="часті запитання" title="Відповіді на головне" />
        <div className={styles.faq}>
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.05}>
              <div className={`${styles.qa} ${open === i ? styles.qaOpen : ''}`}>
                <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                  <span>{q}</span>
                  <motion.i animate={{ rotate: open === i ? 45 : 0 }}><Plus size={20} /></motion.i>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{a}</motion.p>}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- CTA, foot */
export function Cta() {
  return (
    <section className={styles.ctaWrap}>
      <div className="container">
        <Reveal className={styles.ctaBox}>
          <i className={styles.ctaBlob} />
          <ShieldCheck size={40} />
          <h2>Готові побачити свої відгуки по-новому?</h2>
          <p>Відкрийте демо з готовими даними — реєстрація не потрібна.</p>
          <Button to="/login" size="lg" variant="secondary">Відкрити демо</Button>
        </Reveal>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footIn}`}>
        <Logo dark />
        <p>Лабораторна робота № 6–7 · Розроблення системи інтелектуального аналізу відгуків користувачів</p>
        <Link to="/login">Увійти</Link>
      </div>
    </footer>
  )
}
