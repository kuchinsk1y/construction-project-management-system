import { GanttChart, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ProjectItem, ProjectStatus } from '@/features/projects/types'

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
  canCreateProject: boolean
  canEditProject: boolean
  onOpenDrawer: () => void
  onSelectProject: (projectId: string) => void
  parseDateValue: (val: string) => Date | null
  formatDate: (val: string, fallback?: string) => string
  statusTone: (status: ProjectStatus) => string
  statusLabel: (status: ProjectStatus, t: any) => string
}

export function ProjectsGanttView({
  filteredProjects,
  totalProjectsCount,
  timelineBounds,
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

  return (
    <article className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm animate-fade-in">
      {/* Gantt Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <GanttChart size={16} className="text-[var(--sidebar-primary)]" />
            <span>Wykres Gantta projektów</span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Harmonogram czasowy realizacji dla {filteredProjects.length} z {totalProjectsCount} projektów
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[var(--sidebar-primary)] shadow-2xs" />
              <span className="text-[var(--muted-foreground)]">Plan (Harmonogram)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
              <span className="text-[var(--muted-foreground)]">Fakt (Realizacja)</span>
            </div>
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
      </div>

      {/* Gantt Timeline Container */}
      <div className="w-full p-4 overflow-hidden">
        <div className="w-full overflow-x-auto custom-scrollbar border border-[var(--border)] rounded-xl bg-[var(--background)]/35">
          <div className="min-w-[900px] flex flex-col">
            {/* Gantt Header Months */}
            <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--card)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="col-span-3 px-3 py-2.5 border-r border-[var(--border)] font-extrabold text-[var(--foreground)] flex items-center gap-1.5">
                <span>Projekt & Kierownik</span>
              </div>
              <div className="col-span-9 grid" style={{ gridTemplateColumns: `repeat(${timelineBounds.months.length}, minmax(0, 1fr))` }}>
                {timelineBounds.months.map((m) => (
                  <div key={`${m.year}-${m.month}`} className="px-2 py-2.5 text-center border-r border-[var(--border)]/40 truncate">
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="divide-y divide-[var(--border)]/40">
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
                    className={`grid grid-cols-12 group hover:bg-[var(--sidebar-primary)]/[0.045] transition-colors items-center py-2.5 ${canEditProject ? 'cursor-pointer' : ''}`}
                  >
                    {/* Left Column: Project Info */}
                    <div className="col-span-3 px-3 py-1 border-r border-[var(--border)]/60 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-[var(--foreground)] truncate group-hover:text-[var(--sidebar-primary)] transition">
                          {project.name}
                        </span>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusTone(project.status)}`}>
                          {statusLabel(project.status, t)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                        <span className="truncate max-w-[120px]">{project.owner || 'Brak kierownika'}</span>
                        <span className="font-semibold text-[var(--foreground)]">{project.progress}%</span>
                      </div>
                    </div>

                    {/* Right Column: Timeline Bars Grid */}
                    <div className="col-span-9 relative h-10 flex items-center px-1">
                      {/* Background Month Grid Lines */}
                      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${timelineBounds.months.length}, minmax(0, 1fr))` }}>
                        {timelineBounds.months.map((m, i) => (
                          <div key={i} className="border-r border-[var(--border)]/20 h-full" />
                        ))}
                      </div>

                      {/* Timeline Bars Container */}
                      <div className="relative w-full h-8 flex flex-col justify-center gap-1 z-1">
                        {/* Planned Bar */}
                        {planWidth > 0 ? (
                          <div
                            style={{ left: `${planLeft}%`, width: `${Math.max(2, planWidth)}%` }}
                            className="absolute top-0 h-3 rounded-full bg-gradient-to-r from-[var(--sidebar-primary)]/80 to-[var(--sidebar-primary)] shadow-2xs hover:brightness-110 transition-all group/bar"
                          >
                            <span className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute left-1/2 -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[var(--popover)] text-[10px] font-bold text-[var(--popover-foreground)] border border-[var(--border)] shadow-md whitespace-nowrap z-30 pointer-events-none">
                              Plan: {formatDate(project.startDate)} – {formatDate(project.endDate)}
                            </span>
                          </div>
                        ) : null}

                        {/* Fact Bar */}
                        {factWidth > 0 ? (
                          <div
                            style={{ left: `${factLeft}%`, width: `${Math.max(2, factWidth)}%` }}
                            className="absolute bottom-0 h-3 rounded-full bg-emerald-500 shadow-2xs hover:brightness-110 transition-all group/factbar"
                          >
                            <span className="opacity-0 group-hover/factbar:opacity-100 transition-opacity absolute left-1/2 -bottom-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[var(--popover)] text-[10px] font-bold text-[var(--popover-foreground)] border border-[var(--border)] shadow-md whitespace-nowrap z-30 pointer-events-none">
                              Fakt: {formatDate(project.startDateFact)} – {formatDate(project.endDateFact)}
                            </span>
                          </div>
                        ) : null}

                        {/* Fallback if no dates set */}
                        {planWidth === 0 && factWidth === 0 && (
                          <span className="text-[10px] text-[var(--muted-foreground)] italic px-2">Brak dat harmonogramu</span>
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
