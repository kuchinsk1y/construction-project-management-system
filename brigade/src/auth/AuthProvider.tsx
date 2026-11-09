import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, setSessionEndedHandler, type Tokens } from '@/lib/api'
import { readSession, userFromToken, writeSession, type Session, type TokenUser } from '@/lib/session'

type AuthState = {
  session: Session | null
  user: TokenUser | null
  signIn: (tokens: Tokens) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession())

  useEffect(() => {
    setSessionEndedHandler(() => setSession(null))
  }, [])

  // The session ends at 23:59: sign out exactly then, even if the page stays open
  useEffect(() => {
    if (!session) return
    const ms = new Date(session.expiresAt).getTime() - Date.now()
    const timer = window.setTimeout(() => {
      writeSession(null)
      setSession(null)
    }, Math.max(0, Math.min(ms, 2_147_000_000)))
    return () => window.clearTimeout(timer)
  }, [session])

  const signIn = useCallback((tokens: Tokens) => {
    writeSession(tokens)
    setSession(tokens)
  }, [])

  const signOut = useCallback(async () => {
    const current = readSession()
    writeSession(null)
    setSession(null)
    if (current) await authApi.logout(current.refreshToken)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ session, user: session ? userFromToken(session.accessToken) : null, signIn, signOut }),
    [session, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
