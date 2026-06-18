import { apiGet, apiPatch, apiPost } from '@/lib/api-client'

import type { ApiUser, CreateUserPayload, UpdateUserPayload } from '@/features/users/types'

export function fetchUsers(): Promise<ApiUser[]> {
  return apiGet<ApiUser[]>('/users')
}

export function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  return apiPost<ApiUser>('/users', payload)
}

export function updateUser(id: number, payload: UpdateUserPayload): Promise<ApiUser> {
  return apiPatch<ApiUser>(`/users/${id}`, payload)
}
