import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { AppShell } from '@/components/AppShell'
import { DayFormPage } from '@/pages/DayFormPage'
import { HoursReportPage } from '@/pages/HoursReportPage'
import { LoginPage } from '@/pages/LoginPage'
import { PulpitPage } from '@/pages/PulpitPage'
import { WorkLogPage } from '@/pages/WorkLogPage'

/** Signed-in pages share the sidebar; without a session → sign-in */
function SignedIn() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function AppRoutes() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<SignedIn />}>
        <Route path="/" element={<PulpitPage />} />
        <Route path="/dziennik" element={<WorkLogPage />} />
        <Route path="/dziennik/nowy" element={<DayFormPage />} />
        <Route path="/raport" element={<HoursReportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
