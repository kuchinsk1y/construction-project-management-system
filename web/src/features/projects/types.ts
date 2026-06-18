export type ProjectStatus = 'planning' | 'active' | 'blocked' | 'done'

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

export type ProjectItem = {
  id: string
  name: string
  status: ProjectStatus
  owner: string
  budget: number
  progress: number
  startDate: string
  endDate: string
  dueDate: string
  priority: string
  health: string
  location: string
  country: string
  contractor: string
  projectType: string
  dokumentationUrl: string | null
}
