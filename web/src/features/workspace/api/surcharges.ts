import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client'

/** Hourly surcharge (dopłata) paid on top of the base rate; managed by an admin */
export type Surcharge = {
  id: string
  name: string
  ratePerHour: number
  validFrom: string
  /** null = no end date */
  validTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SurchargePayload = {
  name: string
  ratePerHour: number
  validFrom: string
  validTo: string | null
  isActive: boolean
}

export function fetchSurcharges(): Promise<Surcharge[]> {
  return apiGet<Surcharge[]>('/surcharges')
}

export function createSurcharge(payload: SurchargePayload): Promise<Surcharge> {
  return apiPost<Surcharge>('/surcharges', payload)
}

export function updateSurcharge(id: string, payload: Partial<SurchargePayload>): Promise<Surcharge> {
  return apiPatch<Surcharge>(`/surcharges/${id}`, payload)
}

export function deleteSurcharge(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/surcharges/${id}`)
}
