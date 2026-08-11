export type ApiDepartment = {
  id: number
  name: string
  description: string | null
  is_active: boolean
}

export type CreateDepartmentPayload = {
  name: string
  description?: string
  is_active?: boolean
}

export type UpdateDepartmentPayload = {
  name?: string
  description?: string
  is_active?: boolean
}
