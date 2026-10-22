export type UserRole =
  | 'admin'
  | 'operational_director'
  | 'financial_director'
  | 'project_manager'
  | 'foreman'
  | 'contractor'

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
  /** Why the user can't be deleted (linked projects/history), null when deletion is allowed */
  deleteBlockedReason?: string | null
}

export type CreateUserPayload = {
  email: string
  firstName: string
  lastName: string
  middleNames?: string | null
  position: string
  phoneNumber: string
  telegramId?: string | null
  roles: string[]
  isActive?: boolean
}

export type UpdateUserPayload = Partial<CreateUserPayload>
