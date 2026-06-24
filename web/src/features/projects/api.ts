import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { ApiContractor, ApiProject, ApiProjectType, CreateProjectPayload } from '@/features/projects/types'

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
