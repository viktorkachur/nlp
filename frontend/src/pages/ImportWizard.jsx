import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, FileText, Sparkles, UploadCloud, Wand2 } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { MAX_SIZE, SAMPLE, parseReviews } from '../lib/parse'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Mascot from '../components/brand/Mascot'
import styles from './ImportWizard.module.css'

const STEPS = ['Файл', 'Перевірка', 'Аналіз']

/** Індикатор кроків майстра з анімованим заповненням. */
function Stepper({ step }) {
  return (
    <ol className={styles.stepper}>
      {STEPS.map((s, i) => (
        <li key={s} className={i <= step ? styles.on : ''}>
          <motion.span animate={{ scale: i === step ? 1.12 : 1, backgroundColor: i < step ? '#3fa66b' : i === step ? '#f54e00' : '#e5e7e0' }}>
            {i < step ? <Check size={16} /> : i + 1}
          </motion.span>
          <b>{s}</b>
          {i < STEPS.length - 1 && <div className={styles.line}><motion.i animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.5 }} /></div>}
        </li>
      ))}
    </ol>
  )
}

const slide = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.28 } }

/** Майстер імпорту: 1) вибір набору й файлу, 2) перевірка даних, 3) аналіз із прогресом. */
export default function ImportWizard() {
  const navigate = useNavigate()
  const toast = useToast()
  const inputRef = useRef(null)
  const sets = useAsync(() => api.listSets(), [])

  const [step, setStep] = useState(0)
  const [setId, setSetId] = useState('')
  const [file, setFile] = useState(null) // { name, size, rows, skipped }
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const readFile = async (f) => {
    setError('')
    if (!/\.(csv|txt)$/i.test(f.name)) return setError('Підтримуються лише файли CSV та TXT')
    if (f.size > MAX_SIZE) return setError('Файл перевищує 10 МБ')
    const parsed = parseReviews(await f.text(), f.name)
    if (!parsed.rows.length) return setError('У файлі не знайдено жодного коректного відгуку')
    setFile({ name: f.name, size: f.size, blob: f, ...parsed })
  }
  const useSample = () => {
    setError('')
    const name = 'приклад_відгуків.txt'
    setFile({ name, size: SAMPLE.length, blob: new File([SAMPLE], name, { type: 'text/plain' }), ...parseReviews(SAMPLE, name) })
  }

  const next = () => {
    if (step === 0) {
      if (!setId) return setError('Оберіть набір відгуків')
      if (!file) return setError('Додайте файл із відгуками')
      setError('')
    }
    setStep(step + 1)
  }

  const start = async () => {
    setStep(2)
    setProgress(0)
    try {
      await api.importFile(Number(setId), file.blob) // POST /sets/{id}/import (multipart)
      const r = await api.analyzeSet(Number(setId), setProgress) // POST /sets/{id}/analyze
      setResult(r)
      toast('Імпорт і аналіз завершено')
    } catch (e) {
      toast(e.message, 'error')
      setStep(1)
    }
  }

  const reset = () => { setStep(0); setFile(null); setResult(null); setProgress(0) }

  return (
    <>
      <PageHeader hand="три кроки до результату" title="Імпорт та аналіз відгуків" subtitle="Завантажте файл CSV або TXT — система очистить тексти, визначить тональність і теми." />
      <Card className={styles.wrap}>
        <Stepper step={step} />
        <div className={styles.stage}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" {...slide} className={styles.pane}>
                <Field as="select" label="Набір відгуків" value={setId} onChange={(e) => { setSetId(e.target.value); setError('') }}>
                  <option value="">— оберіть набір —</option>
                  {sets.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Field>
                <div
                  className={`${styles.drop} ${drag ? styles.dragOn : ''} ${file ? styles.hasFile : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".csv,.txt" hidden onChange={(e) => e.target.files[0] && readFile(e.target.files[0])} />
                  {file ? (
                    <><FileText size={34} /><b>{file.name}</b><span>{file.rows.length} відгуків готово до імпорту</span></>
                  ) : (
                    <><UploadCloud size={38} /><b>Перетягніть файл сюди або натисніть</b><span>CSV або TXT, до 10 МБ</span></>
                  )}
                </div>
                <button className={styles.sample} onClick={useSample}><Wand2 size={15} /> Використати приклад файлу</button>
                {error && <p className={styles.err} role="alert"><AlertTriangle size={16} /> {error}</p>}
                <div className={styles.btns}><Button onClick={next}>Далі</Button></div>
              </motion.div>
            )}

            {step === 1 && file && (
              <motion.div key="s1" {...slide} className={styles.pane}>
                <div className={styles.summary}>
                  <div><b>{file.rows.length}</b><span>відгуків буде імпортовано</span></div>
                  <div><b>{file.skipped}</b><span>рядків пропущено (порожні або надто короткі)</span></div>
                  <div><b>{sets.data?.find((s) => s.id === Number(setId))?.name}</b><span>цільовий набір</span></div>
                </div>
                <h4 className={styles.sub}>Попередній перегляд</h4>
                <ul className={styles.preview}>
                  {file.rows.slice(0, 5).map((t, i) => <li key={i}><em>{i + 1}</em>{t}</li>)}
                </ul>
                <div className={styles.btns}>
                  <Button variant="ghost" onClick={() => setStep(0)}>Назад</Button>
                  <Button icon={Sparkles} onClick={start}>Імпортувати та проаналізувати</Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" {...slide} className={`${styles.pane} ${styles.center}`}>
                <Mascot mood={result ? 'happy' : 'neutral'} size={110} float={!result} />
                {!result ? (
                  <>
                    <h3>Аналізуємо відгуки…</h3>
                    <div className={styles.progress}><motion.i animate={{ width: `${progress}%` }} /></div>
                    <p className={styles.muted}>{progress < 40 ? 'Очищення та токенізація тексту' : progress < 75 ? 'Визначення тональності' : 'Виявлення тем і ключових слів'} · {progress}%</p>
                  </>
                ) : (
                  <>
                    <h3>Готово!</h3>
                    <p className={styles.muted}>Оброблено {result.analyzed} нових відгуків. Результати вже доступні в наборі.</p>
                    <div className={styles.btns}>
                      <Button variant="secondary" onClick={reset}>Ще один файл</Button>
                      <Button onClick={() => navigate(`/app/sets/${setId}`)}>Переглянути результати</Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </>
  )
}
