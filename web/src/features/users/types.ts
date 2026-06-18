export type UserRole =
  | 'admin'
  | 'operational_director'
  | 'financial_director'
  | 'project_manager'
  | 'viewer'
  | 'foreman'
  | 'user'

export type ApiUser = {
  id: number
  email: string
  firstName: string
  lastName: string
  middleNames: string | null
  position: string
  phoneNumber: string
  telegramId: string | null
  isActive: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
}

export type CreateUserPayload = {
  email: string
  firstName: string
  lastName: string
  middleNames?: string
  position: string
  phoneNumber: string
  telegramId?: string
  roles: string[]
  isActive?: boolean
}

export type UpdateUserPayload = Partial<CreateUserPayload>
