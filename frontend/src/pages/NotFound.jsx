import Button from '../components/ui/Button'
import Mascot from '../components/brand/Mascot'

/** Сторінка 404. */
export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Mascot mood="sad" size={130} float />
        <h1 style={{ fontSize: 72 }}>404</h1>
        <p style={{ color: 'var(--ink-2)' }}>Такої сторінки не існує. Можливо, посилання застаріло.</p>
        <Button to="/">На головну</Button>
      </div>
    </div>
  )
}
