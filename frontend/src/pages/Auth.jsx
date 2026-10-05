import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { DEMO_ACCOUNTS, DEMO_CODE, DEMO_PASSWORD, ROLES } from '../data/seed'
import Logo from '../components/brand/Logo'
import Mascot from '../components/brand/Mascot'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Tabs from '../components/ui/Tabs'
import styles from './Auth.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Оцінка складності пароля (0–4) для індикатора на формі реєстрації. */
function strength(p) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-ZА-Я]/.test(p) && /[a-zа-я]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^\p{L}\d]/u.test(p)) s++
  return s
}

/** Поле введення 6-значного коду: автоперехід між клітинками, Backspace та вставка з буфера. */
function CodeInput({ value, onChange, error }) {
  const refs = useRef([])
  useEffect(() => refs.current[0]?.focus(), [])
  const set = (i, ch) => {
    const arr = value.padEnd(6, ' ').split('')
    arr[i] = ch || ' '
    onChange(arr.join('').trimEnd().replace(/ /g, ''))
    if (ch && i < 5) refs.current[i + 1]?.focus()
  }
  return (
    <div className={`${styles.code} ${error ? styles.codeErr : ''}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] || ''}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Цифра ${i + 1}`}
          onChange={(e) => /^\d?$/.test(e.target.value) && set(i, e.target.value)}
          onKeyDown={(e) => e.key === 'Backspace' && !value[i] && i > 0 && refs.current[i - 1]?.focus()}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
            if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, 5)]?.focus() }
          }}
        />
      ))}
    </div>
  )
}

