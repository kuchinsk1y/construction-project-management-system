import { ArrowUpDown, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ProjectItem, ProjectStatus } from '@/features/projects/types'

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
  canCreateProject: boolean
  canEditProject: boolean
  onOpenDrawer: () => void
  onSelectProject: (projectId: string) => void
  formatDate: (val: string, fallback?: string) => string
  statusTone: (status: ProjectStatus) => string
  statusLabel: (status: ProjectStatus, t: any) => string
}

export function ProjectsTableView({
  filteredProjects,
  totalProjectsCount,
  sortColumn,
  onSort,
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
    <article className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{t('projects.table.title')}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t('projects.table.rows', { filtered: filteredProjects.length, total: totalProjectsCount })}
          </p>
        </div>

        {canCreateProject ? (
          <Button
            type="button"
            onClick={onOpenDrawer}
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
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('project')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.project')}
                  <ArrowUpDown size={12} className={sortColumn === 'project' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('status')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.status')}
                  <ArrowUpDown size={12} className={sortColumn === 'status' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('manager')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.manager')}
                  <ArrowUpDown size={12} className={sortColumn === 'manager' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('contractor')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.contractor')}
                  <ArrowUpDown size={12} className={sortColumn === 'contractor' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('location')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.location')}
                  <ArrowUpDown size={12} className={sortColumn === 'location' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('schedule')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.schedule')}
                  <ArrowUpDown size={12} className={sortColumn === 'schedule' ? 'text-[var(--foreground)]' : ''} />
                </button>
              </th>
              <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <button type="button" onClick={() => onSort('progress')} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition">
                  {t('projects.table.columns.progress')}
                  <ArrowUpDown size={12} className={sortColumn === 'progress' ? 'text-[var(--foreground)]' : ''} />
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
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{t('projects.table.row.priority')}: {project.priority}</p>
                  </td>

                  <td className="px-4 py-3.5 align-middle text-xs font-medium text-[var(--foreground)]">
                    {project.contractor}
                  </td>

                  <td className="px-4 py-3.5 align-middle text-xs">
                    <p className="font-semibold text-[var(--foreground)]">{project.location}</p>
                  </td>

                  <td className="px-4 py-3.5 align-middle text-xs">
                    {hasFactDates ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-500 font-semibold shadow-xs">
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

                  <td className="px-4 py-3.5 align-middle">
                    <div className="w-36">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--muted-foreground)]">{t('projects.table.row.completion')}</span>
                        <span className="font-semibold">{project.progress}%</span>
                      </div>
                      <progress
                        value={project.progress}
                        max={100}
                        aria-label={`${t('projects.table.row.completion')} ${project.name}`}
                        className="h-2 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-[var(--muted)] [&::-webkit-progress-value]:bg-[var(--sidebar-primary)] [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 [&::-moz-progress-bar]:bg-[var(--sidebar-primary)]"
                      />
                    </div>
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
