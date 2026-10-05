import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { SENTIMENTS } from '../data/seed'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Tabs from '../components/ui/Tabs'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import { Pill } from '../components/ui/Badge'
import styles from './Reports.module.css'

/** Завантажує CSV-звіт із сервера (GET /reports/{id}/download) і зберігає його як файл. */
async function downloadCsv(report) {
  const blob = await api.downloadReport(report.id)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `report_${report.setName}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Друкована версія звіту (збереження у PDF виконується засобами браузера). */
function Preview({ report, onClose }) {
  const data = useAsync(async () => (report ? { stats: await api.getStats(report.setId), rows: await api.getReportRows(report.setId) } : null), [report?.id])
  const d = data.data
  return (
    <Modal open={!!report} onClose={onClose} title={`Звіт: ${report?.setName || ''}`} wide>
      {!d ? <Skeleton h={220} r={12} /> : (
        <>
          <div className="print-area">
            <h2 className={styles.pTitle}>Звіт про аналіз відгуків</h2>
            <p className={styles.pMeta}>Набір: <b>{report.setName}</b> · сформовано {report.created.split('-').reverse().join('.')} · автор: {report.author}</p>
            <div className={styles.pStats}>
              {Object.entries(d.stats.sentiments).map(([k, v]) => <div key={k}><b style={{ color: SENTIMENTS[k].hex }}>{v}</b><span>{SENTIMENTS[k].short}</span></div>)}
              <div><b>{Math.round(d.stats.avgConfidence * 100)}%</b><span>сер. впевненість</span></div>
            </div>
            <h4>Теми</h4>
            <table className={styles.pTable}>
              <thead><tr><th>Тема</th><th>Відгуків</th><th>Негативних</th></tr></thead>
              <tbody>{d.stats.topics.map((t) => <tr key={t.topic}><td>{t.topic}</td><td>{t.total}</td><td>{t.negative}</td></tr>)}</tbody>
            </table>
            <h4>Приклади негативних відгуків</h4>
            <ul className={styles.pList}>{d.rows.filter((r) => r.analysis.sentiment === 'negative').slice(0, 6).map((r) => <li key={r.id}>{r.text}</li>)}</ul>
          </div>
          <div className={styles.pBtns}>
            <Button variant="ghost" onClick={onClose}>Закрити</Button>
            <Button icon={Printer} onClick={() => window.print()}>Зберегти як PDF</Button>
          </div>
        </>
      )}
    </Modal>
  )
}

/** Звіти: формування (CSV / PDF) та історія раніше створених звітів. */
export default function Reports() {
  const toast = useToast()
    const sets = useAsync(() => api.listSets(), [])
  const reports = useAsync(() => api.listReports(), [])
  const [setId, setSetId] = useState('')
  const [format, setFormat] = useState('csv')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)

  const create = async (e) => {
    e.preventDefault()
    if (!setId) return setError('Оберіть набір відгуків')
    setError('')
    setBusy(true)
    try {
      const rep = await api.createReport({ setId: Number(setId), format, }) // POST /sets/{id}/report
      toast(`Звіт ${format.toUpperCase()} сформовано`)
      reports.reload()
      if (format === 'csv') await download({ ...rep, setName: sets.data.find((s) => s.id === rep.setId).name })
      else setPreview({ ...rep, setName: sets.data.find((s) => s.id === rep.setId).name })
    } catch (err) {
      setError(err.fields?.setId || err.message)
    } finally {
      setBusy(false)
    }
  }

  const download = async (r) => {
    if (r.format === 'pdf') return setPreview(r)
    try {
      await downloadCsv(r)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <>
      <PageHeader title="Звіти" subtitle="Експортуйте результати аналізу у CSV або збережіть PDF-звіт для команди." />
      <div className={styles.layout}>
        <Card accent className={styles.form}>
          <h3>Новий звіт</h3>
          <form onSubmit={create} noValidate>
            <Field as="select" label="Набір відгуків" value={setId} error={error} onChange={(e) => { setSetId(e.target.value); setError('') }}>
              <option value="">— оберіть набір —</option>
              {sets.data?.filter((s) => s.analyzed > 0).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Field>
            <div className={styles.fmt}>
              <span>Формат</span>
              <Tabs value={format} onChange={setFormat} items={[{ value: 'csv', label: 'CSV' }, { value: 'pdf', label: 'PDF' }]} />
            </div>
            <motion.div key={format} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={styles.note}>
              {format === 'csv' ? <><FileSpreadsheet size={18} /> Таблиця з усіма відгуками, тональністю, темами та ключовими словами.</> : <><FileText size={18} /> Короткий звіт зі статистикою, темами та прикладами негативних відгуків.</>}
            </motion.div>
            <Button type="submit" loading={busy} icon={Download}>Сформувати звіт</Button>
          </form>
        </Card>

        <Card>
          <h3 className={styles.hist}>Історія звітів</h3>
          {reports.loading ? <Skeleton h={120} r={12} /> : (
            <ul className={styles.list}>
              {reports.data.map((r, i) => (
                <motion.li key={r.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <span className={styles.ico} style={{ background: r.format === 'pdf' ? 'var(--orange-soft)' : 'var(--green-soft)' }}>{r.format === 'pdf' ? <FileText size={20} /> : <FileSpreadsheet size={20} />}</span>
                  <div>
                    <b>{r.setName}</b>
                    <small>{r.created.split('-').reverse().join('.')} · {r.author}</small>
                  </div>
                  <Pill tone={r.format === 'pdf' ? 'orange' : 'green'}>{r.format.toUpperCase()}</Pill>
                  <Button variant="secondary" size="sm" icon={r.format === 'pdf' ? Printer : Download} onClick={() => download(r)}>{r.format === 'pdf' ? 'Відкрити' : 'Завантажити'}</Button>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Preview report={preview} onClose={() => setPreview(null)} />
    </>
  )
}
