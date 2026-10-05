import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Field from '../components/ui/Field'
import Tabs from '../components/ui/Tabs'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Mascot from '../components/brand/Mascot'
import { Pill, SentimentBadge } from '../components/ui/Badge'
import styles from './SetDetail.module.css'

/** Затримка введення пошуку (debounce), щоб не надсилати запит на кожну літеру. */
function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function Confidence({ value }) {
  return (
    <div className={styles.conf} title={`Впевненість моделі: ${Math.round(value * 100)}%`}>
      <div><motion.i initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.7 }} /></div>
      <span>{Math.round(value * 100)}%</span>
    </div>
  )
}

/** Сторінка набору: список відгуків із фільтрами, пошуком, пагінацією, додаванням та запуском аналізу. */
export default function SetDetail() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const toast = useToast()
  const canEdit = user.role === 'analyst'

  // стан фільтрів
  const [sentiment, setSentiment] = useState('all')
  const [topic, setTopic] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounced(query)

  // стан модальних вікон та аналізу
  const [adding, setAdding] = useState(false)
  const [progress, setProgress] = useState(null)

  const set = useAsync(() => api.getSet(id), [id])
  const stats = useAsync(() => api.getStats(id), [id, set.data?.analyzed])
  const list = useAsync(() => api.listReviews({ setId: id, sentiment, topic, q, page }), [id, sentiment, topic, q, page, set.data?.total, set.data?.analyzed])

  useEffect(() => setPage(1), [sentiment, topic, q])

  const runAnalysis = async () => {
    setProgress(0)
    try {
      const r = await api.analyzeSet(id, setProgress) // POST /sets/{id}/analyze + опитування стану
      toast(`Аналіз завершено: оброблено ${r.analyzed} відгуків`)
      set.reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setProgress(null)
    }
  }

  const remove = async (rid) => {
    await api.deleteReview(rid) // DELETE /reviews/{id}
    toast('Відгук видалено', 'info')
    set.reload()
  }

  if (set.error) return <Card><EmptyState mood="sad" title="Набір не знайдено" text="Можливо, його було видалено." action={<Button to="/app/sets" variant="secondary">До списку наборів</Button>} /></Card>

  const pending = set.data ? set.data.total - set.data.analyzed : 0
  const topics = stats.data?.topics.map((t) => t.topic) || []

  return (
    <>
      <Link to="/app/sets" className={styles.back}><ArrowLeft size={16} /> Усі набори</Link>
      <PageHeader
        title={set.data?.name || 'Завантаження…'}
        subtitle={set.data?.description}
        actions={
          canEdit && (
            <>
              <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)}>Додати відгук</Button>
              <Button icon={Sparkles} disabled={!pending || progress != null} onClick={runAnalysis}>{pending ? `Проаналізувати (${pending})` : 'Усе проаналізовано'}</Button>
            </>
          )
        }
      />

      <AnimatePresence>
        {progress != null && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <Card accent className={styles.running}>
              <Mascot mood="neutral" size={56} float />
              <div style={{ flex: 1 }}>
                <b>Аналізуємо відгуки локально…</b>
                <div className={styles.bar}><motion.i animate={{ width: `${progress}%` }} /></div>
                <small>{progress}% — очищення тексту, тональність, теми</small>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className={styles.panel}>
        <div className={styles.filters}>
          <Tabs
            value={sentiment}
            onChange={setSentiment}
            items={[
              { value: 'all', label: 'Усі' },
              { value: 'positive', label: 'Позитивні' },
              { value: 'neutral', label: 'Нейтральні' },
              { value: 'negative', label: 'Негативні' },
            ]}
          />
          <div className={styles.right}>
            <Field as="select" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Тема" className={styles.topicSel}>
              <option value="all">Усі теми</option>
              {topics.map((t) => <option key={t}>{t}</option>)}
            </Field>
            <div className={styles.search}>
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук за текстом…" aria-label="Пошук за текстом" />
            </div>
          </div>
        </div>

        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow}`}>
            <span>Відгук</span><span>Тональність</span><span>Тема</span><span>Впевненість</span><span>Дата</span><span />
          </div>
          {list.loading && !list.data ? (
            [0, 1, 2, 3, 4].map((i) => <div key={i} className={styles.row}><Skeleton h={22} w="90%" /></div>)
          ) : list.data?.rows.length === 0 ? (
            <EmptyState title="Нічого не знайдено" text="Спробуйте змінити фільтри або пошуковий запит." />
          ) : (
            <AnimatePresence mode="popLayout">
              {list.data?.rows.map((r) => (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: list.loading ? 0.5 : 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className={styles.row}>
                  <div className={styles.text}>
                    <p>{r.text}</p>
                    {r.analysis?.keywords.length > 0 && <div className={styles.kw}>{r.analysis.keywords.map((k) => <span key={k}>#{k}</span>)}</div>}
                  </div>
                  <div data-label="Тональність"><SentimentBadge value={r.analysis?.sentiment} /></div>
                  <div data-label="Тема">{r.analysis?.topic ? <Pill tone="blue">{r.analysis.topic}</Pill> : <span className={styles.dash}>—</span>}</div>
                  <div data-label="Впевненість">{r.analysis ? <Confidence value={r.analysis.confidence} /> : <span className={styles.dash}>—</span>}</div>
                  <div className={styles.date} data-label="Дата">{r.created.split('-').reverse().join('.')}</div>
                  <div className={styles.act}>{canEdit && <button onClick={() => remove(r.id)} aria-label="Видалити відгук"><Trash2 size={16} /></button>}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {list.data && (
          <div className={styles.pager}>
            <span>Знайдено: <b>{list.data.total}</b></span>
            <div>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Попередня сторінка"><ChevronLeft size={18} /></button>
              <span>{page} / {list.data.pages}</span>
              <button disabled={page >= list.data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Наступна сторінка"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </Card>

      <AddReview open={adding} setId={id} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); set.reload() }} />
    </>
  )
}

/** Модальна форма додавання відгуку (валідація довжини тексту). */
function AddReview({ open, setId, onClose, onAdded }) {
  const [text, setText] = useState('')
  const [rating, setRating] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    if (text.trim().length < 5) return setError('Введіть відгук мінімум із 5 символів')
    setError('')
    setBusy(true)
    try {
      await api.addReview(setId, { text, rating: rating ? Number(rating) : null }) // POST /sets/{id}/reviews
      toast('Відгук додано. Запустіть аналіз, щоб визначити тональність')
      setText(''); setRating('')
      onAdded()
    } catch (err) {
      setError(err.fields?.text || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Додати відгук" onClose={onClose}>
      <form onSubmit={submit} className={styles.form} noValidate>
        <Field as="textarea" label="Текст відгуку" value={text} error={error} onChange={(e) => { setText(e.target.value); setError('') }} placeholder="Наприклад: «Дуже зручний інтерфейс, але іноді гальмує»" autoFocus />
        <Field as="select" label="Оцінка користувача (необов’язково)" value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="">Без оцінки</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
        </Field>
        <div className={styles.formBtns}>
          <Button type="button" variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button type="submit" loading={busy}>Додати</Button>
        </div>
      </form>
    </Modal>
  )
}
