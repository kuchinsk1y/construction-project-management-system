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
}

export type UserProfile = {
  firstName: string
  lastName: string
  email: string
}

export type ThemeMode = 'light' | 'dark'
