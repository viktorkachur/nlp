import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Gauge, Hash, MessageSquareText, Smile } from 'lucide-react'
import { api } from '../api/mockApi'
import { useAsync } from '../hooks/useAsync'
import { useCountUp } from '../hooks/useCountUp'
import { SENTIMENTS } from '../data/seed'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Field from '../components/ui/Field'
import Skeleton from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import Mascot from '../components/brand/Mascot'
import Donut from '../components/charts/Donut'
import LineChart from '../components/charts/LineChart'
import TopicBars from '../components/charts/TopicBars'
import KeywordCloud from '../components/charts/KeywordCloud'
import Sparkline from '../components/charts/Sparkline'
import styles from './Dashboard.module.css'

function Stat({ icon: Icon, label, value, suffix = '', decimals = 0, color, spark }) {
  const v = useCountUp(value)
  return (
    <Card lift className={styles.stat}>
      <span className={styles.statIcon} style={{ background: color }}><Icon size={20} /></span>
      <div>
        <p className={styles.statLabel}>{label}</p>
        <b className={styles.statValue}>{v.toFixed(decimals)}{suffix}</b>
      </div>
      <div className={styles.spark}><Sparkline values={spark} color={color} /></div>
    </Card>
  )
}

/** Головна панель: статистика аналізу відгуків з графіками (дані з фейкового API). */
export default function Dashboard() {
  const [setId, setSetId] = useState('all')
  const navigate = useNavigate()
  const sets = useAsync(() => api.listSets(), [])
  const stats = useAsync(() => api.getStats(setId === 'all' ? 'all' : Number(setId)), [setId])

  const s = stats.data
  const share = (k) => (s && s.total ? Math.round((s.sentiments[k] / s.total) * 100) : 0)
  const worst = s?.topics.filter((t) => t.topic !== 'Без теми').sort((a, b) => b.negative / b.total - a.negative / a.total)[0]
  const mood = !s ? 'neutral' : share('positive') >= 50 ? 'happy' : share('negative') > 40 ? 'sad' : 'neutral'

  return (
    <>
      <PageHeader
        hand="привіт! ось що думають ваші користувачі"
        title="Огляд аналізу"
        subtitle="Тональність, теми та ключові слова за вибраним набором відгуків."
        actions={
          <Field as="select" value={setId} onChange={(e) => setSetId(e.target.value)} aria-label="Набір відгуків" className={styles.select}>
            <option value="all">Усі набори</option>
            {sets.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Field>
        }
      />

      {stats.error ? (
        <Card><p>Не вдалося завантажити статистику.</p><Button variant="secondary" onClick={stats.reload}>Спробувати ще раз</Button></Card>
      ) : stats.loading || !s ? (
        <div className={styles.grid4}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={96} r={14} />)}</div>
      ) : (
        <>
          <div className={styles.grid4}>
            <Stat icon={MessageSquareText} label="Проаналізовано відгуків" value={s.total} color="var(--blue)" spark={s.weeks.map((w) => w.positive + w.neutral + w.negative)} />
            <Stat icon={Smile} label="Позитивних" value={share('positive')} suffix="%" color="var(--green)" spark={s.weeks.map((w) => w.positive)} />
            <Stat icon={Gauge} label="Середня впевненість" value={s.avgConfidence * 100} suffix="%" color="var(--orange)" spark={[62, 70, 68, 76, 81, 79, 84, s.avgConfidence * 100]} />
            <Stat icon={Hash} label="Виявлено тем" value={s.topics.filter((t) => t.topic !== 'Без теми').length} color="#b86e00" spark={[3, 4, 4, 5, 5, 5, 6, s.topics.length]} />
          </div>

          <div className={styles.row2}>
            <Card>
              <h3 className={styles.h}>Розподіл тональності</h3>
              <div className={styles.donutRow}>
                <Donut data={Object.entries(s.sentiments).map(([k, v]) => ({ label: k, value: v, color: SENTIMENTS[k].hex }))}>
                  <div><b className={styles.donutNum}>{s.total}</b><span className={styles.donutCap}>відгуків</span></div>
                </Donut>
                <ul className={styles.legend}>
                  {Object.entries(s.sentiments).map(([k, v]) => (
                    <li key={k}><i style={{ background: SENTIMENTS[k].hex }} /><span>{SENTIMENTS[k].short}</span><b>{share(k)}%</b><em>{v}</em></li>
                  ))}
                </ul>
              </div>
            </Card>
            <Card>
              <h3 className={styles.h}>Динаміка відгуків за тижнями</h3>
              <LineChart weeks={s.weeks} />
            </Card>
          </div>

          <div className={styles.row2b}>
            <Card>
              <h3 className={styles.h}>Теми відгуків</h3>
              <TopicBars topics={s.topics} onSelect={() => navigate('/app/sets')} />
            </Card>
            <Card>
              <h3 className={styles.h}>Ключові слова</h3>
              <KeywordCloud words={s.keywords} />
            </Card>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card accent className={styles.insight}>
              <Mascot mood={mood} size={84} float />
              <div>
                <span className={`hand ${styles.insightHand}`}>висновок від системи</span>
                <p>
                  {share('positive')}% відгуків позитивні.{' '}
                  {worst ? <>Найбільше невдоволення викликає тема <b>«{worst.topic}»</b>: {Math.round((worst.negative / worst.total) * 100)}% негативних відгуків. Рекомендуємо приділити їй увагу в першу чергу.</> : 'Критичних тем не виявлено.'}
                </p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </>
  )
}
