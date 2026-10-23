import { apiDelete, apiGet, apiGetBlob, apiPatch, apiPost, apiPostForm, apiPut } from '@/lib/api-client'
import type {
  ApiContractor,
  ApiProject,
  ApiProjectType,
  CreateProjectPayload,
  ApiMilestone,
  CreateMilestonePayload,
  CreateMilestoneInvoicePayload,
  ApiMilestoneInvoice,
  ApiInvoice,
  UpdateInvoicePayload,
  ApiDepartment,
  ApiProjectDepartment,
  ApiForemanUser,
  ApiWorkType,
  ApiWorkTypeDailyReport,
  ResolvedLocation,
  CreateWorkTypePayload,
  ApiForemanAssignment,
  ApiResourcePlan,
  CreateResourcePlanPayload,
} from '@/features/projects/types'

export function fetchProjects(): Promise<ApiProject[]> {
  return apiGet<ApiProject[]>('/projects')
}

export function createProject(payload: CreateProjectPayload): Promise<ApiProject> {
  return apiPost<ApiProject>('/projects', payload)
}

export function updateProject(
  id: string,
  payload: Partial<CreateProjectPayload>,
): Promise<ApiProject> {
  return apiPut<ApiProject>(`/projects/${id}`, payload)
}

export function deleteProject(id: string): Promise<void> {
  return apiDelete<void>(`/projects/${id}`)
}

export function fetchContractors(): Promise<ApiContractor[]> {
  return apiGet<ApiContractor[]>('/projects/reference/contractors')
}

export function fetchProjectTypes(): Promise<ApiProjectType[]> {
  return apiGet<ApiProjectType[]>('/projects/reference/project-types')
}

// --- Milestones ---

export function fetchMilestones(projectId: string): Promise<ApiMilestone[]> {
  return apiGet<ApiMilestone[]>(`/projects/${projectId}/milestones`)
}

export function createMilestone(
  projectId: string,
  payload: CreateMilestonePayload,
): Promise<ApiMilestone> {
  return apiPost<ApiMilestone>(`/projects/${projectId}/milestones`, payload)
}

export function updateMilestone(
  id: string,
  payload: Partial<CreateMilestonePayload>,
): Promise<ApiMilestone> {
  return apiPut<ApiMilestone>(`/projects/milestones/${id}`, payload)
}

export function deleteMilestone(id: string): Promise<void> {
  return apiDelete<void>(`/projects/milestones/${id}`)
}

export function createMilestoneInvoice(
  milestoneId: string,
  payload: CreateMilestoneInvoicePayload,
): Promise<ApiMilestoneInvoice> {
  return apiPost<ApiMilestoneInvoice>(`/projects/milestones/${milestoneId}/invoices`, payload)
}

export function updateMilestoneInvoice(
  milestoneId: string,
  invoiceId: string,
  payload: Partial<CreateMilestoneInvoicePayload>,
): Promise<ApiMilestoneInvoice> {
  return apiPut<ApiMilestoneInvoice>(`/projects/milestones/${milestoneId}/invoices/${invoiceId}`, payload)
}

export function deleteMilestoneInvoice(
  milestoneId: string,
  invoiceId: string,
): Promise<void> {
  return apiDelete<void>(`/projects/milestones/${milestoneId}/invoices/${invoiceId}`)
}

// --- Departments & Foremen Reference ---

export function fetchDepartments(): Promise<ApiDepartment[]> {
  return apiGet<ApiDepartment[]>('/projects/reference/departments')
}

export function fetchForemen(): Promise<ApiForemanUser[]> {
  return apiGet<ApiForemanUser[]>('/projects/reference/foremen')
}

// --- Work Types ---

export function fetchWorkTypes(projectId: string): Promise<ApiWorkType[]> {
  return apiGet<ApiWorkType[]>(`/projects/${projectId}/work-types`)
}

export function createWorkType(
  projectId: string,
  payload: CreateWorkTypePayload,
): Promise<ApiWorkType> {
  return apiPost<ApiWorkType>(`/projects/${projectId}/work-types`, payload)
}

