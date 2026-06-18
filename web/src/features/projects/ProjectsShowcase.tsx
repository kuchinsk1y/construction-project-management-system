import { AlertCircle, ArrowUpDown, CalendarRange, CircleDollarSign, ExternalLink, ListFilter, Loader2, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useProjectsQuery } from '@/features/projects/useProjectsQuery'
import type { ProjectStatus } from '@/features/projects/types'

function statusTone(status: string): string {
  switch (status) {
    case 'done':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
    case 'blocked':
      return 'bg-rose-500/15 text-rose-500 border-rose-500/40'
    case 'planning':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/40'
    default:
      return 'bg-sky-500/15 text-sky-500 border-sky-500/40'
  }
}

function statusLabel(status: string): string {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function progressTone(value: number): string {
  if (value >= 80) return 'bg-emerald-500'
  if (value >= 55) return 'bg-sky-500'
  if (value >= 35) return 'bg-amber-500'
  return 'bg-rose-500'
}

function formatDate(value: string): string {
  if (!value || value === 'No deadline') return 'No deadline'

  const date = parseDateValue(value)

  if (!date) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}.${month}.${year}`
}

function parseDateValue(value: string): Date | null {
  if (!value || value === 'No deadline') return null

  const gvizMatch = value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,[^)]*)?\)$/)
  const date = gvizMatch
    ? new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3]))
    : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date
}

type SortOption = 'name-asc' | 'name-desc' | 'due-asc' | 'due-desc' | 'progress-desc' | 'budget-desc'

function formatBudget(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProjectsShowcase() {
  const { data: projects = [], isLoading, isError, error } = useProjectsQuery()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('due-asc')

  const managerOptions = useMemo(
    () => ['all', ...new Set(projects.map((project) => project.owner).filter(Boolean))],
    [projects],
  )

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
      if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
      if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
      if (sortOption === 'progress-desc') return b.progress - a.progress
      if (sortOption === 'budget-desc') return b.budget - a.budget

      const aDue = parseDateValue(a.endDate) ?? parseDateValue(a.dueDate)
      const bDue = parseDateValue(b.endDate) ?? parseDateValue(b.dueDate)
      const aTime = aDue ? aDue.getTime() : Number.POSITIVE_INFINITY
      const bTime = bDue ? bDue.getTime() : Number.POSITIVE_INFINITY
      if (sortOption === 'due-desc') return bTime - aTime
      return aTime - bTime
    })

    return sorted
  }, [projects, searchQuery, statusFilter, managerFilter, dateFromFilter, dateToFilter, sortOption])

  const activeProjects = filteredProjects.filter((item) => item.status === 'active').length
  const totalBudget = filteredProjects.reduce((sum, item) => sum + item.budget, 0)
  const avgProgress = filteredProjects.length
    ? Math.round(filteredProjects.reduce((sum, item) => sum + item.progress, 0) / filteredProjects.length)
    : 0

  return (
    <section className="grid flex-1 gap-2 p-3 md:gap-6 xl:grid-cols-12">
      <article className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm xl:col-span-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.84_0.24_128.85_/_0.16),transparent_45%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Transmisja na żywo Arkuszy Google</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Inteligencja projektowa</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/80 px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Aktywne</p>
              <p className="mt-1 text-xl font-semibold">{activeProjects}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/80 px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Budżet</p>
              <p className="mt-1 text-xl font-semibold">{formatBudget(totalBudget)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/80 px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Średni postęp</p>
              <p className="mt-1 text-xl font-semibold">{avgProgress}%</p>
            </div>
          </div>
        </div>
      </article>

      {isLoading ? (
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 xl:col-span-12">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Loader2 size={16} className="animate-spin" />
            Ładowanie projektów z Arkuszy Google...
          </div>
        </article>
      ) : null}

      {isError ? (
        <article className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 xl:col-span-12">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 text-rose-500" />
            <div>
              <p className="font-medium text-rose-500">Nie udało się pobrać projektów z Arkuszy Google</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {error instanceof Error ? error.message : 'Sprawdź PROJECTS_SPREADSHEET_ID/PROJECTS_SHEET_NAME w API i dostęp do arkusza.'}
              </p>
            </div>
          </div>
        </article>
      ) : null}

      {!isLoading && !isError && projects.length === 0 ? (
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 xl:col-span-12">
          <p className="text-sm text-[var(--muted-foreground)]">Tabela jest pusta. Dodaj wiersze projektów w arkuszu Projects.</p>
        </article>
      ) : null}

      {!isLoading && !isError && projects.length > 0 ? (
        <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Tabela projektów</p>
              <p className="text-xs text-[var(--muted-foreground)]">{filteredProjects.length} z {projects.length} wierszy z Arkuszy Google przez API</p>
            </div>

            <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-3 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--background),white_35%)]">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-8">
                <label className="relative md:col-span-2">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Поиск проекта, менеджера..."
                    aria-label="Поиск по проектам"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>

                <label className="relative md:col-span-2">
                  <ListFilter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
                    aria-label="Фильтр по статусу"
                    className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  >
                    <option value="all">Все статусы</option>
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <label className="relative md:col-span-2">
                  <UserRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <select
                    value={managerFilter}
                    onChange={(event) => setManagerFilter(event.target.value)}
                    aria-label="Фильтр по менеджеру"
                    className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  >
                    {managerOptions.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager === 'all' ? 'Все менеджеры' : manager}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="relative md:col-span-2">
                  <ArrowUpDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <select
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value as SortOption)}
                    aria-label="Сортировка проектов"
                    className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  >
                    <option value="due-asc">Срок: сначала ближние</option>
                    <option value="due-desc">Срок: сначала дальние</option>
                    <option value="name-asc">Название: A-Z</option>
                    <option value="name-desc">Название: Z-A</option>
                    <option value="progress-desc">Прогресс: высокий</option>
                    <option value="budget-desc">Бюджет: высокий</option>
                  </select>
                </label>

                <label className="relative md:col-span-2">
                  <CalendarRange size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(event) => setDateFromFilter(event.target.value)}
                    max={dateToFilter || undefined}
                    title="Дата начала фильтра"
                    aria-label="Дата начала фильтра"
                    placeholder="Дата от"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>

                <label className="relative md:col-span-2">
                  <CalendarRange size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(event) => setDateToFilter(event.target.value)}
                    min={dateFromFilter || undefined}
                    title="Дата окончания фильтра"
                    aria-label="Дата окончания фильтра"
                    placeholder="Дата до"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>

                <div className="md:col-span-4 flex items-center justify-end">
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
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--sidebar-primary)] hover:text-[var(--foreground)]"
                    >
                      Сбросить фильтры
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">Фильтры не применены</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Projekt</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Manager</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Wykonawca</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Lokalizacja</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Harmonogram</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Postęp</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Moc/Budżet</th>
                  <th className="border-b border-[var(--border)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Dokumentacja</th>
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="group transition-colors odd:bg-[var(--background)]/25 hover:bg-[var(--sidebar-accent)]/35"
                  >
                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      <p className="font-semibold leading-snug">{project.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Type: {project.projectType}</p>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(project.status)}`}>
                        {statusLabel(project.status)}
                      </span>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      <p className="font-medium">{project.owner}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Priority: {project.priority}</p>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">{project.contractor}</td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      <p>{project.location}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{project.country}</p>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      <p className="text-xs text-[var(--muted-foreground)]">Start: {formatDate(project.startDate)}</p>
                      <p className="font-medium">End: {formatDate(project.endDate || project.dueDate)}</p>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      <div className="w-40">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-[var(--muted-foreground)]">Completion</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <progress
                          value={project.progress}
                          max={100}
                          aria-label={`Прогресс ${project.name}`}
                          className="h-2 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-[var(--muted)] [&::-webkit-progress-value]:bg-[var(--sidebar-primary)] [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 [&::-moz-progress-bar]:bg-[var(--sidebar-primary)]"
                        />
                      </div>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 text-right align-top">
                      <p className="inline-flex items-center gap-1.5 font-semibold">
                        <CircleDollarSign size={14} />
                        {formatBudget(project.budget)}
                      </p>
                    </td>

                    <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                      {project.dokumentationUrl ? (
                        <a
                          href={project.dokumentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sidebar-primary)] hover:underline"
                        >
                          Open
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">No link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProjects.length === 0 ? (
              <div className="border-t border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                Ничего не найдено по текущим фильтрам.
              </div>
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  )
}
