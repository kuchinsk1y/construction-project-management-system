import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client'
import type { ApiContractor, CreateContractorPayload, UpdateContractorPayload } from './types'

export function fetchContractors(): Promise<ApiContractor[]> {
  return apiGet<ApiContractor[]>('/contractors')
}

export function createContractor(payload: CreateContractorPayload): Promise<ApiContractor> {
  return apiPost<ApiContractor>('/contractors', payload)
}

export function updateContractor(id: string, payload: UpdateContractorPayload): Promise<ApiContractor> {
  return apiPatch<ApiContractor>(`/contractors/${id}`, payload)
}

export function deleteContractor(id: string): Promise<void> {
  return apiDelete<void>(`/contractors/${id}`)
}
