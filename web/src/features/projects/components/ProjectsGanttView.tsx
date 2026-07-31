import { BarChart3, GanttChart, LayoutList, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import type { ProjectItem, ProjectStatus } from '@/features/projects/types'
import type { ViewMode } from './ProjectsTableView'

type MonthBounds = {
  label: string
  year: number
  month: number
  days: number
  startTs: number
  endTs: number
}

type TimelineBounds = {
  startDate: Date
  endDate: Date
  totalDuration: number
  months: MonthBounds[]
}

type ProjectsGanttViewProps = {
  filteredProjects: ProjectItem[]
  totalProjectsCount: number
  timelineBounds: TimelineBounds
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  canCreateProject: boolean
  canEditProject: boolean
  onOpenDrawer: () => void
  onSelectProject: (projectId: string) => void
  parseDateValue: (val: string) => Date | null
  formatDate: (val: string, fallback?: string) => string
  statusTone: (status: ProjectStatus) => string
  statusLabel: (status: ProjectStatus, t: TFunction) => string
}

export function ProjectsGanttView({
  filteredProjects,
  totalProjectsCount,
  timelineBounds,
  viewMode,
  setViewMode,
  canCreateProject,
  canEditProject,
  onOpenDrawer,
  onSelectProject,
  parseDateValue,
  formatDate,
  statusTone,
  statusLabel,
}: ProjectsGanttViewProps) {
  const { t } = useTranslation()

  // Calculate position of today line
  const now = new Date()
  let todayOffsetPct = -1
  if (
    timelineBounds.startDate &&
    timelineBounds.endDate &&
    now >= timelineBounds.startDate &&
    now <= timelineBounds.endDate &&
    timelineBounds.totalDuration > 0
  ) {
    const todayOffset = now.getTime() - timelineBounds.startDate.getTime()
    todayOffsetPct = (todayOffset / timelineBounds.totalDuration) * 100
  }

  return (
    <article className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xs animate-fade-in">
      {/* Gantt Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-3 sm:px-4 sm:py-3.5">
        <div>
          <p className="text-sm font-bold tracking-tight flex items-center gap-2 text-[var(--foreground)]">
            <GanttChart size={16} className="text-[var(--sidebar-primary)]" />
            <span>Wykres Gantta projektów</span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Harmonogram czasowy dla {filteredProjects.length} z {totalProjectsCount} projektów
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[var(--sidebar-primary)] shadow-2xs" />
              <span className="text-[var(--muted-foreground)]">Plan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
              <span className="text-[var(--muted-foreground)]">Fakt</span>
            </div>
          </div>

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

      {/* Gantt Timeline Container with Sticky Left Column */}
      <div className="w-full p-2 sm:p-4 overflow-hidden">
        <div className="w-full overflow-x-auto touch-pan-x hide-scrollbar border border-zinc-200/60 dark:border-zinc-800/40 rounded-xl bg-[var(--background)]/35">
          <div className="min-w-[750px] md:min-w-[900px] flex flex-col">
            {/* Gantt Header Months */}
            <div className="grid grid-cols-12 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-[var(--card)]/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] sticky top-0 z-30">
              {/* Sticky Left Column Header */}
              <div className="col-span-3 px-3 py-2.5 border-r border-zinc-200/60 dark:border-zinc-800/40 font-extrabold text-[var(--foreground)] flex items-center gap-1.5 sticky left-0 z-40 bg-[var(--card)] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                <span>Projekt & Kierownik</span>
              </div>
              <div className="col-span-9 grid relative" style={{ gridTemplateColumns: `repeat(${timelineBounds.months.length}, minmax(0, 1fr))` }}>
                {timelineBounds.months.map((m) => (
                  <div key={`${m.year}-${m.month}`} className="px-1.5 py-2.5 text-center border-r border-zinc-200/40 dark:border-zinc-800/10 truncate font-semibold">
                    {m.label}
                  </div>
                ))}

                {/* Today Line in Month Header */}
                {todayOffsetPct >= 0 && (
                  <div
                    style={{ left: `${todayOffsetPct}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 dark:bg-rose-500/60 pointer-events-none z-30"
                  >
                    <span className="absolute top-0 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-extrabold px-1 py-0.5 rounded shadow-xs uppercase tracking-wider">
                      Dziś
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="divide-y divide-zinc-200/40 dark:divide-zinc-800/15">
              {filteredProjects.map((project, idx) => {
                const pStart = parseDateValue(project.startDate)
                const pEnd = parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
                const fStart = parseDateValue(project.startDateFact)
                const fEnd = parseDateValue(project.endDateFact)

                let planLeft = 0
                let planWidth = 0
                if (pStart && pEnd && timelineBounds.totalDuration > 0) {
                  const startOffset = Math.max(0, pStart.getTime() - timelineBounds.startDate.getTime())
                  const duration = Math.max(86400000, pEnd.getTime() - pStart.getTime())
                  planLeft = (startOffset / timelineBounds.totalDuration) * 100
                  planWidth = (duration / timelineBounds.totalDuration) * 100
                  if (planLeft + planWidth > 100) planWidth = 100 - planLeft
                }

                let factLeft = 0
                let factWidth = 0
                if (fStart && fEnd && timelineBounds.totalDuration > 0) {
                  const startOffset = Math.max(0, fStart.getTime() - timelineBounds.startDate.getTime())
                  const duration = Math.max(86400000, fEnd.getTime() - fStart.getTime())
                  factLeft = (startOffset / timelineBounds.totalDuration) * 100
                  factWidth = (duration / timelineBounds.totalDuration) * 100
                  if (factLeft + factWidth > 100) factWidth = 100 - factLeft
                }

                return (
                  <div
                    key={project.id}
                    onClick={() => canEditProject && onSelectProject(project.id)}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className={`grid grid-cols-12 group hover:bg-[var(--sidebar-primary)]/[0.03] dark:hover:bg-zinc-800/[0.15] transition-colors items-center py-2 ${canEditProject ? 'cursor-pointer' : ''}`}
                  >
                    {/* Left Column: Sticky Project Info */}
                    <div className="col-span-3 px-3 py-1.5 border-r border-zinc-200/60 dark:border-zinc-800/40 flex flex-col justify-center gap-0.5 sticky left-0 z-20 bg-[var(--card)] group-hover:bg-[var(--card)] transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-[var(--foreground)] truncate group-hover:text-[var(--sidebar-primary)] transition duration-200">
                          {project.name}
                        </span>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusTone(project.status)}`}>
                          {statusLabel(project.status, t)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                        <span className="truncate max-w-[150px] font-medium">{project.owner || 'Brak kierownika'}</span>
                      </div>
                    </div>

                    {/* Right Column: Timeline Bars Grid */}
                    <div className="col-span-9 relative h-10 flex items-center px-1">
                      {/* Background Month Grid Lines */}
                      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${timelineBounds.months.length}, minmax(0, 1fr))` }}>
                        {timelineBounds.months.map((_, i) => (
                          <div key={i} className="border-r border-zinc-200/25 dark:border-zinc-800/10 h-full last:border-r-0" />
                        ))}
                      </div>

                      {/* Timeline Bars Container */}
                      <div className="relative w-full h-8 flex flex-col justify-center gap-1 z-10">
                        {/* Today Line Inside Row */}
                        {todayOffsetPct >= 0 && (
                          <div
                            style={{ left: `${todayOffsetPct}%` }}
                            className="absolute top-0 bottom-0 w-px border-l border-dashed border-rose-400/50 dark:border-rose-400/30 pointer-events-none z-0"
                          />
                        )}

                        {/* Planned Bar */}
                        {planWidth > 0 ? (
                          <div
                            style={{ left: `${planLeft}%`, width: `${Math.max(2.5, planWidth)}%` }}
                            className="absolute top-0.5 h-3 rounded-full bg-gradient-to-r from-[var(--sidebar-primary)]/80 to-[var(--sidebar-primary)] shadow-[0_1.5px_6px_-0.5px_rgba(79,70,229,0.25)] hover:brightness-105 transition-all duration-200 group/bar cursor-pointer z-10"
                          >
                            <div className="opacity-0 scale-95 group-hover/bar:opacity-100 group-hover/bar:scale-100 transition-all duration-200 absolute left-1/2 -top-8 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[var(--popover)]/90 backdrop-blur-md text-[10px] font-bold text-[var(--popover-foreground)] border border-zinc-200/50 dark:border-zinc-800/50 shadow-md whitespace-nowrap z-30 pointer-events-none">
                              <span className="text-[var(--sidebar-primary)] mr-1">Plan:</span>
                              {formatDate(project.startDate)} – {formatDate(project.endDate)}
                            </div>
                          </div>
                        ) : null}

                        {/* Fact Bar */}
                        {factWidth > 0 ? (
                          <div
                            style={{ left: `${factLeft}%`, width: `${Math.max(2.5, factWidth)}%` }}
                            className="absolute bottom-0.5 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_1.5px_6px_-0.5px_rgba(16,185,129,0.25)] hover:brightness-105 transition-all duration-200 group/factbar cursor-pointer z-10"
                          >
                            <div className="opacity-0 scale-95 group-hover/factbar:opacity-100 group-hover/factbar:scale-100 transition-all duration-200 absolute left-1/2 -bottom-8 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[var(--popover)]/90 backdrop-blur-md text-[10px] font-bold text-[var(--popover-foreground)] border border-zinc-200/50 dark:border-zinc-800/50 shadow-md whitespace-nowrap z-30 pointer-events-none">
                              <span className="text-emerald-500 mr-1">Fakt:</span>
                              {formatDate(project.startDateFact)} – {formatDate(project.endDateFact)}
                            </div>
                          </div>
                        ) : null}

                        {/* Fallback if no dates set */}
                        {planWidth === 0 && factWidth === 0 && (
                          <span className="text-[10px] text-[var(--muted-foreground)]/60 italic px-2">Brak dat harmonogramu</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredProjects.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-[var(--muted-foreground)]">
                  {t('projects.states.noResults')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
