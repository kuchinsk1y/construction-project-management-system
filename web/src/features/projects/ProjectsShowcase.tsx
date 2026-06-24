import { AlertCircle, ArrowUpDown, CalendarRange, CircleDollarSign, Edit, ExternalLink, Folder, ListFilter, Loader2, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { useMemo, useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { createProject, deleteProject, fetchContractors, fetchProjectTypes, fetchProjects, updateProject } from '@/features/projects/api'
import { useProjectsQuery } from '@/features/projects/useProjectsQuery'
import type { CreateProjectPayload, ProjectStatus, ApiProject } from '@/features/projects/types'
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

function formatBudget(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
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
      setDrawerOpen(false)
      setFormState(emptyForm)
      setEditingProject(null)
      setFormError('')
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
      setDrawerOpen(false)
      setFormState(emptyForm)
      setEditingProject(null)
      setFormError('')
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : t('projects.form.error.defaultMessage'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDrawerOpen(false)
      setFormState(emptyForm)
      setEditingProject(null)
      setFormError('')
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
          <article className="self-start overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-12">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
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

              <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-2.5 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--background),white_35%)]">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                  <label className="relative md:col-span-2">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t('projects.filters.searchPlaceholder')}
                      aria-label={t('projects.filters.searchAria')}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>

                  <label className="relative md:col-span-2">
                    <ListFilter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
                      aria-label={t('projects.filters.statusAria')}
                      className="h-9 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    >
                      <option value="all">{t('projects.filters.allStatuses')}</option>
                      <option value="active">{t('projects.status.active')}</option>
                      <option value="planning">{t('projects.status.planning')}</option>
                      <option value="blocked">{t('projects.status.blocked')}</option>
                      <option value="done">{t('projects.status.done')}</option>
                    </select>
                  </label>

                  <label className="relative md:col-span-2">
                    <UserRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <select
                      value={managerFilter}
                      onChange={(event) => setManagerFilter(event.target.value)}
                      aria-label={t('projects.filters.managerAria')}
                      className="h-9 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    >
                      {managerOptions.map((manager) => (
                        <option key={manager} value={manager}>
                          {manager === 'all' ? t('projects.filters.allManagers') : manager}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="relative md:col-span-2">
                    <CalendarRange size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      type="date"
                      value={dateFromFilter}
                      onChange={(event) => setDateFromFilter(event.target.value)}
                      max={dateToFilter || undefined}
                      title={t('projects.filters.fromTitle')}
                      aria-label={t('projects.filters.fromAria')}
                      placeholder={t('projects.filters.fromPlaceholder')}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>

                  <label className="relative md:col-span-2">
                    <CalendarRange size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      type="date"
                      value={dateToFilter}
                      onChange={(event) => setDateToFilter(event.target.value)}
                      min={dateFromFilter || undefined}
                      title={t('projects.filters.toTitle')}
                      aria-label={t('projects.filters.toAria')}
                      placeholder={t('projects.filters.toPlaceholder')}
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>

                  <div className="md:col-span-6 flex items-center justify-end">
                    {(searchQuery || statusFilter !== 'all' || managerFilter !== 'all' || dateFromFilter || dateToFilter) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('all')
                          setManagerFilter('all')
                          setDateFromFilter('')
                          setDateToFilter('')
                        }}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--sidebar-primary)] hover:text-[var(--foreground)]"
                      >
                        {t('projects.filters.reset')}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">{t('projects.filters.idle')}</span>
                    )}
                  </div>
                </div>
              </div>
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
                        <p className="text-xs text-[var(--muted-foreground)]">{t('projects.table.row.start')}: {formatDate(project.startDate, t('projects.date.noDeadline'))}</p>
                        <p className="font-medium">{t('projects.table.row.end')}: {formatDate(project.endDate || project.dueDate, t('projects.date.noDeadline'))}</p>
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
        ) : null}
      </section>

      {/* Drawer backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setDrawerOpen(false)}
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
          <Button size="icon-sm" variant="outline" onClick={() => setDrawerOpen(false)} aria-label={t('projects.form.actions.cancel')}>
            <X size={16} />
          </Button>
        </div>

        {/* Drawer form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

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
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
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
              {t('projects.form.sections.dates')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.startDate')}</span>
                <input
                  type="date"
                  value={formState.startDateContract ?? ''}
                  onChange={(e) => setField('startDateContract', e.target.value)}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('projects.form.labels.endDate')}</span>
                <input
                  type="date"
                  value={formState.endDateContract ?? ''}
                  onChange={(e) => setField('endDateContract', e.target.value)}
                  min={formState.startDateContract || undefined}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>
            </div>
          </div>

          {/* Validation error */}
          {formError ? (
            <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
              {formError}
            </p>
          ) : null}
        </div>

        {/* Drawer footer */}
        <div className="shrink-0 border-t border-[var(--border)] px-5 py-4 flex flex-col gap-3">
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
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
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
        </div>
      </aside>
    </>
  )
}
