import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES } from '../data/seed'
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

/** Сторінка входу / реєстрації. Дані перевіряються на клієнті, а потім повторно – на сервері. */
export default function Auth() {
  const { user, signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/app'

  const [mode, setMode] = useState('login')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

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
      const r = mode === 'login' ? await api.login(form) : await api.register(form) // POST /auth/login | /auth/register
      signIn(r.user)
      toast(mode === 'login' ? `Вітаємо, ${r.user.name.split(' ')[0]}!` : 'Акаунт створено. Ласкаво просимо!')
      navigate(from)
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fields, form: err.message } : { form: 'Помилка мережі. Спробуйте пізніше.' })
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
          <li><ShieldCheck size={18} /> Паролі хешуються, доступ — за токеном</li>
        </ul>
        <i className={styles.blob1} /><i className={styles.blob2} />
      </aside>

      <main className={styles.main}>
        <motion.div className={styles.box} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
          <div className={styles.mobileLogo}><Logo /></div>
          <Tabs value={mode} onChange={(m) => { setMode(m); setErrors({}) }} items={[{ value: 'login', label: 'Вхід' }, { value: 'register', label: 'Реєстрація' }]} />
          <h1>{mode === 'login' ? 'З поверненням!' : 'Створіть акаунт'}</h1>
          <p className={styles.sub}>{mode === 'login' ? 'Увійдіть, щоб побачити результати аналізу.' : 'Це займе менше хвилини. Ви станете аналітиком і зможете завантажувати власні відгуки.'}</p>

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
                {DEMO_ACCOUNTS.map((u) => <button key={u.email} type="button" onClick={() => fill(u)}>{ROLES[u.role]}</button>)}
              </div>
              <small>Пароль демо-акаунтів: {DEMO_PASSWORD}. Або зареєструйтесь і завантажте власні відгуки.</small>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
