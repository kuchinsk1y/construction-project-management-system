/** Brigade session kept in the browser; it ends at 23:59 (Warsaw) on the day of sign-in */
export type Session = {
  accessToken: string
  refreshToken: string
  /** ISO time when the session ends */
  expiresAt: string
}

const KEY = 'brigade_session'

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    // A new day means a new sign-in
    if (!session.accessToken || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: the session lives only in memory */
  }
}

/** Data carried in the access token (decoded locally, no request needed) */
export type TokenUser = { id: number; firstName: string; lastName: string; phone: string; roles: string[] }

export function userFromToken(token: string): TokenUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub: number
      firstName?: string
      lastName?: string
      phone?: string
      roles?: string[]
    }
    // atob gives Latin-1 bytes: turn them back into UTF-8 text (Polish letters)
    const fix = (value?: string) => (value ? decodeURIComponent(escape(value)) : '')
    return {
      id: payload.sub,
      firstName: fix(payload.firstName),
      lastName: fix(payload.lastName),
      phone: payload.phone ?? '',
      roles: payload.roles ?? [],
    }
  } catch {
    return null
  }
}
