import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Універсальний хук для асинхронних запитів до (фейкового) REST API.
 * Стан: data / loading / error. Повертає reload() для повторного завантаження.
 * Запобігає оновленню стану після розмонтування та «гонці» запитів.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const run = useRef(0)

  const load = useCallback(() => {
    const id = ++run.current
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => id === run.current && setState({ data, loading: false, error: null }))
      .catch((error) => id === run.current && setState({ data: null, loading: false, error }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
    return () => { run.current++ }
  }, [load])

  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) }
}
