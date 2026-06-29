export type ApiContractor = {
  id: string
  name: string
  tax_number: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export type CreateContractorPayload = {
  name: string
  tax_number?: string
  street?: string
  postal_code?: string
  city?: string
  country?: string
  notes?: string
}

export type UpdateContractorPayload = Partial<CreateContractorPayload>
