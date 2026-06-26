export type ApiContractor = {
  id: string
  name: string
  tax_number: string | null
  created_at?: string
  updated_at?: string
}

export type CreateContractorPayload = {
  name: string
  tax_number?: string
}

export type UpdateContractorPayload = Partial<CreateContractorPayload>
