import { AlertCircle, ArrowUpDown, CircleDollarSign, Edit, ExternalLink, Folder, ListFilter, Loader2, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { useMemo, useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  createProject,
  deleteProject,
  fetchContractors,
  fetchProjectTypes,
  fetchProjects,
  updateProject,
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/features/projects/api'
import { useProjectsQuery } from '@/features/projects/useProjectsQuery'
import type {
  CreateProjectPayload,
  ProjectStatus,
  ApiProject,
  CreateMilestonePayload,
} from '@/features/projects/types'
import type { UserProfile } from '@/types/auth'

function statusTone(status: string): string {
  switch (status) {
    case 'done': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
    case 'blocked': return 'bg-rose-500/15 text-rose-500 border-rose-500/40'
    case 'planning': return 'bg-amber-500/15 text-amber-500 border-amber-500/40'
    default: return 'bg-sky-500/15 text-sky-500 border-sky-500/40'
  }
}

function statusLabel(status: string, t: (key: string) => string): string {
  if (!status) return t('projects.status.unknown')
  if (status === 'planning') return t('projects.status.planning')
  if (status === 'active') return t('projects.status.active')
  if (status === 'blocked') return t('projects.status.blocked')
  if (status === 'done') return t('projects.status.done')
  return status
}

function formatDate(value: string, noDeadlineLabel: string): string {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return noDeadlineLabel

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
  const date = gvizMatch ? new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3])) : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date
}

type SortColumn =
  | 'project'
  | 'status'
  | 'manager'
  | 'contractor'
  | 'location'
  | 'schedule'
  | 'progress'
  | 'budget'
  | 'docs'

type SortDirection = 'asc' | 'desc'

function formatBudget(value: number, currencyCode = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currencyCode || 'PLN',
    maximumFractionDigits: 0,
  }).format(value)
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
}

type ProjectsShowcaseProps = {
  profile: UserProfile | null
}

