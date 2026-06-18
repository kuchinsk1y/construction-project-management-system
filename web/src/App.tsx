import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, THEME_KEY, THEME_PRESET_KEY } from '@/constants/storage'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CheckingScreen } from '@/features/auth/CheckingScreen'
import { WorkspaceShell } from '@/features/workspace/WorkspaceShell'
import { apiPost } from '@/lib/api-client'
import { applyTheme, isAccessTokenValid, profileFromToken } from '@/lib/auth-token'
import type { ScreenState, ThemeMode, ThemePreset, UserProfile, VerifyResponse } from '@/types/auth'

function resolveInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_KEY)
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveInitialThemePreset(): ThemePreset {
  const savedPreset = localStorage.getItem(THEME_PRESET_KEY)
  if (savedPreset === 'lime' || savedPreset === 'mono' || savedPreset === 'ocean') return savedPreset
  return 'lime'
}

function resolveInitialSession(): { screen: ScreenState; profile: UserProfile | null; refreshToken: string | null } {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

  if (isAccessTokenValid(accessToken)) {
    return {
      screen: 'projects',
      profile: profileFromToken(accessToken),
      refreshToken,
    }
  }

  return {
    screen: refreshToken ? 'checking' : 'email',
    profile: null,
    refreshToken,
  }
}

function App() {
  const { t } = useTranslation()
  const initialSession = resolveInitialSession()
  const [theme, setTheme] = useState<ThemeMode>(resolveInitialTheme)
  const [themePreset, setThemePreset] = useState<ThemePreset>(resolveInitialThemePreset)
  const [profile, setProfile] = useState<UserProfile | null>(initialSession.profile)
  const [screen, setScreen] = useState<ScreenState>(initialSession.screen)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])

  useEffect(() => {
    applyTheme(theme, themePreset)
  }, [theme, themePreset])

  useEffect(() => {
    if (screen !== 'checking') return

    const refreshToken = initialSession.refreshToken
    if (!refreshToken) {
      queueMicrotask(() => setScreen('email'))
      return
    }

    void (async () => {
      try {
        const tokens = await apiPost<VerifyResponse>('/auth/refresh', {
          refreshToken,
        })
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
        setProfile(profileFromToken(tokens.accessToken))
        setScreen('projects')
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        setProfile(null)
        setScreen('email')
      }
    })()
  }, [screen, initialSession.refreshToken])

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!normalizedEmail) return setError(t('app.validation.emailRequired'))

    setIsLoading(true)
    try {
      const result = await apiPost<{ message: string }>('/auth/send-code', {
        email: normalizedEmail,
      })
      setMessage(result.message || t('app.auth.codeSent'))
      setScreen('code')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t('app.auth.sendFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (code.trim().length !== 6) return setError(t('app.validation.codeLength'))

    setIsLoading(true)
    try {
      const tokens = await apiPost<VerifyResponse>('/auth/verify-code', {
        email: normalizedEmail,
        code: code.trim().toUpperCase(),
      })

      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
      setProfile(profileFromToken(tokens.accessToken))
      setScreen('projects')
      setCode('')
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t('app.auth.verifyFailed'))
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
    setProfile(null)
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
    applyTheme(nextTheme, themePreset)
  }

  const handleThemePresetChange = (preset: ThemePreset) => {
    setThemePreset(preset)
    localStorage.setItem(THEME_PRESET_KEY, preset)
    applyTheme(theme, preset)
  }

  if (screen === 'checking') return <CheckingScreen />
  if (screen === 'projects') {
    return (
      <WorkspaceShell
        onLogout={handleLogout}
        theme={theme}
        themePreset={themePreset}
        onThemePresetChange={handleThemePresetChange}
        onToggleTheme={handleToggleTheme}
        profile={profile}
      />
    )
  }

  return (
    <AuthScreen
      screen={screen}
      normalizedEmail={normalizedEmail}
      email={email}
      code={code}
      message={message}
      error={error}
      isLoading={isLoading}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onSendCode={handleSendCode}
      onVerifyCode={handleVerifyCode}
      onBackToEmail={() => {
        setScreen('email')
        setCode('')
        setMessage('')
        setError('')
      }}
    />
  )
}

export default App
