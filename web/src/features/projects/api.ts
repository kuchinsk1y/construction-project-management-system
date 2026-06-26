import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client'
import type {
  ApiContractor,
  ApiProject,
  ApiProjectType,
  CreateProjectPayload,
  ApiMilestone,
  CreateMilestonePayload,
  ApiDepartment,
  ApiForemanUser,
  ApiWorkType,
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

// --- Foremen Assignments ---

export function fetchForemenAssignments(projectId: string): Promise<ApiForemanAssignment[]> {
  return apiGet<ApiForemanAssignment[]>(`/projects/${projectId}/foremen`)
}

export function assignForeman(
  projectId: string,
  departmentId: number,
  foremanId: number,
): Promise<{ id: string }> {
  return apiPost<{ id: string }>(`/projects/${projectId}/foremen`, {
    departmentId,
    foremanId,
  })
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