export function updateWorkType(
  id: string,
  payload: Partial<CreateWorkTypePayload>,
): Promise<ApiWorkType> {
  return apiPut<ApiWorkType>(`/projects/work-types/${id}`, payload)
}

export function deleteWorkType(id: string): Promise<void> {
  return apiDelete<void>(`/projects/work-types/${id}`)
}

// --- Project Departments ---

export function fetchProjectDepartments(projectId: string): Promise<ApiProjectDepartment[]> {
  return apiGet<ApiProjectDepartment[]>(`/projects/${projectId}/departments`)
}

export function addProjectDepartment(projectId: string, departmentId: number): Promise<ApiProjectDepartment> {
  return apiPost<ApiProjectDepartment>(`/projects/${projectId}/departments`, { departmentId })
}

export function removeProjectDepartment(projectId: string, departmentId: number): Promise<void> {
  return apiDelete<void>(`/projects/${projectId}/departments/${departmentId}`)
}

// --- Foremen Assignments ---

export function fetchForemenAssignments(projectId: string): Promise<ApiForemanAssignment[]> {
  return apiGet<ApiForemanAssignment[]>(`/projects/${projectId}/foremen`)
}

export function bulkAssignForemen(
  projectId: string,
  assignments: { departmentId: number; foremanIds: number[] }[],
): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>(`/projects/${projectId}/foremen`, {
    assignments,
  })
}

export function batchSyncDepartments(
  projectId: string,
  payload: import('@/features/projects/types').BatchSyncDepartmentsPayload
): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>(`/projects/${projectId}/departments/batch-sync`, payload)
}

// --- Resource Plans ---

export function fetchResourcePlans(workTypeId: string): Promise<ApiResourcePlan[]> {
  return apiGet<ApiResourcePlan[]>(`/projects/work-types/${workTypeId}/resource-plans`)
}

export function createResourcePlan(
  workTypeId: string,
  payload: CreateResourcePlanPayload,
): Promise<ApiResourcePlan> {
  return apiPost<ApiResourcePlan>(`/projects/work-types/${workTypeId}/resource-plans`, payload)
}

export function deleteResourcePlan(id: string): Promise<void> {
  return apiDelete<void>(`/projects/resource-plans/${id}`)
}

// ---- Cost Categories & Planned Expenses ----

import type { ApiCostCategory, CreateCostCategoryPayload, ApiPlannedExpense, CreatePlannedExpensePayload } from '@/features/projects/types'

export function getCostCategories(): Promise<ApiCostCategory[]> {
  return apiGet<ApiCostCategory[]>('/cost-categories')
}

export function createCostCategory(payload: CreateCostCategoryPayload): Promise<ApiCostCategory> {
  return apiPost<ApiCostCategory>('/cost-categories', payload)
}

export function getPlannedExpenses(projectId: string): Promise<ApiPlannedExpense[]> {
  return apiGet<ApiPlannedExpense[]>(`/projects/${projectId}/planned-expenses`)
}

export function createPlannedExpense(projectId: string, payload: CreatePlannedExpensePayload): Promise<ApiPlannedExpense> {
  return apiPost<ApiPlannedExpense>(`/projects/${projectId}/planned-expenses`, payload)
}

export function updatePlannedExpense(projectId: string, id: string, payload: Partial<CreatePlannedExpensePayload>): Promise<ApiPlannedExpense> {
  return apiPut<ApiPlannedExpense>(`/projects/${projectId}/planned-expenses/${id}`, payload)
}

export function deletePlannedExpense(projectId: string, id: string): Promise<void> {
  return apiDelete<void>(`/projects/${projectId}/planned-expenses/${id}`)
}

// --- Hours Plan ---

export type HoursPlanResponse = {
  averageHourlyRate: number | null
  plannedHoursTotal: number | null
  totalSalaryBudget: number
  /** Contract value and additional works (RD) the salary budget is based on */
  contractNetValue?: number
  additionalWorksValue?: number
  distributions: { workTypeId: string; percentage: number }[]
}

