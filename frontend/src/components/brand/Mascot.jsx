import { motion } from 'framer-motion'

// Рот змінюється залежно від настрою (всі шляхи мають однакову структуру Q — тому анімуються плавно)
const MOUTH = {
  happy: 'M27 41 Q40 55 53 41',
  neutral: 'M29 46 Q40 46 51 46',
  sad: 'M28 51 Q40 39 52 51',
}
const FILL = { happy: '#f9bd2b', neutral: '#e5e7e0', sad: '#ffb4a2' }

/** Талісман-«бульбашка відгуку»: змінює вираз обличчя відповідно до тональності. */
export default function Mascot({ mood = 'happy', size = 120, float = false }) {
  return (
    <motion.svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      aria-hidden="true"
      animate={float ? { y: [0, -8, 0], rotate: [-2, 2, -2] } : undefined}
      transition={float ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
      whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.6 } }}
    >
      <motion.path
        d="M14 8 H66 a8 8 0 0 1 8 8 V52 a8 8 0 0 1 -8 8 H42 L28 73 V60 H14 a8 8 0 0 1 -8 -8 V16 a8 8 0 0 1 8 -8 z"
        stroke="#151515"
        strokeWidth="2.4"
        strokeLinejoin="round"
        animate={{ fill: FILL[mood] }}
        transition={{ duration: 0.4 }}
      />
      <g style={{ transformOrigin: '40px 28px', animation: 'blink 4.5s infinite' }}>
        <circle cx="29" cy="28" r="3.2" fill="#151515" />
        <circle cx="51" cy="28" r="3.2" fill="#151515" />
      </g>
      {mood === 'happy' && (
        <>
          <circle cx="21" cy="38" r="3.4" fill="#f54e00" opacity="0.35" />
          <circle cx="59" cy="38" r="3.4" fill="#f54e00" opacity="0.35" />
        </>
      )}
      <motion.path d={MOUTH.happy} animate={{ d: MOUTH[mood] }} transition={{ duration: 0.4 }} stroke="#151515" strokeWidth="3" strokeLinecap="round" fill="none" />
      <style>{`@keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }`}</style>
    </motion.svg>
  )
}
