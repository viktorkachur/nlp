import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/mockApi'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Field from '../components/ui/Field'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { Pill } from '../components/ui/Badge'
import styles from './Sets.module.css'

const STATUS = { done: ['green', 'Проаналізовано'], pending: ['yellow', 'Очікує аналізу'], running: ['blue', 'Виконується'] }

/** Форма створення / перейменування набору з валідацією на клієнті та обробкою помилок API. */
function SetForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: initial?.name || '', description: initial?.description || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 3) e.name = 'Назва має містити щонайменше 3 символи'
    if (form.name.length > 60) e.name = 'Назва не може перевищувати 60 символів'
    if (form.description.length > 200) e.description = 'Опис не може перевищувати 200 символів'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const saved = initial ? await api.updateSet(initial.id, form) : await api.createSet(form) // POST /sets  |  PATCH /sets/{id}
      toast(initial ? 'Набір оновлено' : 'Набір створено')
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError && err.fields.name) setErrors(err.fields)
      else toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <Field label="Назва набору" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Наприклад, «Мобільний застосунок»" autoFocus />
      <Field as="textarea" label="Опис (необов’язково)" value={form.description} error={errors.description} onChange={(e) => setForm({ ...form, description: e.target.value })} hint={`${form.description.length}/200`} />
      <div className={styles.formBtns}>
        <Button type="button" variant="ghost" onClick={onCancel}>Скасувати</Button>
        <Button type="submit" loading={busy}>{initial ? 'Зберегти' : 'Створити набір'}</Button>
      </div>
    </form>
  )
}

/** Список наборів відгуків: перегляд, створення, перейменування, видалення (CRUD). */
export default function Sets() {
  const { user } = useAuth()
  const toast = useToast()
  const canEdit = user.role === 'analyst'
  const sets = useAsync(() => api.listSets(), [])
  const [modal, setModal] = useState(null) // { type: 'create' | 'edit' | 'delete', set? }
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    setDeleting(true)
    try {
      await api.deleteSet(modal.set.id) // DELETE /sets/{id}
      toast('Набір видалено разом із відгуками', 'info')
      setModal(null)
      sets.reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Набори відгуків"
        subtitle="Групуйте відгуки за продуктом чи джерелом та запускайте аналіз для кожного набору."
        actions={canEdit && <Button icon={Plus} onClick={() => setModal({ type: 'create' })}>Новий набір</Button>}
      />

      {sets.loading ? (
        <div className={styles.grid}>{[0, 1, 2].map((i) => <Skeleton key={i} h={190} r={14} />)}</div>
      ) : sets.error ? (
        <Card><p>Не вдалося завантажити набори.</p><Button variant="secondary" onClick={sets.reload}>Повторити</Button></Card>
      ) : sets.data.length === 0 ? (
        <Card><EmptyState title="Наборів ще немає" text="Створіть перший набір, щоб імпортувати відгуки та запустити аналіз." action={canEdit && <Button icon={Plus} onClick={() => setModal({ type: 'create' })}>Створити набір</Button>} /></Card>
      ) : (
        <motion.div className={styles.grid} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
          <AnimatePresence>
            {sets.data.map((s) => {
              const [tone, label] = STATUS[s.status]
              const pct = s.total ? Math.round((s.analyzed / s.total) * 100) : 0
              return (
                <motion.div key={s.id} layout variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Card lift className={styles.card}>
                    <div className={styles.cardTop}>
                      <Pill tone={tone}>{label}</Pill>
                      {canEdit && (
                        <div className={styles.tools}>
                          <button onClick={() => setModal({ type: 'edit', set: s })} aria-label="Перейменувати"><Pencil size={16} /></button>
                          <button onClick={() => setModal({ type: 'delete', set: s })} aria-label="Видалити"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                    <Link to={`/app/sets/${s.id}`} className={styles.name}><h3>{s.name}</h3></Link>
                    <p className={styles.desc}>{s.description || 'Без опису'}</p>
                    <div className={styles.progress}>
                      <div><motion.i initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.2 }} /></div>
                      <span>{s.analyzed} з {s.total} проаналізовано</span>
                    </div>
                    <div className={styles.foot}>
                      <span><Calendar size={14} /> {s.created.split('-').reverse().join('.')}</span>
                      <Link to={`/app/sets/${s.id}`} className={styles.open}>Відкрити →</Link>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal open={modal?.type === 'create' || modal?.type === 'edit'} title={modal?.type === 'edit' ? 'Перейменувати набір' : 'Новий набір відгуків'} onClose={() => setModal(null)}>
        <SetForm initial={modal?.set} onCancel={() => setModal(null)} onSaved={() => { setModal(null); sets.reload() }} />
      </Modal>
      <Modal open={modal?.type === 'delete'} title="Видалити набір?" onClose={() => setModal(null)}>
        <p className={styles.warn}>Набір <b>«{modal?.set?.name}»</b> і всі його відгуки та результати аналізу буде видалено безповоротно.</p>
        <div className={styles.formBtns}>
          <Button variant="ghost" onClick={() => setModal(null)}>Скасувати</Button>
          <Button variant="danger" loading={deleting} icon={Trash2} onClick={remove}>Видалити</Button>
        </div>
      </Modal>
    </>
  )
}
