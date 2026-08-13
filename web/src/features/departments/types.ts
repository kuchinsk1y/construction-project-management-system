export type ApiDepartment = {
  id: number
  name: string
  description: string | null
  icon: string
  is_active: boolean
}

export type CreateDepartmentPayload = {
  name: string
  description?: string
  icon?: string
  is_active?: boolean
}

export type UpdateDepartmentPayload = {
  name?: string
  description?: string
  icon?: string
  is_active?: boolean
}
