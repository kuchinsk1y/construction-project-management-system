import type { FormEvent } from 'react'
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ScreenState } from '@/types/auth'

type AuthScreenProps = {
  screen: ScreenState
  normalizedEmail: string
  email: string
  code: string
  message: string
  error: string
  isLoading: boolean
  onEmailChange: (value: string) => void
  onCodeChange: (value: string) => void
  onSendCode: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onVerifyCode: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onBackToEmail: () => void
}

export function AuthScreen({
  screen,
  normalizedEmail,
  email,
  code,
  message,
  error,
  isLoading,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerifyCode,
  onBackToEmail,
}: AuthScreenProps) {
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

        <h1 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">Logowanie</h1>
        <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
          {screen === 'email' ? 'Podaj swój adres e-mail.' : `Kod został wysłany na ${normalizedEmail}. Wprowadź go poniżej.`}
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs">
          <span className={screen === 'email' ? 'auth-step auth-step-active' : 'auth-step'}>1. Email</span>
          <span className={screen === 'code' ? 'auth-step auth-step-active' : 'auth-step'}>2. Kod</span>
        </div>

        {message ? <p className="auth-alert auth-alert-success">{message}</p> : null}
        {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

        {screen === 'email' ? (
          <form className="mt-6 space-y-4" onSubmit={onSendCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">
                Email
              </label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  autoComplete="email"
                  required
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <Button type="submit" className="auth-submit pb-6 pt-6 text-white" disabled={isLoading}>
              {isLoading ? 'Wysyłanie...' : 'Uzyskaj kod'}
              <ArrowRight size={16} />
            </Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onVerifyCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="code">
                Kod z email
              </label>
              <div className="auth-input-wrap">
                <ShieldCheck size={16} className="auth-input-icon" />
                <input
                  id="code"
                  value={code}
                  onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
                  minLength={6}
                  maxLength={6}
                  required
                  className="auth-input auth-code-input"
                  placeholder="ABC123"
                />
              </div>
            </div>

            <Button type="submit" className="auth-submit text-white" disabled={isLoading}>
              {isLoading ? 'Sprawdzanie...' : 'Zaloguj się do pulpitu'}
              <ArrowRight size={16} />
            </Button>

            <Button type="button" variant="outline" className="w-full text-white" onClick={onBackToEmail}>
              Zmień email
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
