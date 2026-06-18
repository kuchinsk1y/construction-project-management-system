export type ScreenState = 'checking' | 'email' | 'code' | 'projects'

export type VerifyResponse = {
  accessToken: string
  refreshToken: string
}

export type JwtPayload = {
  exp?: number
  email?: string
  firstName?: string | null
  lastName?: string | null
  role?: string | null
  roles?: string[] | null
}

export type UserProfile = {
  firstName: string
  lastName: string
  email: string
  role?: string
  roles: string[]
}

export type ThemeMode = 'light' | 'dark'

export type ThemePreset = 'lime' | 'mono' | 'ocean'
