import { motion } from 'framer-motion'

/** Кільцева діаграма (SVG). Кожен сегмент «малюється» анімацією stroke-dasharray. */
export default function Donut({ data, size = 190, thickness = 26, children }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const offsets = data.reduce((acc, d, i) => [...acc, i ? acc[i - 1] + (data[i - 1].value / total) * c : 0], [])
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Розподіл тональності">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * c
          const offset = offsets[i]
          return (
            <motion.circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ strokeDasharray: `0 ${c}` }}
              animate={{ strokeDasharray: `${Math.max(0, len - 3)} ${c}` }}
              transition={{ duration: 1, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
            />
          )
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}
