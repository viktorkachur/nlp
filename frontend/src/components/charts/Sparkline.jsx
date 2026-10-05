import { motion } from 'framer-motion'

/** Міні-графік для карток статистики. */
export default function Sparkline({ values, color = 'var(--orange)', w = 110, h = 36 }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const pts = values.map((v, i) => [(i * (w - 4)) / (values.length - 1) + 2, h - 3 - ((v - min) / (max - min || 1)) * (h - 8)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.4" fill={color} />
    </svg>
  )
}
