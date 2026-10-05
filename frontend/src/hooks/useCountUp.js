import { useEffect, useState } from 'react'

/** Плавне «наростання» числа від 0 до target (для карток статистики). */
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}
