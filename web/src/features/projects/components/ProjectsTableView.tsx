import { ArrowUpDown, BarChart3, Calendar, ChevronRight, LayoutList, MapPin, Plus, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import type { ProjectItem, ProjectStatus } from '@/features/projects/types'

export type ViewMode = 'table' | 'gantt'

export type SortColumn =
  | 'project'
  | 'status'
  | 'manager'
  | 'contractor'
  | 'location'
  | 'schedule'
  | 'progress'

export type SortDirection = 'asc' | 'desc'

type ProjectsTableViewProps = {
  filteredProjects: ProjectItem[]
  totalProjectsCount: number
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  canCreateProject: boolean
  canEditProject: boolean
  onOpenDrawer: () => void
  onSelectProject: (projectId: string) => void
  formatDate: (val: string, fallback?: string) => string
  statusTone: (status: ProjectStatus) => string
  statusLabel: (status: ProjectStatus, t: TFunction) => string
}

export function ProjectsTableView({
  filteredProjects,
  totalProjectsCount,
  sortColumn,
  onSort,
  viewMode,
  setViewMode,
  canCreateProject,
  canEditProject,
  onOpenDrawer,
  onSelectProject,
  formatDate,
  statusTone,
  statusLabel,
}: ProjectsTableViewProps) {
  const { t } = useTranslation()

  return (
    <article className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xs">
      {/* Table Card Header with View Switcher & Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-3 sm:px-4 sm:py-3.5">
        <div>
          <p className="text-sm font-bold tracking-tight text-[var(--foreground)]">{t('projects.table.title')}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t('projects.table.rows', { filtered: filteredProjects.length, total: totalProjectsCount })}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              title="Tabela projektów"
            >
              <LayoutList size={13} />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'gantt'
                  ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              title="Wykres Gantta"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">Wykres Gantta</span>
            </button>
          </div>

          {canCreateProject ? (
            <Button
              type="button"
              onClick={onOpenDrawer}
              className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 h-9 px-3"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t('projects.addButton')}</span>
              <span className="sm:hidden">Dodaj</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* MOBILE & TABLET CARD GRID (< 1024px) */}
      <div className="block lg:hidden p-3 space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            {t('projects.states.noResults')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProjects.map((project, index) => {
              const hasFactDates = Boolean(project.startDateFact || project.endDateFact)
              const startPlan = formatDate(project.startDate, '–')
              const endPlan = formatDate(project.endDate, '–')
              const hasPlanDates = startPlan !== '–' || endPlan !== '–'

              return (
                <div
                  key={project.id}
                  onClick={() => canEditProject && onSelectProject(project.id)}
                  style={{ animationDelay: `${index * 30}ms` }}
                  className={`group relative rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-3.5 transition-all duration-200 hover:border-[var(--sidebar-primary)]/40 hover:bg-[var(--background)] hover:shadow-md animate-row-fade-in ${
                    canEditProject ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Card Header: Title, Type & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm leading-snug text-[var(--foreground)] group-hover:text-[var(--sidebar-primary)] transition-colors truncate">
                        {project.name}
                      </h3>
                      {project.projectType && project.projectType !== '-' ? (
                        <p className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)] truncate">
                          {project.projectType}
                        </p>
                      ) : null}
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(project.status)}`}>
                      {statusLabel(project.status, t)}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-1.5 text-xs text-[var(--muted-foreground)] mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate">
                        <User size={12} className="shrink-0 text-[var(--sidebar-primary)]" />
                        <span className="font-semibold text-[var(--foreground)]">{project.owner || 'Brak kierownika'}</span>
                      </span>
                      <span className="shrink-0 text-[11px] bg-[var(--muted)]/50 px-1.5 py-0.5 rounded">
                        {project.contractor || 'Brak wykonawcy'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={12} className="shrink-0" />
                        <span>{project.location}</span>
                      </span>

                      {/* Dates Tag */}
                      <span className="flex items-center gap-1 shrink-0 text-[11px]">
                        <Calendar size={11} className="shrink-0" />
                        {hasFactDates ? (
                          <span className="text-emerald-500 font-semibold">
                            Fakt: {project.startDateFact ? formatDate(project.startDateFact, '–') : '–'}
                          </span>
                        ) : hasPlanDates ? (
                          <span>
                            {startPlan} – {endPlan}
                          </span>
                        ) : (
                          <span className="italic text-[var(--muted-foreground)]/70">Brak terminu</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Card edit link indicator */}
                  {canEditProject ? (
                    <div className="pt-2 border-t border-[var(--border)]/50 flex items-center justify-end gap-3">
                      <ChevronRight size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--sidebar-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>= 1024px) */}
      <div className="hidden lg:block overflow-x-auto hide-scrollbar">
        <table className="w-full whitespace-nowrap border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('project')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer">
                  {t('projects.table.columns.project')}
                  <ArrowUpDown size={12} className={sortColumn === 'project' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('status')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer">
                  {t('projects.table.columns.status')}
                  <ArrowUpDown size={12} className={sortColumn === 'status' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('manager')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer">
                  {t('projects.table.columns.manager')}
                  <ArrowUpDown size={12} className={sortColumn === 'manager' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('contractor')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer">
                  {t('projects.table.columns.contractor')}
                  <ArrowUpDown size={12} className={sortColumn === 'contractor' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('location')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer">
                  {t('projects.table.columns.location')}
                  <ArrowUpDown size={12} className={sortColumn === 'location' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('schedule')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition cursor-pointer">
                  {t('projects.table.columns.schedule')}
                  <ArrowUpDown size={12} className={sortColumn === 'schedule' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>

            </tr>
          </thead>

          <tbody>
            {filteredProjects.map((project, index) => {
              const hasFactDates = Boolean(project.startDateFact || project.endDateFact)
              const startPlan = formatDate(project.startDate, '–')
              const endPlan = formatDate(project.endDate, '–')
              const hasPlanDates = startPlan !== '–' || endPlan !== '–'

              return (
                <tr
                  key={project.id}
                  onClick={() => canEditProject && onSelectProject(project.id)}
                  style={{ animationDelay: `${index * 25}ms` }}
                  className={`group relative transition-all duration-300 ease-out border-b border-[var(--border)]/50 odd:bg-[var(--background)]/20 hover:bg-[var(--sidebar-primary)]/[0.045] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] animate-row-fade-in ${canEditProject ? 'cursor-pointer' : ''}`}
                >
                  <td className="relative px-4 py-3.5 align-middle">
                    {/* Premium left accent indicator bar */}
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--sidebar-primary)] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out shadow-[0_0_10px_var(--sidebar-primary)]" />
                    <p className="font-bold text-sm leading-snug text-[var(--foreground)] group-hover:text-[var(--sidebar-primary)] group-hover:translate-x-1 transition-all duration-300 ease-out">
                      {project.name}
                    </p>
                    {project.projectType && project.projectType !== '-' ? (
                      <p className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)] group-hover:translate-x-1 transition-all duration-300 ease-out">
                        {project.projectType}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5 align-middle">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(project.status)}`}>
                      {statusLabel(project.status, t)}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 align-middle">
                    <p className="font-semibold text-xs text-[var(--foreground)]">{project.owner}</p>
                  </td>

                  <td className="px-4 py-3.5 align-middle text-xs font-medium text-[var(--foreground)]">
                    {project.contractor}
                  </td>

                  <td className="px-4 py-3.5 align-middle text-xs">
                    <p className="font-semibold text-[var(--foreground)]">{project.location}</p>
                  </td>

                  <td className="px-4 py-3.5 align-middle text-xs">
                    {hasFactDates ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-500 font-semibold shadow-2xs">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Fakt: {project.startDateFact ? formatDate(project.startDateFact, '–') : '–'} – {project.endDateFact ? formatDate(project.endDateFact, '–') : '–'}</span>
                      </div>
                    ) : hasPlanDates ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 px-2.5 py-1 text-[var(--muted-foreground)] font-medium">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/70">Plan:</span>
                        <span>{startPlan} – {endPlan}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--muted-foreground)] italic">Brak terminu</span>
                    )}
                  </td>


                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredProjects.length === 0 ? (
          <div className="border-t border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
            {t('projects.states.noResults')}
          </div>
        ) : null}
      </div>
    </article>
  )
}