export function ProjectsShowcase({ profile }: ProjectsShowcaseProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading, isError, error } = useProjectsQuery()

  // Raw API data for editing
  const { data: projectsRaw = [] } = useQuery({
    queryKey: ['projects', 'raw'],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  } as const) as { data: ApiProject[] }

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('schedule')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formState, setFormState] = useState<CreateProjectPayload>(emptyForm)
  const [formError, setFormError] = useState('')
  const [contractorSearch, setContractorSearch] = useState('')
  const [showContractorList, setShowContractorList] = useState(false)
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null)
  const contractorRef = useRef<HTMLDivElement>(null)

  // Milestones State & Mutations
  const [activeTab, setActiveTab] = useState<'details' | 'milestones'>('details')
  const [milestoneForm, setMilestoneForm] = useState<CreateMilestonePayload>({
    milestoneNo: '',
    description: '',
    percentage: 0,
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
    setMilestoneForm({ milestoneNo: '', description: '', percentage: 0, invoicingPercentage: undefined })
    setMilestoneError('')
  }

  // Queries
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', editingProject?.id],
    queryFn: () => fetchMilestones(editingProject!.id),
    enabled: !!editingProject && activeTab === 'milestones',
  })

  // Mutations
  const createMilestoneMutation = useMutation({
    mutationFn: (payload: CreateMilestonePayload) => createMilestone(editingProject!.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones', editingProject?.id] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setMilestoneForm({ milestoneNo: '', description: '', percentage: 0, invoicingPercentage: undefined })
      setMilestoneError('')
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
      setMilestoneForm({ milestoneNo: '', description: '', percentage: 0, invoicingPercentage: undefined })
      setEditingMilestoneId(null)
      setMilestoneError('')
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
    if (milestoneForm.percentage <= 0 || milestoneForm.percentage > 100) {
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

  const canCreateProject = hasRole('admin') || hasRole('administrator') || hasRole('operational_director')
  const canEditProject = canCreateProject || hasRole('project_manager')
  const canDeleteProject = canCreateProject

  const { data: contractors = [], isLoading: contractorsLoading } = useQuery({
    queryKey: ['contractors'],
    queryFn: fetchContractors,
    enabled: drawerOpen,
    staleTime: 1000 * 60 * 5,
  })

  const { data: projectTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: fetchProjectTypes,
    enabled: drawerOpen,
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      handleCloseDrawer()
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : t('projects.form.error.defaultMessage'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateProjectPayload> }) =>
      updateProject(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      handleCloseDrawer()
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : t('projects.form.error.defaultMessage'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      handleCloseDrawer()
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : t('projects.form.error.defaultMessage'))
    },
  })

  const handleOpenDrawer = () => {
    setFormState(emptyForm)
    setEditingProject(null)
    setFormError('')
    setContractorSearch('')
    setShowContractorList(false)
    setDrawerOpen(true)
  }

  const handleEditProject = (id: string) => {
    if (!canEditProject) return

    const project = projectsRaw.find((p) => p.id === id)
    if (!project) return

    setEditingProject(project)
    setFormState({
      name: project.name,
      contractorId: project.contractors?.id ?? '',
      projectTypeId: project.project_types?.id ?? 0,
      country: project.country,
      city: project.city,
      status: project.status as ProjectStatus,
      currency: project.currency || 'PLN',
      contractNetValue: project.contract_net_value ? Number(project.contract_net_value) : undefined,
      startDateContract: project.start_date_contract || '',
      endDateContract: project.end_date_contract || '',
      startDateFact: project.start_date_fact || '',
      endDateFact: project.end_date_fact || '',
    })
    setFormError('')
    setContractorSearch('')
    setShowContractorList(false)
    setDrawerOpen(true)
  }

  const handleDeleteProject = () => {
    if (!canDeleteProject) return

    if (editingProject && confirm('Czy na pewno chcesz usunąć ten projekt?')) {
      deleteMutation.mutate(editingProject.id)
    }
  }

  const handleCreate = () => {
    if (!canCreateProject && !editingProject) return
    if (!canEditProject && editingProject) return

    setFormError('')
    if (
      !formState.name.trim()
      || !formState.contractorId
      || !formState.projectTypeId
      || !formState.country.trim()
      || !formState.city.trim()
    ) {
      setFormError(t('projects.form.validation.required'))
      return
    }

    const payload = {
      name: formState.name.trim(),
      contractorId: formState.contractorId,
      projectTypeId: formState.projectTypeId,
      country: formState.country.trim(),
      city: formState.city.trim(),
      status: formState.status,
      currency: formState.currency || undefined,
      contractNetValue: formState.contractNetValue || undefined,
      startDateContract: formState.startDateContract || undefined,
      endDateContract: formState.endDateContract || undefined,
      startDateFact: formState.startDateFact || undefined,
      endDateFact: formState.endDateFact || undefined,
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

  const managerOptions = useMemo(() => ['all', ...new Set(projects.map((project) => project.owner).filter(Boolean))], [projects],)

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const fromDate = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`) : null
    const toDate = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null

    const matches = projects.filter((project) => {
      const matchesQuery = !query
        || project.name.toLowerCase().includes(query)
        || project.owner.toLowerCase().includes(query)
        || project.contractor.toLowerCase().includes(query)
        || project.location.toLowerCase().includes(query)

      if (!matchesQuery) return false
      if (statusFilter !== 'all' && project.status !== statusFilter) return false
      if (managerFilter !== 'all' && project.owner !== managerFilter) return false

      if (fromDate || toDate) {
        const projectDate = parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
        if (!projectDate) return false
        if (fromDate && projectDate < fromDate) return false
        if (toDate && projectDate > toDate) return false
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
      if (sortColumn === 'budget') return (a.budget - b.budget) * direction

      if (sortColumn === 'docs') {
        const aDocs = a.dokumentationUrl ?? ''
        const bDocs = b.dokumentationUrl ?? ''
        return aDocs.localeCompare(bDocs) * direction
      }

      const aDue = parseDateValue(a.endDate) ?? parseDateValue(a.dueDate)
      const bDue = parseDateValue(b.endDate) ?? parseDateValue(b.dueDate)
      const aTime = aDue ? aDue.getTime() : Number.POSITIVE_INFINITY
      const bTime = bDue ? bDue.getTime() : Number.POSITIVE_INFINITY
      return (aTime - bTime) * direction
    })

    return sorted
  }, [projects, searchQuery, statusFilter, managerFilter, dateFromFilter, dateToFilter, sortColumn, sortDirection])

  return (
    <>
      <section className="grid flex-1 items-start gap-2 p-3 md:gap-4 xl:grid-cols-12">
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
                  {error instanceof Error ? error.message : t('projects.states.errorHint')}
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
            {/* ─── Filter Panel ─── */}
            <div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">

                {/* Search — grows to fill available space */}
                <label className="relative min-w-[160px] flex-1">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t('projects.filters.searchPlaceholder')}
                    aria-label={t('projects.filters.searchAria')}
                    className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>

                {/* Status */}
                <label className="relative shrink-0">
                  <ListFilter size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
                    aria-label={t('projects.filters.statusAria')}
                    className="h-8 w-[148px] appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-6 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  >
                    <option value="all">{t('projects.filters.allStatuses')}</option>
                    <option value="active">{t('projects.status.active')}</option>
                    <option value="planning">{t('projects.status.planning')}</option>
                    <option value="blocked">{t('projects.status.blocked')}</option>
                    <option value="done">{t('projects.status.done')}</option>
                  </select>
                </label>

                {/* Manager */}
                <label className="relative shrink-0">
                  <UserRound size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <select
                    value={managerFilter}
                    onChange={(event) => setManagerFilter(event.target.value)}
                    aria-label={t('projects.filters.managerAria')}
                    className="h-8 w-[148px] appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-6 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  >
                    {managerOptions.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager === 'all' ? t('projects.filters.allManagers') : manager}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Date range — two pickers side by side */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <DatePicker
                    value={dateFromFilter}
                    onChange={setDateFromFilter}
                    max={dateToFilter || undefined}
                    title={t('projects.filters.fromTitle')}
                    ariaLabel={t('projects.filters.fromAria')}
                    placeholder={t('projects.filters.fromPlaceholder')}
                    size="sm"
                    className="w-[150px]"
                  />
                  <span className="select-none text-xs text-[var(--muted-foreground)]">—</span>
                  <DatePicker
                    value={dateToFilter}
                    onChange={setDateToFilter}
                    min={dateFromFilter || undefined}
                    title={t('projects.filters.toTitle')}
                    ariaLabel={t('projects.filters.toAria')}
                    placeholder={t('projects.filters.toPlaceholder')}
                    size="sm"
                    className="w-[150px]"
                  />
                </div>

                {/* Reset — themed button, always visible, disabled if no filters are active */}
                <Button
                  type="button"
                  disabled={!(searchQuery || statusFilter !== 'all' || managerFilter !== 'all' || dateFromFilter || dateToFilter)}
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setManagerFilter('all')
                    setDateFromFilter('')
                    setDateToFilter('')
                  }}
                  variant="outline"
                  className="ml-auto shrink-0 gap-1.5 rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 hover:text-[var(--sidebar-primary)] disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--muted-foreground)]/50 disabled:opacity-50 transition-all duration-200"
                >
                  <X size={13} />
                  {t('projects.filters.reset')}
                </Button>
              </div>
            </div>

            {/* ─── Table card ─── */}
            <article className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{t('projects.table.title')}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('projects.table.rows', { filtered: filteredProjects.length, total: projects.length })}
                  </p>
                </div>

                {canCreateProject ? (
                  <Button
                    type="button"
                    onClick={handleOpenDrawer}
                    className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
                  >
                    <Plus size={15} />
                    {t('projects.addButton')}
                  </Button>
                ) : null}
              </div>

              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full whitespace-nowrap border-separate border-spacing-0 text-[13px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('project')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.project')}
                          <ArrowUpDown size={12} className={sortColumn === 'project' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.status')}
                          <ArrowUpDown size={12} className={sortColumn === 'status' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('manager')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.manager')}
                          <ArrowUpDown size={12} className={sortColumn === 'manager' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('contractor')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.contractor')}
                          <ArrowUpDown size={12} className={sortColumn === 'contractor' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('location')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.location')}
                          <ArrowUpDown size={12} className={sortColumn === 'location' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('schedule')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.schedule')}
                          <ArrowUpDown size={12} className={sortColumn === 'schedule' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('progress')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.progress')}
                          <ArrowUpDown size={12} className={sortColumn === 'progress' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('budget')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.powerBudget')}
                          <ArrowUpDown size={12} className={sortColumn === 'budget' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        <button type="button" onClick={() => handleSort('docs')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                          {t('projects.table.columns.docs')}
                          <ArrowUpDown size={12} className={sortColumn === 'docs' ? 'text-[var(--foreground)]' : ''} />
                        </button>
                      </th>
                      {canEditProject ? (
                        <th className="border-b border-[var(--border)] px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Akcje</th>
                      ) : null}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        className="group transition-colors odd:bg-[var(--background)]/25 hover:bg-[var(--sidebar-accent)]/35"
                      >
                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          <p className="font-semibold leading-snug">{project.name}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t('projects.table.row.type')}: {project.projectType}</p>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(project.status)}`}>
                            {statusLabel(project.status, t)}
                          </span>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          <p className="font-medium">{project.owner}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t('projects.table.row.priority')}: {project.priority}</p>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">{project.contractor}</td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          <p>{project.location}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{project.country}</p>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          <div className="space-y-1">
                            <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                              <span className="font-semibold text-[var(--foreground)]">Plan:</span> <br />
                              {formatDate(project.startDate, '–')} – {formatDate(project.endDate, '–')}
                            </p>
                            {(project.startDateFact || project.endDateFact) && (
                              <p className="text-[11px] text-emerald-500 font-medium leading-tight">
                                <span className="font-semibold">Fakt:</span> <br />
                                {project.startDateFact ? formatDate(project.startDateFact, '–') : '–'} – {project.endDateFact ? formatDate(project.endDateFact, '–') : '–'}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          <div className="w-40">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-[var(--muted-foreground)]">{t('projects.table.row.completion')}</span>
                              <span className="font-medium">{project.progress}%</span>
                            </div>
                            <progress
                              value={project.progress}
                              max={100}
                              aria-label={`${t('projects.table.row.completion')} ${project.name}`}
                              className="h-2 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-[var(--muted)] [&::-webkit-progress-value]:bg-[var(--sidebar-primary)] [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 [&::-moz-progress-bar]:bg-[var(--sidebar-primary)]"
                            />
                          </div>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 text-right align-top">
                          <p className="inline-flex items-center gap-1.5 font-semibold">
                            <CircleDollarSign size={14} />
                            {formatBudget(project.budget)}
                          </p>
                        </td>

                        <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                          {project.dokumentationUrl ? (
                            <a
                              href={project.dokumentationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sidebar-primary)] hover:underline"
                            >
                              {t('projects.table.row.open')}
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">{t('projects.table.row.noLink')}</span>
                          )}
                        </td>

                        {canEditProject ? (
                          <td className="border-b border-[var(--border)] px-3 py-2 align-top text-center">
                            <button
                              type="button"
                              onClick={() => handleEditProject(project.id)}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 transition hover:bg-[var(--sidebar-primary)]/20"
                              title="Edytuj projekt"
                            >
                              <Edit size={16} className="text-[var(--sidebar-primary)]" />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredProjects.length === 0 ? (
                  <div className="border-t border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                    {t('projects.states.noResults')}
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        ) : null}
      </section>

      {/* Drawer backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={handleCloseDrawer}
      />

      {/* Drawer panel */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          drawerOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label={t('projects.form.title')}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">
              {editingProject ? `Edytuj projekt: ${editingProject.name}` : t('projects.form.title')}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {editingProject ? 'Wyświetlanie detali projektu' : t('projects.form.subtitle')}
            </p>
          </div>
          <Button size="icon-sm" variant="outline" onClick={handleCloseDrawer} aria-label={t('projects.form.actions.cancel')}>
            <X size={16} />
          </Button>
        </div>

        {/* Drawer form body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          {editingProject && (
            <div className="flex border-b border-[var(--border)] mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('details')
                  setMilestoneError('')
                }}
                className={`flex-1 pb-2.5 text-[11px] font-semibold border-b-2 transition-all ${activeTab === 'details'
                  ? 'border-[var(--sidebar-primary)] text-[var(--sidebar-primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
              >
                Ogólne
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('milestones')
                  setMilestoneError('')
                }}
                className={`flex-1 pb-2.5 text-[11px] font-semibold border-b-2 transition-all ${activeTab === 'milestones'
                  ? 'border-[var(--sidebar-primary)] text-[var(--sidebar-primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
              >
                Kamienie milowe
              </button>
            </div>
          )}

          {activeTab === 'details' ? (
            <>
              {/* Section: Basic */}
              <div>
                <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t('projects.form.sections.basic')}
                </p>
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t('projects.form.labels.name')} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={formState.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder={t('projects.form.placeholders.name')}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.status')}</span>
                    <select
                      value={formState.status}
                      onChange={(e) => setField('status', e.target.value)}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    >
                      <option value="DRAFT">{t('projects.form.statuses.DRAFT')}</option>
                      <option value="ACTIVE">{t('projects.form.statuses.ACTIVE')}</option>
                      <option value="ON_HOLD">{t('projects.form.statuses.ON_HOLD')}</option>
                      <option value="COMPLETED">{t('projects.form.statuses.COMPLETED')}</option>
                      <option value="CANCELLED">{t('projects.form.statuses.CANCELLED')}</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Section: Location */}
              <div>
                <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t('projects.form.sections.location')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t('projects.form.labels.country')} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={formState.country}
                      onChange={(e) => setField('country', e.target.value)}
                      placeholder={t('projects.form.placeholders.country')}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t('projects.form.labels.city')} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={formState.city}
                      onChange={(e) => setField('city', e.target.value)}
                      placeholder={t('projects.form.placeholders.city')}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>
                </div>
              </div>

              {/* Section: Contract */}
              <div>
                <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t('projects.form.sections.contract')}
                </p>
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t('projects.form.labels.contractor')} <span className="text-rose-500">*</span>
                    </span>
                    <div className="relative" ref={contractorRef}>
                      <input
                        value={showContractorList ? contractorSearch : selectedContractor?.name ?? ''}
                        onChange={(e) => {
                          setContractorSearch(e.target.value)
                          setShowContractorList(true)
                          // Clear selection if input doesn't match any contractor
                          if (e.target.value === '') {
                            setField('contractorId', '')
                          }
                        }}
                        onFocus={() => setShowContractorList(true)}
                        placeholder={contractorsLoading ? t('projects.form.placeholders.loading') : t('projects.form.placeholders.selectContractor')}
                        disabled={contractorsLoading}
                        className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 disabled:opacity-50"
                      />
                      {showContractorList && !contractorsLoading && filteredContractors.length > 0 ? (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
                          {filteredContractors.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectContractor(c.id)}
                              className="w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--sidebar-primary)]/15"
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {showContractorList && !contractorsLoading && filteredContractors.length === 0 && contractorSearch.length > 0 ? (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center text-xs text-[var(--muted-foreground)]">
                          Brak wyników
                        </div>
                      ) : null}
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t('projects.form.labels.projectType')} <span className="text-rose-500">*</span>
                    </span>
                    <select
                      value={formState.projectTypeId || ''}
                      onChange={(e) => setField('projectTypeId', Number(e.target.value))}
                      disabled={typesLoading}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 disabled:opacity-50"
                    >
                      <option value="">{typesLoading ? t('projects.form.placeholders.loading') : t('projects.form.placeholders.selectProjectType')}</option>
                      {projectTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.currency')}</span>
                      <select
                        value={formState.currency ?? 'PLN'}
                        onChange={(e) => setField('currency', e.target.value)}
                        className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                      >
                        <option value="PLN">PLN</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.contractNetValue')}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.contractNetValue ?? ''}
                        onChange={(e) => setField('contractNetValue', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={t('projects.form.placeholders.contractNetValue')}
                        className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Section: Dates */}
              <div>
                <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Okresy i terminy realizacji (Plan vs Fakt)
                </p>
                <div className="space-y-4">
                  {/* Row 1: Plan */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/80">
                      Terminy planowane (Harmonogram)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.startDate')}</span>
                        <DatePicker
                          value={formState.startDateContract ?? ''}
                          onChange={(v) => setField('startDateContract', v)}
                          placeholder="dd.mm.rrrr"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.endDate')}</span>
                        <DatePicker
                          value={formState.endDateContract ?? ''}
                          onChange={(v) => setField('endDateContract', v)}
                          min={formState.startDateContract || undefined}
                          placeholder="dd.mm.rrrr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Fact */}
                  {editingProject && (
                    <div className="space-y-1.5 animate-fade-in">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/80">
                        Terminy rzeczywiste (Faktyczne)
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-xs text-[var(--muted-foreground)]">Rzeczywisty start</span>
                          <DatePicker
                            value={formState.startDateFact ?? ''}
                            onChange={(v) => setField('startDateFact', v)}
                            placeholder="dd.mm.rrrr"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-[var(--muted-foreground)]">Rzeczywisty koniec</span>
                          <DatePicker
                            value={formState.endDateFact ?? ''}
                            onChange={(v) => setField('endDateFact', v)}
                            min={formState.startDateFact || undefined}
                            placeholder="dd.mm.rrrr"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation error */}
              {formError ? (
                <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
                  {formError}
                </p>
              ) : null}
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {milestoneError && (
                <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                  {milestoneError}
                </div>
              )}

              {milestonesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={24} />
                </div>
              ) : (
                <>
                  {/* Milestones list */}
                  <div className="space-y-2">
                    {milestones.map((m) => (
                      <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 relative group">
                        <div className="flex items-start justify-between">
                          <div className="pr-12">
                            <span className="inline-flex items-center rounded-md bg-[var(--sidebar-primary)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--sidebar-primary)]">
                              {m.milestoneNo}
                            </span>
                            <h4 className="mt-1 text-sm font-semibold">{m.description}</h4>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                              <span>Wartość: <strong className="text-[var(--foreground)]">{m.percentage}%</strong> ({formatBudget(m.netAmount, editingProject?.currency || 'PLN')})</span>
                              {m.invoicingPercentage && (
                                <span>Fakturowanie: <strong className="text-[var(--foreground)]">co {m.invoicingPercentage}%</strong></span>
                              )}
                            </div>
                          </div>
                          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMilestoneId(m.id)
                                setMilestoneForm({
                                  milestoneNo: m.milestoneNo,
                                  description: m.description,
                                  percentage: m.percentage,
                                  invoicingPercentage: m.invoicingPercentage ?? undefined,
                                })
                              }}
                              className="rounded-lg p-1 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 transition"
                              title="Edytuj"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMilestoneMutation.mutate(m.id)}
                              disabled={deleteMilestoneMutation.isPending}
                              className="rounded-lg p-1 text-rose-500 hover:bg-rose-500/10 transition"
                              title="Usuń"
                            >
                              {deleteMilestoneMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {milestones.length === 0 && (
                      <div className="text-center py-6 text-xs text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl">
                        Brak zdefiniowanych kamieni milowych dla tego projektu.
                      </div>
                    )}
                  </div>

                  {/* Sum progress indicators */}
                  {milestones.length > 0 && (
                    <div className="rounded-xl bg-[var(--muted)]/20 p-3 text-xs space-y-2 border border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--muted-foreground)]">Suma udziałów:</span>
                        <span className={`font-bold ${milestones.reduce((s, m) => s + m.percentage, 0) === 100
                          ? 'text-emerald-500'
                          : milestones.reduce((s, m) => s + m.percentage, 0) > 100
                            ? 'text-rose-500'
                            : 'text-amber-500'
                          }`}>
                          {milestones.reduce((s, m) => s + m.percentage, 0).toFixed(1)}% / 100%
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${milestones.reduce((s, m) => s + m.percentage, 0) === 100
                            ? 'bg-emerald-500'
                            : milestones.reduce((s, m) => s + m.percentage, 0) > 100
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                            }`}
                          style={{ width: `${Math.min(milestones.reduce((s, m) => s + m.percentage, 0), 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                        <span>Suma wartości netto:</span>
                        <span className="font-semibold">{formatBudget(milestones.reduce((s, m) => s + m.netAmount, 0), editingProject?.currency || 'PLN')}</span>
                      </div>
                    </div>
                  )}

                  {/* Add / Edit Milestone form */}
                  <form onSubmit={handleMilestoneSubmit} className="border-t border-[var(--border)] pt-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {editingMilestoneId ? 'Edytuj kamień milowy' : 'Dodaj kamień milowy'}
                    </h4>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="block col-span-1 space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">Numer (KM1) <span className="text-rose-500">*</span></span>
                        <input
                          value={milestoneForm.milestoneNo}
                          onChange={(e) => setMilestoneForm((f) => ({ ...f, milestoneNo: e.target.value }))}
                          placeholder="KM1"
                          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none focus:border-[var(--sidebar-primary)]"
                        />
                      </label>
                      <label className="block col-span-2 space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">Nazwa etapu <span className="text-rose-500">*</span></span>
                        <input
                          value={milestoneForm.description}
                          onChange={(e) => setMilestoneForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="np. Montaż konstrukcji"
                          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none focus:border-[var(--sidebar-primary)]"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">Wartość (%) <span className="text-rose-500">*</span></span>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={milestoneForm.percentage || ''}
                          onChange={(e) => setMilestoneForm((f) => ({ ...f, percentage: e.target.value ? Number(e.target.value) : 0 }))}
                          placeholder="np. 20"
                          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none focus:border-[var(--sidebar-primary)]"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">Częst. fakturowania (%)</span>
                        <input
                          type="number"
                          min="1"
                          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">Procent fakturowania (opcj.)</span>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={milestoneForm.invoicingPercentage || ''}
                          onChange={(e) => setMilestoneForm((f) => ({ ...f, invoicingPercentage: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="Domyślnie jak wyżej"
                          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      {editingMilestoneId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingMilestoneId(null)
                            setMilestoneForm({ milestoneNo: '', description: '', percentage: 0, invoicingPercentage: undefined })
                            setMilestoneError('')
                          }}
                        >
                          Anuluj
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                        className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] text-xs h-8 px-3"
                      >
                        {createMilestoneMutation.isPending || updateMilestoneMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        {editingMilestoneId ? 'Zapisz zmiany' : 'Dodaj'}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Lista kamieni milowych
                    </p>
                    {milestones.map((m) => (
                      <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 relative group">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--foreground)]">{m.milestoneNo}</span>
                              <span className="text-[10px] bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] px-1.5 py-0.5 rounded font-semibold">
                                {m.percentage}% ({formatBudget(m.netAmount)})
                              </span>
                              {m.invoicingPercentage && m.invoicingPercentage !== m.percentage && (
                                <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-semibold">
                                  Faktur.: {m.invoicingPercentage}%
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{m.description}</p>
                          </div>

                          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMilestoneId(m.id)
                                setMilestoneForm({
                                  milestoneNo: m.milestoneNo,
                                  description: m.description,
                                  percentage: m.percentage,
                                  invoicingPercentage: m.invoicingPercentage ?? undefined,
                                })
                              }}
                              className="rounded-lg p-1 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 transition"
                              title="Edytuj"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMilestoneMutation.mutate(m.id)}
                              disabled={deleteMilestoneMutation.isPending}
                              className="rounded-lg p-1 text-rose-500 hover:bg-rose-500/10 transition"
                              title="Usuń"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {milestones.length === 0 && (
                      <div className="text-center py-6 text-xs text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl">
                        Brak zdefiniowanych kamieni milowych.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="shrink-0 border-t border-[var(--border)] px-5 py-4 flex flex-col gap-3">
          {activeTab === 'milestones' ? (
            <div className="flex items-center justify-end">
              <Button type="button" variant="outline" onClick={handleCloseDrawer}>
                Zamknij
              </Button>
            </div>
          ) : (
            <>
              {editingProject && canDeleteProject ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteProject}
                  disabled={deleteMutation.isPending}
                  className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                >
                  {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  <Trash2 size={14} />
                  {deleteMutation.isPending ? 'Usuwanie...' : 'Usuń projekt'}
                </Button>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDrawer}>
                  {t('projects.form.actions.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
                >
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  {createMutation.isPending || updateMutation.isPending ? t('projects.form.actions.saving') : t('projects.form.actions.save')}
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