export function fetchHoursPlan(projectId: string): Promise<HoursPlanResponse> {
  return apiGet<HoursPlanResponse>(`/projects/${projectId}/hours-plan`)
}

export function updateHoursPlan(
  projectId: string,
  payload: { averageHourlyRate: number; distributions: { workTypeId: string; percentage: number }[] }
): Promise<HoursPlanResponse> {
  return apiPut<HoursPlanResponse>(`/projects/${projectId}/hours-plan`, payload)
}

export function searchFakturowniaInvoices(query: string, country?: string): Promise<any[]> {
  let url = `/projects/fakturownia/invoices?query=${encodeURIComponent(query)}`
  if (country) {
    url += `&country=${encodeURIComponent(country)}`
  }
  return apiGet<any[]>(url)
}

export function fetchWorkTypeDailyReports(workTypeId: string): Promise<ApiWorkTypeDailyReport[]> {
  return apiGet<ApiWorkTypeDailyReport[]>(`/projects/work-types/${workTypeId}/daily-reports`)
}

/** Coordinates + place name from a Google Maps link or "lat, lng" text */
export function resolveLocation(input: string): Promise<ResolvedLocation> {
  return apiGet<ResolvedLocation>(`/geo/resolve?input=${encodeURIComponent(input)}`)
}

export type AttendanceStatus = 'not_marked' | 'open' | 'close_requested' | 'closed' | 'auto_closed' | 'absent'

export type AttendanceTotals = {
  members: number
  present: number
  absent: number
  notMarked: number
  closed: number
}

export type AttendanceMember = {
  externalId: string
  name: string
  position: string | null
  status: AttendanceStatus
  checkInAt: string | null
  checkInMethod: 'qr' | 'manual' | 'self' | null
  manualReason: string | null
  absenceReason: { code: string; name: string } | null
  absenceComment: string | null
  closeRequestedAt: string | null
  closedAt: string | null
  closeMethod: string | null
  workDescription: string | null
  distanceToSiteM: number | null
}

export type AttendanceBrigade = {
  id: number
  name: string
  projectId: string | null
  foreman: { externalId: string; name: string } | null
  lastSessionAt: string | null
  members: AttendanceMember[]
  totals: AttendanceTotals
}

export type AttendanceLive = {
  date: string
  generatedAt: string
  brigades: AttendanceBrigade[]
  totals: AttendanceTotals
}

/** Checked in and not finished yet */
export function isOnSite(status: AttendanceStatus) {
  return status === 'open' || status === 'close_requested'
}

/** Who is on site today: live check-ins from TMA (proxied and cached by the API) */
export function fetchProjectAttendance(projectId: string): Promise<AttendanceLive> {
  return apiGet<AttendanceLive>(`/attendance/live?projectId=${encodeURIComponent(projectId)}`)
}

export function fetchProjectInvoices(projectId: string): Promise<ApiInvoice[]> {
  return apiGet<ApiInvoice[]>(`/projects/${projectId}/invoices`)
}

/** Closes works with an acceptance protocol; creates invoice requests in every affected milestone */
export function createInvoiceProtocol(
  projectId: string,
  data: { allocations: { milestoneId: string; percent: number }[]; workIds: string[]; issuedDate?: string; note?: string },
  protocol: File,
): Promise<ApiInvoice> {
  const form = new FormData()
  form.append('data', JSON.stringify(data))
  form.append('protocol', protocol)
  return apiPostForm<ApiInvoice>(`/projects/${projectId}/invoices`, form)
}

export function updateInvoice(id: string, payload: UpdateInvoicePayload): Promise<ApiInvoice> {
  return apiPatch<ApiInvoice>(`/invoices/${id}`, payload)
}

export function deleteInvoice(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/invoices/${id}`)
}

export function fetchInvoiceProtocol(id: string): Promise<Blob> {
  return apiGetBlob(`/invoices/${id}/protocol`)
}