/** Сторінка входу / реєстрації. Вхід двокроковий: пароль → код підтвердження (імітація 2FA). */
export default function Auth() {
  const { user, signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/app'

  const [mode, setMode] = useState('login')
  const [step, setStep] = useState(1)
  const [challenge, setChallenge] = useState(null)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [code, setCode] = useState('')

  if (user) return <Navigate to="/app" replace />

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined, form: undefined }) }
  const fill = (u) => { setMode('login'); setForm({ ...form, email: u.email, password: DEMO_PASSWORD }); setErrors({}) }

  const validate = () => {
    const e = {}
    if (mode === 'register' && form.name.trim().length < 2) e.name = 'Вкажіть ім’я (мінімум 2 символи)'
    if (!EMAIL_RE.test(form.email)) e.email = 'Введіть коректну електронну адресу'
    if (form.password.length < 8) e.password = 'Пароль має містити щонайменше 8 символів'
    else if (mode === 'register' && !/\d/.test(form.password)) e.password = 'Додайте до пароля хоча б одну цифру'
    if (mode === 'register' && form.confirm !== form.password) e.confirm = 'Паролі не збігаються'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      if (mode === 'login') {
        const r = await api.login(form) // POST /auth/login
        setChallenge(r.challenge)
        setStep(2)
      } else {
        const r = await api.register(form) // POST /auth/register
        signIn(r.user)
        toast('Акаунт створено. Ласкаво просимо!')
        navigate('/app')
      }
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fields, form: err.message } : { form: 'Помилка мережі. Спробуйте пізніше.' })
    } finally {
      setBusy(false)
    }
  }

  const verify = async (ev) => {
    ev.preventDefault()
    if (code.length < 6) return setErrors({ code: 'Введіть усі 6 цифр' })
    setBusy(true)
    try {
      const r = await api.verifyCode({ challenge, code }) // POST /auth/verify
      signIn(r.user)
      toast(`Вітаємо, ${r.user.name.split(' ')[0]}!`)
      navigate(from)
    } catch (err) {
      setErrors({ code: err.message })
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const sc = strength(form.password)

  return (
    <div className={styles.page}>
      <aside className={styles.aside}>
        <Logo dark />
        <div className={styles.asideMid}>
          <Mascot mood="happy" size={170} float />
          <h2>Зрозумійте, що кажуть ваші користувачі</h2>
          <p className="hand">аналіз відгуків — локально й без хмар</p>
        </div>
        <ul>
          <li><ShieldCheck size={18} /> Дані не залишають ваш сервер</li>
          <li><ShieldCheck size={18} /> Двоетапна перевірка входу</li>
        </ul>
        <i className={styles.blob1} /><i className={styles.blob2} />
      </aside>

      <main className={styles.main}>
        <div className={styles.box}>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <div className={styles.mobileLogo}><Logo /></div>
                <Tabs value={mode} onChange={(m) => { setMode(m); setErrors({}) }} items={[{ value: 'login', label: 'Вхід' }, { value: 'register', label: 'Реєстрація' }]} />
                <h1>{mode === 'login' ? 'З поверненням!' : 'Створіть акаунт'}</h1>
                <p className={styles.sub}>{mode === 'login' ? 'Увійдіть, щоб побачити результати аналізу.' : 'Це займе менше хвилини.'}</p>

                <form onSubmit={submit} noValidate className={styles.form}>
                  {mode === 'register' && <Field label="Ім’я" value={form.name} error={errors.name} onChange={set('name')} autoComplete="name" />}
                  <Field label="Електронна пошта" type="email" value={form.email} error={errors.email} onChange={set('email')} autoComplete="email" placeholder="name@example.com" />
                  <div className={styles.pass}>
                    <Field label="Пароль" type={show ? 'text' : 'password'} value={form.password} error={errors.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                    <button type="button" className={styles.eye} onClick={() => setShow(!show)} aria-label={show ? 'Сховати пароль' : 'Показати пароль'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {mode === 'register' && (
                    <>
                      <div className={styles.meter} aria-hidden="true">
                        {[0, 1, 2, 3].map((i) => <motion.i key={i} animate={{ backgroundColor: i < sc ? ['#e5392b', '#f9bd2b', '#8fc95a', '#3fa66b'][sc - 1] : '#e5e7e0' }} />)}
                        <span>{['Дуже слабкий', 'Слабкий', 'Середній', 'Добрий', 'Надійний'][sc]}</span>
                      </div>
                      <Field label="Підтвердіть пароль" type={show ? 'text' : 'password'} value={form.confirm} error={errors.confirm} onChange={set('confirm')} autoComplete="new-password" />
                    </>
                  )}
                  {errors.form && <p className={styles.formErr} role="alert">{errors.form}</p>}
                  <Button type="submit" size="lg" loading={busy}>{mode === 'login' ? 'Увійти' : 'Створити акаунт'}</Button>
                </form>

                {mode === 'login' && (
                  <div className={styles.demo}>
                    <span className="hand">демо-доступ — оберіть роль:</span>
                    <div>
                      {DEMO_ACCOUNTS.map((u) => <button key={u.id} type="button" onClick={() => fill(u)}>{ROLES[u.role]}</button>)}
                    </div>
                    <small>Пароль: {DEMO_PASSWORD} · код підтвердження: {DEMO_CODE}</small>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <button className={styles.back} onClick={() => { setStep(1); setCode(''); setErrors({}) }}><ArrowLeft size={16} /> Назад</button>
                <span className={styles.shield}><ShieldCheck size={30} /></span>
                <h1>Підтвердіть вхід</h1>
                <p className={styles.sub}>Ми надіслали 6-значний код на <b>{form.email}</b>. Введіть його нижче.</p>
                <form onSubmit={verify} className={styles.form} noValidate>
                  <CodeInput value={code} onChange={(v) => { setCode(v); setErrors({}) }} error={errors.code} />
                  {errors.code && <p className={styles.formErr} role="alert">{errors.code}</p>}
                  <Button type="submit" size="lg" loading={busy}>Підтвердити</Button>
                </form>
                <small className={styles.hint}>Демо-код: <b>{DEMO_CODE}</b></small>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
