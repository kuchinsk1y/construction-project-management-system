import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/constants/storage'
import { isAccessTokenValid } from '@/lib/auth-token'

function resolveBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// Shared so parallel requests trigger only one refresh
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readStorage(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null

  try {
    const response = await fetch(`${resolveBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) return null

    const tokens = (await response.json()) as { accessToken?: string; refreshToken?: string }
    if (!tokens.accessToken || !tokens.refreshToken) return null

    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    return tokens.accessToken
  } catch {
    return null
  }
}

/** Returns a non-expired access token, refreshing it when needed; null when logged out. */
async function getAccessToken(): Promise<string | null> {
  const token = readStorage(ACCESS_TOKEN_KEY)
  if (isAccessTokenValid(token)) return token

  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: unknown = {}
  const text = await response.text()

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text }
    }
  }

  if (!response.ok) {
    let message = 'Niepowodzenie zadania'
    const errorBody = body as { message?: unknown; error?: unknown }
    if (typeof errorBody.message === 'string') {
      message = errorBody.message
    } else if (Array.isArray(errorBody.message)) {
      message = errorBody.message.join(', ')
    } else if (typeof errorBody.error === 'string') {
      message = errorBody.error
    }
    throw new Error(message)
  }

  return body as T
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  })
  return parseResponse<T>(response)
}

export async function apiPost<T>(path: string, payload: object): Promise<T> {
  // Auth endpoints manage tokens themselves
  const headers = path.startsWith('/auth/')
    ? { 'Content-Type': 'application/json' }
    : await authHeaders({ 'Content-Type': 'application/json' })

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  return parseResponse<T>(response)
}

export async function apiPatch<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  return parseResponse<T>(response)
}

export async function apiPut<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'PUT',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  return parseResponse<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'DELETE',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
  })

  return parseResponse<T>(response)
}
