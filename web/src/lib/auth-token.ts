import type { JwtPayload, ThemeMode, ThemePreset, UserProfile } from '@/types/auth'

export function applyTheme(mode: ThemeMode, preset: ThemePreset = 'lime'): void {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.dataset.theme = preset
}

export function parseJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    const parsed = JSON.parse(decoded) as JwtPayload
    return typeof parsed.exp === 'number' ? parsed.exp : null
  } catch {
    return null
  }
}

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function profileFromToken(token: string | null): UserProfile | null {
  if (!token) return null
  const payload = parseJwtPayload(token)
  if (!payload) return null

  const firstName = (payload.firstName ?? '').trim() || 'Uzytkownik'
  const lastName = (payload.lastName ?? '').trim()
  const email = (payload.email ?? '').trim().toLowerCase()
  const role = (payload.role ?? '').trim().toLowerCase()
  const rolesFromToken = Array.isArray(payload.roles)
    ? payload.roles.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim().toLowerCase())
    : []
  const roles = role ? Array.from(new Set([role, ...rolesFromToken])) : rolesFromToken

  return {
    firstName,
    lastName,
    email,
    role: role || undefined,
    roles,
  }
}

export function isAccessTokenValid(token: string | null): boolean {
  if (!token) return false
  const exp = parseJwtExp(token)
  if (!exp) return false
  return exp * 1000 > Date.now()
}
