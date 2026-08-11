import { useState, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AlertCircle, Folder, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  createProject,
  deleteProject,
  fetchContractors,
  fetchProjectTypes,
  updateProject,
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/features/projects/api'
import { useProjectsQuery } from '@/features/projects/useProjectsQuery'
import {
  mapApiProjectToItem,
  type ApiProject,
  type CreateMilestonePayload,
  type CreateProjectPayload,
  type ProjectStatus,
} from '@/features/projects/types'

import { apiGet } from '@/lib/api-client'
import { ProjectsFilterBar } from './components/ProjectsFilterBar'
import { ProjectsTableView, type ViewMode, type SortColumn, type SortDirection } from './components/ProjectsTableView'
import { ProjectsGanttView } from './components/ProjectsGanttView'
import { ProjectDetailsDrawer } from './components/ProjectDetailsDrawer'

// Helper formatters
function formatDate(value: string | undefined | null, fallback = ''): string {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return fallback
  const date = parseDateValue(value)
  if (!date) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}.${month}.${year}`
}

function parseDateValue(value: string): Date | null {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return null
  const gvizMatch = value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,[^)]*)?\)$/)
  const date = gvizMatch
    ? new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3]))
    : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatBudget(value: number, currencyCode = 'PLN'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode || 'PLN',
    maximumFractionDigits: 0,
  }).format(value)
}

function statusTone(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500'
    case 'planning':
    case 'draft':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-500'
    case 'blocked':
    case 'on_hold':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-500'
    case 'done':
    case 'completed':
      return 'border-blue-500/25 bg-blue-500/10 text-blue-500'
    default:
      return 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
  }
}

function statusLabel(status: ProjectStatus, t: TFunction): string {
  switch (status) {
    case 'active':
      return t('projects.status.active')
    case 'planning':
      return t('projects.status.planning')
    case 'blocked':
      return t('projects.status.blocked')
    case 'done':
      return t('projects.status.done')
  }
}

const emptyForm: CreateProjectPayload = {
  name: '',
  contractorId: '',
  projectTypeId: 0,
  country: '',
  city: '',
  status: 'DRAFT',
  currency: 'PLN',
  contractNetValue: undefined,
  startDateContract: '',
  endDateContract: '',
  startDateFact: '',
  endDateFact: '',
  managerId: undefined,
  power: undefined,
  dokumentationUrl: '',
  pinUrl: '',
  vatRate: undefined,
  warrantyPercent: undefined,
  warrantyMonths: undefined,
  paymentTermDays: undefined,
  holdReason: '',
  holdStartedAt: '',
  expectedResumeDate: '',
}

type UserProfile = {
  role?: string
  roles?: string[]
}

type ProjectsShowcaseProps = {
  profile: UserProfile | null
}

export function ProjectsShowcase({ profile }: ProjectsShowcaseProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Queries
  const { data: rawProjects = [], isLoading, isError, error } = useProjectsQuery()
  const { data: contractors = [], isLoading: contractorsLoading } = useQuery({
    queryKey: ['contractors-ref'], // separate key from ContractorsPage ['contractors'] — different endpoint, partial data only
    queryFn: fetchContractors,
  })

  const { data: rawProjectTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: fetchProjectTypes,
  })
  const projectTypes = useMemo(() => {
    return rawProjectTypes.filter((pt) => ['PV', 'MAGAZYN_ENERGII'].includes(pt.code))
  }, [rawProjectTypes])
  const { data: users = [] } = useQuery<Array<{ id: number; firstName: string; lastName: string; position?: string; roles?: string[] }>>({
    queryKey: ['users'],
    queryFn: () => apiGet<Array<{ id: number; firstName: string; lastName: string; position?: string; roles?: string[] }>>('/users'),
  })

  const projects = useMemo(() => rawProjects.map(mapApiProjectToItem), [rawProjects])

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('active')
  const handleSetStatusFilter = (val: 'all' | ProjectStatus) => {
    setStatusFilter(val)
  }
  const [managerFilter, setManagerFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('schedule')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Drawer / Form state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formState, setFormState] = useState<CreateProjectPayload>(emptyForm)
  const [formError, setFormError] = useState('')
  const [contractorSearch, setContractorSearch] = useState('')
  const [showContractorList, setShowContractorList] = useState(false)
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const contractorRef = useRef<HTMLDivElement>(null)

  // Milestones State & Mutations
  const [activeTab, setActiveTab] = useState<'details' | 'milestones' | 'works'>('details')
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState<CreateMilestonePayload>({
    milestoneNo: '',
    description: '',
    type: undefined,
    percentage: 0,
    netAmount: undefined,
    invoicingPercentage: undefined,
  })
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [milestoneError, setMilestoneError] = useState('')

  // Reset states and close drawer
  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setFormState(emptyForm)
    setEditingProject(null)
    setFormError('')
    setActiveTab('details')
    setEditingMilestoneId(null)
    setShowMilestoneForm(false)
    setMilestoneForm({ milestoneNo: '', description: '', percentage: 0, invoicingPercentage: undefined })
    setMilestoneError('')
    setIsEditing(false)
  }

  // Milestones Query
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', editingProject?.id],
    queryFn: () => fetchMilestones(editingProject!.id),
    enabled: !!editingProject && (activeTab === 'milestones' || activeTab === 'works'),
  })

  // Project Mutations
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      handleCloseDrawer()
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateProjectPayload> }) =>
      updateProject(id, payload),
    onSuccess: async (updatedProject) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (updatedProject) {
        setEditingProject(updatedProject)
      }
      setIsEditing(false)
      setFormError('')
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      handleCloseDrawer()
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  // Milestone Mutations
  const createMilestoneMutation = useMutation({
    mutationFn: (payload: CreateMilestonePayload) => createMilestone(editingProject!.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones', editingProject?.id] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setMilestoneForm({ milestoneNo: '', description: '', type: undefined, percentage: 0, netAmount: undefined, invoicingPercentage: undefined })
      setMilestoneError('')
      setShowMilestoneForm(false)
    },
    onError: (err: Error) => {
      setMilestoneError(err.message)
    },
  })

  const createMilestonesBatchMutation = useMutation({
    mutationFn: async (payloads: CreateMilestonePayload[]) => {
      for (const payload of payloads) {
        await createMilestone(editingProject!.id, payload)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones', editingProject?.id] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setMilestoneForm({ milestoneNo: '', description: '', type: undefined, percentage: 0, netAmount: undefined, invoicingPercentage: undefined })
      setMilestoneError('')
      setShowMilestoneForm(false)
    },
    onError: (err: Error) => {
      setMilestoneError(err.message)
    },
  })

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateMilestonePayload> }) =>
      updateMilestone(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones', editingProject?.id] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setMilestoneForm({ milestoneNo: '', description: '', type: undefined, percentage: 0, netAmount: undefined, invoicingPercentage: undefined })
      setEditingMilestoneId(null)
      setMilestoneError('')
      setShowMilestoneForm(false)
    },
    onError: (err: Error) => {
      setMilestoneError(err.message)
    },
  })

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id: string) => deleteMilestone(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones', editingProject?.id] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err: Error) => {
      setMilestoneError(err.message)
    },
  })

  // Handlers
  const handleMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!milestoneForm.milestoneNo.trim()) {
      setMilestoneError('Numer kamienia milowego jest wymagany (np. KM1)')
      return
    }
    if (!milestoneForm.description.trim()) {
      setMilestoneError('Opis etapu jest wymagany')
      return
    }
    const pct = milestoneForm.percentage || 0
    if (pct <= 0 || pct > 100) {
      setMilestoneError('Procent wartości musi być z przedziału od 0.01% do 100%')
      return
    }

    const payload = {
      milestoneNo: milestoneForm.milestoneNo.trim(),
      description: milestoneForm.description.trim(),
      percentage: Number(milestoneForm.percentage),
      invoicingPercentage: milestoneForm.invoicingPercentage ? Number(milestoneForm.invoicingPercentage) : undefined,
    }

    if (editingMilestoneId) {
      updateMilestoneMutation.mutate({ id: editingMilestoneId, payload })
    } else {
      createMilestoneMutation.mutate(payload)
    }
  }

  const normalizedRole = (profile?.role ?? '').toLowerCase()
  const normalizedRoles = (profile?.roles ?? []).map((entry) => entry.toLowerCase())
  const hasRole = (role: string) => normalizedRole === role || normalizedRoles.includes(role)

  const canCreateProject = hasRole('admin') || hasRole('administrator') || hasRole('project_manager') || hasRole('operational_director')
  const canEditProject = hasRole('admin') || hasRole('administrator') || hasRole('project_manager') || hasRole('operational_director')
  const canDeleteProject = hasRole('admin')

  const managerList = useMemo(() => {
    return users.filter((u) => {
      if (formState.managerId && u.id === formState.managerId) return true
      if (editingProject?.manager && u.id === editingProject.manager.id) return true

      const roles = (u.roles || []).map((r) => r.toLowerCase())
      const pos = (u.position || '').toLowerCase()

      const isManagerRole = roles.some((r) =>
        r === 'manager' ||
        r === 'kierownik' ||
        r === 'project_manager' ||
        r.includes('manager') ||
        r.includes('kierownik')
      )

      const isManagerPosition = pos.includes('kierownik') || pos.includes('manager')

      return isManagerRole || isManagerPosition
    })
  }, [users, formState.managerId, editingProject])

  const handleOpenDrawer = () => {
    setEditingProject(null)
    setFormState(emptyForm)
    setFormError('')
    setIsEditing(true)
    setActiveTab('details')
    setDrawerOpen(true)
  }

  const handleEditProject = (projectId: string) => {
    const raw = rawProjects.find((p) => p.id === projectId)
    if (!raw) return

    setEditingProject(raw)
    setFormState({
      name: raw.name,
      contractorId: raw.contractors?.id ?? '',
      projectTypeId: raw.project_types?.id ?? 0,
      country: raw.country,
      city: raw.city,
      status: raw.status as ProjectStatus,
      currency: raw.currency || 'PLN',
      contractNetValue: raw.contract_net_value ? Number(raw.contract_net_value) : undefined,
      startDateContract: raw.start_date_contract || '',
      endDateContract: raw.end_date_contract || '',
      startDateFact: raw.start_date_fact || '',
      endDateFact: raw.end_date_fact || '',
      managerId: raw.manager?.id ?? undefined,
      power: raw.power ? Number(raw.power) : undefined,
      dokumentationUrl: raw.dokumentationUrl ?? '',
      pinUrl: raw.pinUrl ?? '',
    })
    setFormError('')
    setIsEditing(false)
    setActiveTab('details')
    setDrawerOpen(true)
  }

  const handleDeleteProject = () => {
    if (!editingProject) return
    setShowDeleteConfirm(true)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.name.trim()) {
      setFormError(t('projects.form.errors.nameRequired'))
      return
    }
    if (!formState.contractorId) {
      setFormError(t('projects.form.errors.contractorRequired'))
      return
    }
    if (!formState.projectTypeId) {
      setFormError(t('projects.form.errors.projectTypeRequired'))
      return
    }
    if (!formState.country.trim() || !formState.city.trim()) {
      setFormError(t('projects.form.errors.locationRequired'))
      return
    }

    const payload: CreateProjectPayload = {
      name: formState.name.trim(),
      contractorId: formState.contractorId,
      projectTypeId: formState.projectTypeId,
      country: formState.country.trim(),
      city: formState.city.trim(),
      status: formState.status || 'DRAFT',
      currency: formState.currency || 'PLN',
      contractNetValue: formState.contractNetValue || undefined,
      startDateContract: formState.startDateContract || undefined,
      endDateContract: formState.endDateContract || undefined,
      startDateFact: formState.startDateFact || undefined,
      endDateFact: formState.endDateFact || undefined,
      managerId: formState.managerId || undefined,
      power: formState.power || undefined,
      dokumentationUrl: formState.dokumentationUrl || undefined,
      pinUrl: formState.pinUrl || undefined,
    }

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const setField = <K extends keyof CreateProjectPayload>(key: K, value: CreateProjectPayload[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const selectedContractor = useMemo(
    () => contractors.find((c) => c.id === formState.contractorId),
    [contractors, formState.contractorId],
  )

  const selectedProjectType = useMemo(
    () => projectTypes.find((pt) => pt.id === formState.projectTypeId),
    [projectTypes, formState.projectTypeId],
  )

  const managerName = useMemo(() => {
    if (formState.managerId) {
      const found = users.find((u) => u.id === formState.managerId)
      if (found) return `${found.firstName} ${found.lastName}`.trim()
    }
    if (editingProject?.manager) {
      return `${editingProject.manager.firstName} ${editingProject.manager.lastName}`.trim()
    }
    return 'Nieprzypisany'
  }, [users, formState.managerId, editingProject])

  const filteredContractors = useMemo(
    () => contractors.filter((c) => c.name.toLowerCase().includes(contractorSearch.toLowerCase())),
    [contractors, contractorSearch],
  )

  const handleSelectContractor = (contractorId: string) => {
    setField('contractorId', contractorId)
    setShowContractorList(false)
    setContractorSearch('')
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortColumn(column)
    setSortDirection('asc')
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contractorRef.current
        && !contractorRef.current.contains(event.target as Node)
      ) {
        setShowContractorList(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const managerOptions = useMemo(() => ['all', ...new Set(projects.map((project) => project.owner).filter(Boolean))], [projects])

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>()
    projects.forEach((project) => {
      const start = parseDateValue(project.startDate)
      const end = parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
      if (start) {
        const startYear = start.getFullYear()
        yearsSet.add(startYear)
        if (end) {
          const endYear = end.getFullYear()
          for (let y = startYear; y <= endYear; y++) {
            yearsSet.add(y)
          }
        }
      }
    })
    return Array.from(yearsSet).sort((a, b) => b - a).map(String)
  }, [projects])

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const targetDate = dateFilter ? new Date(`${dateFilter}T00:00:00`) : null

    const matches = projects.filter((project) => {
      const matchesQuery = !query
        || project.name.toLowerCase().includes(query)
        || project.owner.toLowerCase().includes(query)
        || project.contractor.toLowerCase().includes(query)
        || project.location.toLowerCase().includes(query)

      if (!matchesQuery) return false
      if (statusFilter !== 'all' && project.status !== statusFilter) return false
      if (managerFilter !== 'all' && project.owner !== managerFilter) return false

      if (yearFilter !== 'all') {
        const targetYear = Number(yearFilter)
        const start = parseDateValue(project.startDate)
        const end = parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
        
        if (start && end) {
          const startYear = start.getFullYear()
          const endYear = end.getFullYear()
          if (targetYear < startYear || targetYear > endYear) return false
        } else if (start) {
          if (start.getFullYear() !== targetYear) return false
        } else if (end) {
          if (end.getFullYear() !== targetYear) return false
        } else {
          return false
        }
      }

      if (targetDate) {
        const start = parseDateValue(project.startDate)
        const end = parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
        if (start && targetDate < start) return false
        if (end && targetDate > end) return false
        if (!start && !end) return false
      }

      return true
    })

    const sorted = [...matches]
    sorted.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1

      if (sortColumn === 'project') return a.name.localeCompare(b.name) * direction
      if (sortColumn === 'status') return a.status.localeCompare(b.status) * direction
      if (sortColumn === 'manager') return a.owner.localeCompare(b.owner) * direction
      if (sortColumn === 'contractor') return a.contractor.localeCompare(b.contractor) * direction
      if (sortColumn === 'location') return a.location.localeCompare(b.location) * direction
      if (sortColumn === 'progress') return (a.progress - b.progress) * direction

      const aDue = parseDateValue(a.endDate) ?? parseDateValue(a.dueDate)
      const bDue = parseDateValue(b.endDate) ?? parseDateValue(b.dueDate)
      const aTime = aDue ? aDue.getTime() : Number.POSITIVE_INFINITY
      const bTime = bDue ? bDue.getTime() : Number.POSITIVE_INFINITY
      return (aTime - bTime) * direction
    })

    return sorted
  }, [projects, searchQuery, statusFilter, managerFilter, dateFilter, yearFilter, sortColumn, sortDirection])

  // Timeline bounds calculation for Gantt view
  const timelineBounds = useMemo(() => {
    let minTime = Number.POSITIVE_INFINITY
    let maxTime = Number.NEGATIVE_INFINITY

    filteredProjects.forEach((p) => {
      const start = parseDateValue(p.startDate) ?? parseDateValue(p.startDateFact)
      const end = parseDateValue(p.endDate) ?? parseDateValue(p.dueDate) ?? parseDateValue(p.endDateFact)

      if (start) minTime = Math.min(minTime, start.getTime())
      if (end) maxTime = Math.max(maxTime, end.getTime())
    })

    const now = new Date()
    if (!Number.isFinite(minTime)) {
      minTime = new Date(now.getFullYear(), 0, 1).getTime()
    }
    if (!Number.isFinite(maxTime)) {
      maxTime = new Date(now.getFullYear(), 11, 31).getTime()
    }

    const minDate = new Date(minTime)
    const maxDate = new Date(maxTime)

    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)

    const months: Array<{ label: string; year: number; month: number; days: number; startTs: number; endTs: number }> = []
    const cur = new Date(startDate)

    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']

    while (cur <= endDate) {
      const y = cur.getFullYear()
      const m = cur.getMonth()
      const monthStart = new Date(y, m, 1)
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59)
      const days = monthEnd.getDate()

      months.push({
        label: `${monthNames[m]} ${y}`,
        year: y,
        month: m,
        days,
        startTs: monthStart.getTime(),
        endTs: monthEnd.getTime(),
      })

      cur.setMonth(cur.getMonth() + 1)
    }

    const totalDuration = Math.max(1, endDate.getTime() - startDate.getTime())

    return {
      startDate,
      endDate,
      totalDuration,
      months,
    }
  }, [filteredProjects])

  if (drawerOpen && editingProject !== null) {
    return (
      <ProjectDetailsDrawer
        editingProject={editingProject}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        formState={formState}
        setField={setField}
        setFormState={setFormState}
        formError={formError}
        setFormError={setFormError}
        canEditProject={canEditProject}
        canDeleteProject={canDeleteProject}
        handleCloseDrawer={handleCloseDrawer}
        handleCreate={handleCreate}
        handleDeleteProject={handleDeleteProject}
        createMutation={createMutation}
        updateMutation={updateMutation}
        deleteMutation={deleteMutation}
        contractors={contractors}
        contractorsLoading={contractorsLoading}
        projectTypes={projectTypes}
        typesLoading={typesLoading}
        users={users}
        managerList={managerList}
        managerName={managerName}
        selectedContractor={selectedContractor}
        selectedProjectType={selectedProjectType}
        filteredContractors={filteredContractors}
        contractorSearch={contractorSearch}
        setContractorSearch={setContractorSearch}
        showContractorList={showContractorList}
        setShowContractorList={setShowContractorList}
        handleSelectContractor={handleSelectContractor}
        contractorRef={contractorRef}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        milestones={milestones}
        milestonesLoading={milestonesLoading}
        showMilestoneForm={showMilestoneForm}
        setShowMilestoneForm={setShowMilestoneForm}
        milestoneForm={milestoneForm}
        editingMilestoneId={editingMilestoneId}
        setEditingMilestoneId={setEditingMilestoneId}
        milestoneError={milestoneError}
        setMilestoneError={setMilestoneError}
        handleMilestoneSubmit={handleMilestoneSubmit}
        createMilestoneMutation={createMilestoneMutation}
        createMilestonesBatchMutation={createMilestonesBatchMutation}
        updateMilestoneMutation={updateMilestoneMutation}
        deleteMilestoneMutation={deleteMilestoneMutation}
        formatDate={formatDate}
        formatBudget={formatBudget}
        statusTone={statusTone}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />
    )
  }

  return (
    <>
      <section className="grid flex-1 items-start gap-2 p-3 md:gap-4 xl:grid-cols-12 animate-page-enter">
      {isLoading ? (
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 xl:col-span-12">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Loader2 size={16} className="animate-spin" />
            {t('projects.states.loading')}
          </div>
        </article>
      ) : null}

      {isError ? (
        <article className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 xl:col-span-12">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 text-rose-500" />
            <div>
              <p className="font-medium text-rose-500">{t('projects.states.errorTitle')}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {error?.message || t('projects.states.errorHint')}
              </p>
            </div>
          </div>
        </article>
      ) : null}

      {!isLoading && !isError && projects.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 xl:col-span-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
              <Folder size={22} />
            </div>
            <p className="font-medium">{t('projects.states.empty')}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{t('projects.states.emptyHint')}</p>
            {canCreateProject ? (
              <Button
                type="button"
                onClick={handleOpenDrawer}
                className="mt-2 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
              >
                <Plus size={16} />
                {t('projects.addButton')}
              </Button>
            ) : null}
          </div>
        </article>
      ) : null}

      {!isLoading && !isError && projects.length > 0 ? (
        <div className="xl:col-span-12 flex flex-col gap-2">
          {/* Filter Panel */}
          <ProjectsFilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={handleSetStatusFilter}
            managerFilter={managerFilter}
            setManagerFilter={setManagerFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            yearFilter={yearFilter}
            setYearFilter={setYearFilter}
            managerOptions={managerOptions}
            yearOptions={yearOptions}
            onReset={() => {
              setSearchQuery('')
              handleSetStatusFilter('active')
              setManagerFilter('all')
              setDateFilter('')
              setYearFilter('all')
            }}
          />

          {/* Main Content View (Table or Gantt) */}
          {viewMode === 'table' ? (
            <ProjectsTableView
              filteredProjects={filteredProjects}
              totalProjectsCount={projects.length}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              viewMode={viewMode}
              setViewMode={setViewMode}
              canCreateProject={canCreateProject}
              canEditProject={canEditProject}
              onOpenDrawer={handleOpenDrawer}
              onSelectProject={handleEditProject}
              formatDate={formatDate}
              statusTone={statusTone}
              statusLabel={statusLabel}
            />
          ) : (
            <ProjectsGanttView
              filteredProjects={filteredProjects}
              totalProjectsCount={projects.length}
              timelineBounds={timelineBounds}
              viewMode={viewMode}
              setViewMode={setViewMode}
              canCreateProject={canCreateProject}
              canEditProject={canEditProject}
              onOpenDrawer={handleOpenDrawer}
              onSelectProject={handleEditProject}
              parseDateValue={parseDateValue}
              statusTone={statusTone}
              statusLabel={statusLabel}
            />
          )}
        </div>
      ) : null}
    </section>

      <ProjectDetailsDrawer
        isOpen={drawerOpen && editingProject === null}
        editingProject={null}
        isEditing={true}
        setIsEditing={setIsEditing}
        formState={formState}
        setField={setField}
        setFormState={setFormState}
        formError={formError}
        setFormError={setFormError}
        canEditProject={canEditProject}
        canDeleteProject={canDeleteProject}
        handleCloseDrawer={handleCloseDrawer}
        handleCreate={handleCreate}
        handleDeleteProject={handleDeleteProject}
        createMutation={createMutation}
        updateMutation={updateMutation}
        deleteMutation={deleteMutation}
        contractors={contractors}
        contractorsLoading={contractorsLoading}
        projectTypes={projectTypes}
        typesLoading={typesLoading}
        users={users}
        managerList={managerList}
        managerName={managerName}
        selectedContractor={selectedContractor}
        selectedProjectType={selectedProjectType}
        filteredContractors={filteredContractors}
        contractorSearch={contractorSearch}
        setContractorSearch={setContractorSearch}
        showContractorList={showContractorList}
        setShowContractorList={setShowContractorList}
        handleSelectContractor={handleSelectContractor}
        contractorRef={contractorRef}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        milestones={milestones}
        milestonesLoading={milestonesLoading}
        showMilestoneForm={showMilestoneForm}
        setShowMilestoneForm={setShowMilestoneForm}
        milestoneForm={milestoneForm}
        editingMilestoneId={editingMilestoneId}
        setEditingMilestoneId={setEditingMilestoneId}
        milestoneError={milestoneError}
        setMilestoneError={setMilestoneError}
        handleMilestoneSubmit={handleMilestoneSubmit}
        createMilestoneMutation={createMilestoneMutation}
        createMilestonesBatchMutation={createMilestonesBatchMutation}
        updateMilestoneMutation={updateMilestoneMutation}
        deleteMilestoneMutation={deleteMilestoneMutation}
        formatDate={formatDate}
        formatBudget={formatBudget}
        statusTone={statusTone}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />
    </>
  )
}
