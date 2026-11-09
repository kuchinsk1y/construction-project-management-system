import { readSession, writeSession, type Session } from './session'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Called when the session can no longer be renewed (refresh rejected): the app goes back to sign-in */
let onSessionEnded: () => void = () => {}
export function setSessionEndedHandler(handler: () => void) {
  onSessionEnded = handler
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text }
    }
  }
  if (!response.ok) {
    const raw = (body as { message?: unknown } | null)?.message
    const message = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : 'Coś poszło nie tak. Spróbuj ponownie.'
    throw new ApiError(response.status, message)
  }
  return body as T
}

async function send<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.')
  }
  return parse<T>(response)
}

// --- Sign-in (no token) ---

export type Tokens = { accessToken: string; refreshToken: string; expiresAt: string }

export const authApi = {
  sendCode: (phone: string) => send<{ message: string }>('/brigade/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyCode: (phone: string, code: string) =>
    send<Tokens>('/brigade/auth/verify-code', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  logout: (refreshToken: string) =>
    send<void>('/brigade/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => undefined),
}

// --- Authorized requests with token renewal ---

/**
 * One refresh at a time: the server rotates refresh tokens, so a second parallel refresh
 * with the old token would end the session. Parallel 401s wait for the same promise.
 */
let refreshing: Promise<Session | null> | null = null

function refreshSession(): Promise<Session | null> {
  refreshing ??= (async () => {
    const current = readSession()
    if (!current) return null
    try {
      const tokens = await send<Tokens>('/brigade/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
      writeSession(tokens)
      return tokens
    } catch (error) {
      // Rejected by the server (expired / revoked): sign out. A network error keeps the session.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        writeSession(null)
        onSessionEnded()
        return null
      }
      throw error
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession()
  if (!session) {
    onSessionEnded()
    throw new ApiError(401, 'Sesja wygasła. Zaloguj się ponownie.')
  }
  try {
    return await send<T>(path, init, session.accessToken)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const renewed = await refreshSession()
    if (!renewed) throw new ApiError(401, 'Sesja wygasła. Zaloguj się ponownie.')
    return send<T>(path, init, renewed.accessToken)
  }
}

export type Me = { id: number; firstName: string; lastName: string; phone: string; roles: string[] }

export type CountItem = { name: string; count: number }

export type Pulpit = {
  generatedAt: string
  today: string
  workers: {
    total: number
    ispikPolska: { count: number; positions: CountItem[] }
    ispikLotwa: { count: number; positions: CountItem[] }
    agencies: { count: number; companies: CountItem[]; positions: CountItem[] }
  } | null
  activity: {
    latestEntryDate: string | null
    daysWithoutEntry: number | null
    days: Array<{ date: string; filled: boolean; workers: number; hours: number }>
  } | null
  projects: Array<{ id: string; name: string; city: string; status: string; departments: string[] }>
  warnings: string[]
}

export type RowKind = 'work' | 'extra' | 'day_off' | 'vacation' | 'sick' | 'dismissed' | 'absence' | 'penalty'

export type WorkLog = {
  from: string
  to: string
  source: 'sheets' | 'erp'
  generatedAt: string
  days: Array<{
    date: string
    status: null
    totals: { workers: number; hours: number }
    workers: Array<{
      worker: { id: string | null; name: string; company: string | null }
      hours: number
      rating: number | null
      rows: Array<{
        project: { id: string | null; name: string } | null
        workType: { id: string | null; name: string; kind: RowKind }
        hours: number
        surcharge: { ratePerHour: number } | null
        note: string | null
      }>
    }>
  }>
}

export type HoursReport = {
  month: string
  prevMonth: string | null
  nextMonth: string | null
  dates: string[]
  overtimeThreshold: number
  source: 'sheets' | 'erp'
  generatedAt: string
  filters: { companies: string[]; company: string | null }
  totals: { workers: number; hours: number }
  workers: Array<{
    key: string
    id: string | null
    name: string
    company: string | null
    hours: Array<number | null>
    marks: Array<'U' | 'C' | 'W' | 'Z' | 'A' | 'K' | null>
    total: number
  }>
}

export type WorkTypeOption = { id: string; name: string; unit: string | null; department: string | null }
export type KindOption = { name: string; kind: RowKind }

export type DayForm = {
  date: string
  isFriday: boolean
  alreadyFilled: boolean
  generatedAt: string
  crew: Array<{
    key: string
    id: string
    name: string
    company: string
    position: string
    rate: number | null
    status: 'vacation' | 'dismissed' | null
    lastRating: number | null
  }>
  projects: Array<{ id: string; name: string; city: string | null; isService: boolean; workTypes: WorkTypeOption[] }>
  serviceKinds: KindOption[]
  foremanKinds: KindOption[]
  surcharges: Array<{ id: string; name: string; ratePerHour: number }>
  warnings: string[]
}

export const brigadeApi = {
  me: () => apiRequest<Me>('/brigade/me'),
  pulpit: (fresh = false) => apiRequest<Pulpit>(`/brigade/pulpit${fresh ? '?fresh=1' : ''}`),
  workLog: (fresh = false) => apiRequest<WorkLog>(`/brigade/work-log${fresh ? '?fresh=1' : ''}`),
  dayForm: (date: string) => apiRequest<DayForm>(`/brigade/day-form?date=${encodeURIComponent(date)}`),
  hoursReport: (month: string, company: string | null, fresh = false) => {
    const q = new URLSearchParams({ month })
    if (company) q.set('company', company)
    if (fresh) q.set('fresh', '1')
    return apiRequest<HoursReport>(`/brigade/hours-report?${q}`)
  },
}
