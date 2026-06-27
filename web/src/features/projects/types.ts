export type ProjectStatus = 'planning' | 'active' | 'blocked' | 'done'

export type ApiMilestone = {
  id: string
  projectId: string
  milestoneNo: string
  description: string
  percentage: number
  netAmount: number
  invoicingPercentage: number | null
  createdAt?: string
  updatedAt?: string
}

export type CreateMilestonePayload = {
  milestoneNo: string
  description: string
  percentage: number
  invoicingPercentage?: number
}

export type ApiDepartment = {
  id: number
  name: string
}

export type ApiForemanUser = {
  id: number
  firstName: string
  lastName: string
}

export type ApiWorkType = {
  id: string
  projectId: string
  milestoneId: string
  milestoneNo: string
  departmentId: number
  departmentName: string
  name: string
  unit: string | null
  totalQuantity: number
  plannedStart: string | null
  plannedEnd: string | null
}

export type CreateWorkTypePayload = {
  milestoneId: string
  departmentId: number
  name: string
  unit?: string
  totalQuantity?: number
  plannedStart?: string
  plannedEnd?: string
}

export type ApiForemanAssignment = {
  id: string
  projectId: string
  departmentId: number
  departmentName: string
  foremanId: number
  foremanName: string
}

export type ApiResourcePlan = {
  id: string
  workTypeId: string
  plannedWorkers: number
  dateFrom: string | null
  dateTo: string | null
}

export type CreateResourcePlanPayload = {
  plannedWorkers: number
  dateFrom?: string
  dateTo?: string
}

// ---- DB (API) types ----

export type ApiContractor = {
  id: string
  name: string
}

export type ApiProjectType = {
  id: number
  name: string
  code: string
}

export type ApiProject = {
  id: string
  name: string
  status: string
  country: string
  city: string
  start_date_contract: string | null
  end_date_contract: string | null
  start_date_fact: string | null
  end_date_fact: string | null
  contract_net_value: string | null
  currency: string | null
  contractors: ApiContractor | null
  project_types: ApiProjectType | null
  manager: { id: number; firstName: string; lastName: string } | null
}

export type CreateProjectPayload = {
  name: string
  contractorId: string
  projectTypeId: number
  country: string
  city: string
  status?: string
  currency?: string
  contractNetValue?: number
  startDateContract?: string
  endDateContract?: string
  startDateFact?: string
  endDateFact?: string
  managerId?: number
}

// ---- UI display type ----

export type ProjectItem = {
  id: string
  name: string
  status: ProjectStatus
  owner: string
  budget: number
  progress: number
  startDate: string
  endDate: string
  startDateFact: string
  endDateFact: string
  dueDate: string
  priority: string
  health: string
  location: string
  country: string
  contractor: string
  projectType: string
  dokumentationUrl: string | null
}

// ---- Mapping ----

function mapDbStatus(raw: string): ProjectStatus {
  const s = raw.toUpperCase()
  if (s === 'ACTIVE') return 'active'
  if (s === 'ON_HOLD') return 'blocked'
  if (s === 'COMPLETED' || s === 'DONE' || s === 'ARCHIVED') return 'done'
  return 'planning'
}

export function mapApiProjectToItem(p: ApiProject): ProjectItem {
  const managerName = p.manager
    ? `${p.manager.firstName} ${p.manager.lastName}`.trim()
    : 'Nieprzypisany'

  return {
    id: p.id,
    name: p.name,
    status: mapDbStatus(p.status),
    owner: managerName,
    budget: p.contract_net_value ? parseFloat(p.contract_net_value) : 0,
    progress: 0,
    startDate: p.start_date_contract ?? '',
    endDate: p.end_date_contract ?? '',
    startDateFact: p.start_date_fact ?? '',
    endDateFact: p.end_date_fact ?? '',
    dueDate: p.end_date_contract ?? 'Brak terminu',
    priority: p.project_types?.code ?? 'Ogolny',
    health: 'Zgodnie z planem',
    location: `${p.city}, ${p.country}`,
    country: p.country,
    contractor: p.contractors?.name ?? '-',
    projectType: p.project_types?.name ?? '-',
    dokumentationUrl: null,
  }
}

// kept for backwards compat if anywhere still imports ApiProjectRow
export type ApiProjectRow = {
  id: string | null
  contractor: string | null
  project: string | null
  location: string | null
  dateFrom: string | null
  dateTo: string | null
  projectType: string | null
  pin: string | null
  manager: string | null
  power: string | null
  dokumentationUrl: string | null
  country: string | null
  status: string | null
  dateFromFact: string | null
  dateToFact: string | null
}
