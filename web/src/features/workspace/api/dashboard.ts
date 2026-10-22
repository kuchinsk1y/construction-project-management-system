import { apiGet } from '@/lib/api-client'

export type DashboardProjectStatus = 'active' | 'planning' | 'blocked' | 'done'

type MoneyBucket = { count: number; net: number }

export type DashboardSummary = {
  generatedAt: string
  kpis: {
    totalProjects: number
    activeProjects: number
    blockedProjects: number
    worksInProgress: number
    worksLate: number
    invoiceRequests: number
    invoiceRequestsNet: number
    hoursThisWeek: number
    hoursLastWeek: number
  }
  projects: Array<{
    id: string
    name: string
    contractor: string | null
    status: DashboardProjectStatus
    progress: number | null
    lateWorks: number
    endDate: string | null
  }>
  invoices: {
    paid: MoneyBucket
    issued: MoneyBucket
    requested: MoneyBucket
    overdue: MoneyBucket
    attention: Array<{
      id: string
      number: string | null
      projectId: string
      projectName: string
      milestoneNo: string
      net: number
      currency: string
      kind: 'overdue' | 'due_soon' | 'request'
      days: number
    }>
  }
  settlement: { total: number; paid: number; invoicedNotPaid: number; remaining: number }
  projectProgress: Record<string, number | null>
  hoursByWeek: Array<{ weekStart: string; label: string; hours: number; isCurrent: boolean }>
  upcoming: Array<{
    workId: string
    projectId: string
    projectName: string
    name: string
    milestoneNo: string | null
    plannedEnd: string | null
    progress: number
    started: boolean
  }>
  recentReports: Array<{
    id: string
    date: string | null
    projectId: string
    projectName: string
    workId: string
    workName: string
    department: string | null
    unit: string | null
    quantity: number
    workers: number | null
    hours: number | null
  }>
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/dashboard/summary')
}
