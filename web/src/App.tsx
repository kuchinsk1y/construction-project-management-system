import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  Bell,
  FolderKanban,
  Home,
  LayoutGrid,
  Mail,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Search,
  Settings,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

type ScreenState = 'checking' | 'email' | 'code' | 'dashboard'

type VerifyResponse = {
  accessToken: string
  refreshToken: string
}

type ThemeMode = 'light' | 'dark'

const ACCESS_TOKEN_KEY = 'erp_access_token'
const REFRESH_TOKEN_KEY = 'erp_refresh_token'
const THEME_KEY = 'erp_theme'

function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

function parseJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    const parsed = JSON.parse(decoded) as { exp?: number }
    return typeof parsed.exp === 'number' ? parsed.exp : null
  } catch {
    return null
  }
}

function isAccessTokenValid(token: string | null): boolean {
  if (!token) return false
  const exp = parseJwtExp(token)
  if (!exp) return false
  return exp * 1000 > Date.now()
}

async function apiPost<T>(path: string, payload: object): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : 'Request failed'
    throw new Error(message)
  }

  return body as T
}

function Dashboard({
  onLogout,
  theme,
  onToggleTheme,
}: {
  onLogout: () => void
  theme: ThemeMode
  onToggleTheme: () => void
}) {
  const navItems = [
    { label: 'Dashboard', icon: Home, active: true },
    { label: 'Projects', icon: FolderKanban },
    { label: 'Teams', icon: Users },
    { label: 'Board', icon: LayoutGrid },
    { label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] md:flex md:flex-col">
          <div className="border-b border-[var(--sidebar-border)] px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
              ERP
            </p>
            <h1 className="mt-1 text-xl font-semibold">Workspace</h1>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
                ].join(' ')}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-[var(--sidebar-border)] p-3">
            <Button className="w-full" variant="default">
              <Plus size={16} />
              New Project
            </Button>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <Button size="icon-sm" variant="outline" className="md:hidden">
                <Menu size={16} />
              </Button>
              <p className="text-sm text-[var(--muted-foreground)]">Welcome back</p>
              <h2 className="text-lg font-semibold">Project Overview</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Search">
                <Search size={16} />
              </Button>
              <Button variant="outline" size="icon-sm" aria-label="Notifications">
                <Bell size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Toggle theme"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
              <Button size="sm" variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </header>

          <section className="grid flex-1 gap-4 p-4 md:grid-cols-2 md:gap-6 md:p-6 xl:grid-cols-3">
            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">Active projects</p>
              <p className="mt-2 text-3xl font-semibold">12</p>
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">Tasks this week</p>
              <p className="mt-2 text-3xl font-semibold">84</p>
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:col-span-2 xl:col-span-1">
              <p className="text-sm text-[var(--muted-foreground)]">Team workload</p>
              <p className="mt-2 text-3xl font-semibold">73%</p>
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:col-span-2 xl:col-span-3">
              <h3 className="text-base font-semibold">Recent activity</h3>
              <ul className="mt-4 space-y-3 text-sm text-[var(--muted-foreground)]">
                <li>Design team updated wireframes for Client Portal.</li>
                <li>Backend merged API endpoint for sprint planning.</li>
                <li>QA started regression tests for release 0.0.2.</li>
              </ul>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [screen, setScreen] = useState<ScreenState>('checking')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    const initialTheme: ThemeMode =
      savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'

    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  useEffect(() => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

    if (isAccessTokenValid(accessToken)) {
      setScreen('dashboard')
      return
    }

    if (!refreshToken) {
      setScreen('email')
      return
    }

    void (async () => {
      try {
        const tokens = await apiPost<VerifyResponse>('/auth/refresh', {
          refreshToken,
        })
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
        setScreen('dashboard')
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        setScreen('email')
      }
    })()
  }, [])

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!normalizedEmail) {
      setError('Введите email')
      return
    }

    setIsLoading(true)
    try {
      const result = await apiPost<{ message: string }>('/auth/send-code', {
        email: normalizedEmail,
      })
      setMessage(result.message || 'Код отправлен на почту')
      setScreen('code')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Не удалось отправить код')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (code.trim().length !== 6) {
      setError('Код должен содержать 6 символов')
      return
    }

    setIsLoading(true)
    try {
      const tokens = await apiPost<VerifyResponse>('/auth/verify-code', {
        email: normalizedEmail,
        code: code.trim().toUpperCase(),
      })

      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
      setScreen('dashboard')
      setCode('')
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Неверный или просроченный код')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      try {
        await apiPost('/auth/logout', { refreshToken })
      } catch {
        // Best-effort logout: clear tokens even if API request fails.
      }
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setEmail('')
    setCode('')
    setMessage('')
    setError('')
    setScreen('email')
  }

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem(THEME_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  if (screen === 'checking') {
    return (
      <div className="auth-shell">
        <div className="auth-orb auth-orb-a" />
        <div className="auth-orb auth-orb-b" />
        <div className="auth-loader">Проверяем авторизацию...</div>
      </div>
    )
  }

  if (screen === 'dashboard') {
    return <Dashboard onLogout={handleLogout} theme={theme} onToggleTheme={handleToggleTheme} />
  }

  return (
    <div className="auth-shell">
      <div className="auth-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />
      <div className="auth-orb auth-orb-c" />

      <div className="auth-card">
        <div className="auth-badge mx-auto">
          <ShieldCheck size={14} />
          Bezpieczny dostęp
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white text-center">Logowanie</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] text-center">
          {screen === 'email' ? 'Podaj swój adres e-mail.' : `Kod został wysłany na ${normalizedEmail}. Wprowadź go poniżej.`}
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs">
          <span className={screen === 'email' ? 'auth-step auth-step-active' : 'auth-step'}>1. Email</span>
          <span className={screen === 'code' ? 'auth-step auth-step-active' : 'auth-step'}>2. Kod</span>
        </div>

        {message ? <p className="auth-alert auth-alert-success">{message}</p> : null}
        {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

        {screen === 'email' ? (
          <form className="mt-6 space-y-4" onSubmit={handleSendCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <Button type="submit" className="auth-submit text-white pt-6 pb-6" disabled={isLoading}>
              {isLoading ? 'Wysyłanie...' : 'Uzyskaj kod'}
              <ArrowRight size={16} />
            </Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleVerifyCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="code">Kod z email</label>
              <div className="auth-input-wrap">
                <ShieldCheck size={16} className="auth-input-icon" />
                <input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  minLength={6}
                  maxLength={6}
                  required
                  className="auth-input auth-code-input"
                  placeholder="ABC123"
                />
              </div>
            </div>

            <Button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? 'Sprawdzanie...' : 'Zaloguj się do pulpitu'}
              <ArrowRight size={16} />
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setScreen('email')
                setCode('')
                setMessage('')
                setError('')
              }}
            >
              Zmień email
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default App
