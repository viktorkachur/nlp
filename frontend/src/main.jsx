import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import '@fontsource-variable/onest'
import '@fontsource/caveat/600.css'
import './styles/tokens.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

// HashRouter — щоб маршрути працювали на статичному хостингу (GitHub Pages) без налаштування сервера
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
