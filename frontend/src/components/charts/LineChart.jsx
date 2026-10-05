import { useState } from 'react'
import { motion } from 'framer-motion'
import { SENTIMENTS } from '../../data/seed'
import styles from './Charts.module.css'

const W = 640
const H = 240
const PAD = { l: 34, r: 12, t: 14, b: 28 }

/** Лінійний графік динаміки відгуків за тижнями (SVG + анімація «малювання» ліній). */
export default function LineChart({ weeks }) {
  const [hover, setHover] = useState(null)
  const keys = ['positive', 'neutral', 'negative']
  const max = Math.max(4, ...weeks.flatMap((w) => keys.map((k) => w[k])))
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (weeks.length - 1)
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const path = (k) => weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w[k]).toFixed(1)}`).join(' ')
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t))

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (weeks.length - 1))
    setHover(Math.min(weeks.length - 1, Math.max(0, i)))
  }

  return (
    <div className={styles.lineWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.line} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Динаміка відгуків за тижнями">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="4 5" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t}</text>
          </g>
        ))}
        {weeks.map((w, i) => (
          <text key={w.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{w.label}</text>
        ))}
        <defs>
          <linearGradient id="areaPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fa66b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3fa66b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={`${path('positive')} L${x(weeks.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="url(#areaPos)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }} />
        {keys.map((k, n) => (
          <motion.path key={k} d={path(k)} fill="none" stroke={SENTIMENTS[k].hex} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.15 * n, ease: 'easeInOut' }} />
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink)" strokeOpacity="0.25" />
            {keys.map((k) => <circle key={k} cx={x(hover)} cy={y(weeks[hover][k])} r="5" fill="#fff" stroke={SENTIMENTS[k].hex} strokeWidth="3" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className={styles.tip} style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>Тиждень {weeks[hover].label.slice(1)}</b>
          {keys.map((k) => <span key={k}><i style={{ background: SENTIMENTS[k].hex }} />{SENTIMENTS[k].short}: {weeks[hover][k]}</span>)}
        </div>
      )}
    </div>
  )
}
