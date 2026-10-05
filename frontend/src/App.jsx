import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Landing from './pages/landing/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Sets from './pages/Sets'
import SetDetail from './pages/SetDetail'
import ImportWizard from './pages/ImportWizard'
import Reports from './pages/Reports'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

/** Карта маршрутів застосунку (відповідає карті навігації з звіту). */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="sets" element={<Sets />} />
        <Route path="sets/:id" element={<SetDetail />} />
        <Route path="import" element={<ImportWizard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
