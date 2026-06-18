import type { FormEvent } from 'react'
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  return (
    <div className="auth-shell">
      <div className="auth-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />
      <div className="auth-orb auth-orb-c" />

      <div className="auth-card">
        <div className="auth-badge mx-auto">
          <ShieldCheck size={14} />
          {t('auth.secureAccess')}
        </div>

        <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight text-white">{t('auth.signIn')}</h1>
        <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
          {screen === 'email' ? t('auth.emailPrompt') : t('auth.codePrompt', { email: normalizedEmail })}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <span className={screen === 'email' ? 'auth-step auth-step-active' : 'auth-step'}>{t('auth.steps.email')}</span>
          <span className={screen === 'code' ? 'auth-step auth-step-active' : 'auth-step'}>{t('auth.steps.code')}</span>
        </div>

        {message ? <p className="auth-alert auth-alert-success">{message}</p> : null}
        {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

        {screen === 'email' ? (
          <form className="mt-5 space-y-3" onSubmit={onSendCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">{t('auth.labels.email')}</label>
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
                  placeholder={t('auth.placeholders.email')}
                />
              </div>
            </div>

            <Button type="submit" className="auth-submit text-white" disabled={isLoading}>
              {isLoading ? t('auth.actions.sending') : t('auth.actions.getCode')}
              <ArrowRight size={16} />
            </Button>
          </form>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={onVerifyCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="code">{t('auth.labels.code')}</label>
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
                  placeholder={t('auth.placeholders.code')}
                />
              </div>
            </div>

            <Button type="submit" className="auth-submit text-white" disabled={isLoading}>
              {isLoading ? t('auth.actions.checking') : t('auth.actions.login')}
              <ArrowRight size={16} />
            </Button>

            <Button type="button" variant="outline" className="w-full text-white" onClick={onBackToEmail}>{t('auth.actions.changeEmail')}</Button>
          </form>
        )}
      </div>
    </div>
  )
}
