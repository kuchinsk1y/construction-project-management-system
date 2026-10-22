import { BarChart3, GanttChart, LayoutList, Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import type { ProjectItem, ProjectStatus } from '@/features/projects/types'
import type { ViewMode } from '@/features/projects/pages/ProjectsShowcase/components/ProjectsTableView'
import { fetchDashboardSummary } from '@/features/workspace/api/dashboard'

// ─── Types ──────────────────────────────────────────────────────────────────

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

type Range = '3m' | '12m' | 'all'

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
  statusTone: (status: ProjectStatus) => string
  statusLabel: (status: ProjectStatus, t: TFunction) => string
}

type BarState = 'completed' | 'in_progress' | 'not_started' | 'blocked'

type GanttRow = {
  project: ProjectItem
  start: Date
  end: Date
  progress: number | null
  state: BarState
  overdue: boolean
}

// Same group order as a project lifecycle
const GROUPS: Array<{ status: ProjectStatus; label: string }> = [
  { status: 'active', label: 'Aktywne' },
  { status: 'blocked', label: 'Wstrzymane' },
  { status: 'planning', label: 'Planowanie' },
  { status: 'done', label: 'Zakończone' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function formatDate(d: Date) {
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function barState(status: ProjectStatus): BarState {
  if (status === 'done') return 'completed'
  if (status === 'active') return 'in_progress'
  if (status === 'blocked') return 'blocked'
  return 'not_started'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProjectsGanttView({
  filteredProjects,
  totalProjectsCount,
  viewMode,
  setViewMode,
  canCreateProject,
  canEditProject,
  onOpenDrawer,
  onSelectProject,
  parseDateValue,
  statusLabel,
}: ProjectsGanttViewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLElement>(null)
  const [range, setRange] = useState<Range>('12m')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; row: GanttRow } | null>(null)

  // Project progress is computed from daily reports on the backend (same source as the dashboard)
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  })

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const rows = useMemo<GanttRow[]>(() => {
    return filteredProjects
      .map((project) => {
        const start = parseDateValue(project.startDateFact) ?? parseDateValue(project.startDate)
        const end = parseDateValue(project.endDateFact) ?? parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
        if (!start || !end) return null
        const state = barState(project.status)
        const progress = state === 'completed' ? 100 : summary?.projectProgress?.[project.id] ?? null
        return {
          project,
          start,
          end: end < start ? start : end,
          progress,
          state,
          overdue: state !== 'completed' && end < today,
        }
      })
      .filter((row): row is GanttRow => row !== null)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [filteredProjects, parseDateValue, summary, today])

  const undatedCount = filteredProjects.length - rows.length

  const groups = useMemo(
    () => GROUPS
      .map((g) => ({ ...g, rows: rows.filter((r) => r.project.status === g.status) }))
      .filter((g) => g.rows.length > 0),
    [rows],
  )

  const { columns, startTime, endTime, totalMs } = useMemo(() => {
    let minT: number
    let maxT: number
    if (range === '3m') {
      minT = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime()
      maxT = new Date(today.getFullYear(), today.getMonth() + 2, 1).getTime()
    } else if (range === '12m') {
      minT = new Date(today.getFullYear(), today.getMonth() - 4, 1).getTime()
      maxT = new Date(today.getFullYear(), today.getMonth() + 8, 1).getTime()
    } else {
      minT = rows.length ? Math.min(...rows.map((r) => r.start.getTime())) : today.getTime()
      maxT = rows.length ? Math.max(...rows.map((r) => r.end.getTime())) : today.getTime()
      const first = new Date(minT)
      const last = new Date(maxT)
      minT = new Date(first.getFullYear(), first.getMonth(), 1).getTime()
      maxT = new Date(last.getFullYear(), last.getMonth() + 1, 1).getTime()
    }

    const cols: Array<{ date: Date; label: string; isCurrent: boolean }> = []
    if (range === '3m') {
      // Weekly columns starting on Monday
      const cursor = new Date(minT)
      cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
      minT = cursor.getTime()
      while (cursor.getTime() < maxT) {
        const weekEnd = cursor.getTime() + 7 * DAY_MS
        cols.push({
          date: new Date(cursor),
          label: cursor.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
          isCurrent: today.getTime() >= cursor.getTime() && today.getTime() < weekEnd,
        })
        cursor.setDate(cursor.getDate() + 7)
      }
      maxT = cursor.getTime()
    } else {
      // Monthly columns
      const cursor = new Date(minT)
      while (cursor.getTime() < maxT) {
        cols.push({
          date: new Date(cursor),
          label: cursor.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' }),
          isCurrent: cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth(),
        })
        cursor.setMonth(cursor.getMonth() + 1)
      }
    }
    return { columns: cols, startTime: minT, endTime: maxT, totalMs: Math.max(1, maxT - minT) }
  }, [range, rows, today])

  // Long ranges show every n-th label to stay readable
  const labelEvery = columns.length > 18 ? Math.ceil(columns.length / 12) : 1
  const minWidth = Math.max(750, columns.length * (range === '3m' ? 56 : 52) + 260)

  const handleMouseMove = (e: React.MouseEvent, row: GanttRow) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const tooltipWidth = 260
    const tooltipHeight = 150
    let x = e.clientX - rect.left + 15
    let y = e.clientY - rect.top + 15
    if (e.clientX + tooltipWidth > window.innerWidth) x = e.clientX - rect.left - tooltipWidth - 10
    if (e.clientY + tooltipHeight > window.innerHeight) y = e.clientY - rect.top - tooltipHeight - 10
    setTooltip({ x, y, row })
  }

  const handleMouseLeave = () => setTooltip(null)

  const todayInView = today.getTime() >= startTime && today.getTime() <= endTime
  const todayPercent = ((today.getTime() - startTime) / totalMs) * 100

  return (
    <article ref={containerRef} className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xs animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-3 sm:px-4 sm:py-3.5">
        <div>
          <p className="text-sm font-bold tracking-tight flex items-center gap-2 text-[var(--foreground)]">
            <GanttChart size={16} className="text-[var(--sidebar-primary)]" />
            <span>Wykres Gantta projektów</span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Harmonogram dla {filteredProjects.length} z {totalProjectsCount} projektów
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0 flex-wrap">
          {/* Range switcher (same control as on the project Pulpit) */}
          <div className="flex bg-[var(--muted)]/50 p-0.5 rounded-lg border border-[var(--border)]">
            {([
              { value: '3m', label: '3 Miesiące' },
              { value: '12m', label: 'Rok' },
              { value: 'all', label: 'Wszystkie' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${range === opt.value
                  ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'table'
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
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'gantt'
                ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              title="Wykres Gantta"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">Gantt</span>
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

      {/* Timeline — same look as the works timeline on the project Pulpit */}
      <div className="flex-1 min-w-0 w-full p-3 overflow-x-auto overflow-y-hidden custom-scrollbar bg-white dark:bg-transparent">
        <div style={{ minWidth: `${minWidth}px` }}>
          {/* Header row */}
          <div className="flex items-end mb-2 relative">
            <div className="w-64 shrink-0 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)]">
              Projekt
            </div>
            <div className="flex-1 flex relative pb-2">
              {columns.map((col, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end relative z-20 min-w-0">
                  {i % labelEvery === 0 || col.isCurrent ? (
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${col.isCurrent ? 'bg-[var(--sidebar-primary)] text-white px-2.5 py-0.5 rounded-full shadow-md z-10' : 'text-[var(--muted-foreground)]'}`}>
                      {col.label}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="relative border-t border-[var(--border)] pt-2 min-h-[100px]">
            {/* Today line */}
            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex z-0">
              <div className="w-64 shrink-0" />
              <div className="flex-1 relative">
                {todayInView ? (
                  <div className="absolute top-0 bottom-0 border-l-[1.5px] border-dashed border-[var(--sidebar-primary)] opacity-50" style={{ left: `${todayPercent}%`, transform: 'translateX(-50%)' }} />
                ) : null}
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[var(--muted-foreground)] z-20">
                {filteredProjects.length === 0 ? t('projects.states.noResults') : 'Brak projektów z terminami'}
              </div>
            ) : (
              <div className="flex flex-col relative z-10 pb-2">
                {groups.map((group, gIdx) => (
                  <div key={group.status} className={`flex flex-col ${gIdx > 0 ? 'mt-3' : ''}`}>
                    {/* Group header */}
                    <div className="flex items-center relative mb-1.5">
                      <div className="w-64 shrink-0 pr-4 z-10">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--sidebar-primary)]/10">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--sidebar-primary)]">
                            {group.label} · {group.rows.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 relative flex items-center h-full">
                        <div className="absolute left-0 right-0 h-[1px] bg-[var(--border)]" />
                      </div>
                    </div>

                    {/* Projects in this group */}
                    <div className="flex flex-col gap-1.5">
                      {group.rows.map((row) => {
                        const startT = Math.max(row.start.getTime(), startTime)
                        const endT = Math.min(row.end.getTime(), endTime)
                        const leftPercent = ((startT - startTime) / totalMs) * 100
                        const widthPercent = ((endT - startT + DAY_MS) / totalMs) * 100
                        const outOfView = row.end.getTime() < startTime || row.start.getTime() > endTime

                        return (
                          <div
                            key={row.project.id}
                            className={`flex items-center group relative ${canEditProject ? 'cursor-pointer' : ''}`}
                            onClick={() => canEditProject && onSelectProject(row.project.id)}
                          >
                            <div className="absolute inset-0 border-b border-[var(--border)] pointer-events-none" style={{ top: 'auto', bottom: '-3px' }} />

                            <div
                              className="w-64 shrink-0 pr-4 z-10 pl-2 flex flex-col justify-center gap-0.5"
                              onMouseMove={(e) => handleMouseMove(e, row)}
                              onMouseLeave={handleMouseLeave}
                            >
                              <span className="text-[12px] font-bold text-[var(--foreground)] truncate block group-hover:text-[var(--sidebar-primary)] transition-colors">
                                {row.project.name}
                              </span>
                            </div>
                            <div className="flex-1 relative h-5 rounded-full overflow-hidden flex items-center">
                              {/* Vertical grid lines matching columns */}
                              <div className="absolute inset-0 flex pointer-events-none">
                                {columns.map((_, i) => (
                                  <div key={i} className="flex-1 border-l border-[var(--border)] first:border-0" />
                                ))}
                              </div>

                              {!outOfView && (
                                <div
                                  className="absolute top-1 bottom-1 rounded-full shadow-sm transition-all duration-700 ease-out hover:brightness-110"
                                  style={{ left: `${leftPercent}%`, width: `${Math.min(widthPercent, 100 - leftPercent)}%` }}
                                  onMouseMove={(e) => handleMouseMove(e, row)}
                                  onMouseLeave={handleMouseLeave}
                                >
                                  <div className={`absolute inset-0 rounded-full ${row.state === 'completed' ? 'bg-[var(--sidebar-primary)]' :
                                    row.state === 'in_progress' ? 'bg-[var(--sidebar-primary)] opacity-25' :
                                      row.state === 'blocked' ? 'bg-rose-500 opacity-30' :
                                        'bg-[#e4e4e7] dark:bg-zinc-800'
                                    }`} />

                                  {row.state === 'in_progress' && row.progress !== null && row.progress > 0 && (
                                    <div
                                      className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ease-out z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)] ${row.overdue ? 'bg-rose-500' : 'bg-[var(--sidebar-primary)]'}`}
                                      style={{ width: `${row.progress}%` }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-1 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 group cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--sidebar-primary)] shadow-sm group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">Zakończone</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--sidebar-primary)] opacity-25 shadow-sm group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">W trakcie</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e7] dark:bg-zinc-800 shadow-sm group-hover:scale-110 transition-transform border border-[var(--border)]" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">Planowanie</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 opacity-30 shadow-sm group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">Wstrzymane</span>
            </div>
            {undatedCount > 0 ? (
              <span className="ml-auto text-[10px] font-semibold text-[var(--muted-foreground)]">
                {undatedCount === 1 ? '1 projekt bez terminu' : `${undatedCount} projektów bez terminu`} — niewidoczne na wykresie
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-[100] pointer-events-none bg-[var(--popover)] border border-[var(--border)] rounded-xl shadow-2xl p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100 min-w-[240px]"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="font-bold text-[13px] text-[var(--foreground)] leading-tight">{tooltip.row.project.name}</div>
          <div className="text-[11px] font-semibold text-[var(--muted-foreground)] -mt-1">
            {statusLabel(tooltip.row.project.status, t)}
            {tooltip.row.project.owner ? ` · ${tooltip.row.project.owner}` : ''}
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Termin</span>
              <span className={`text-[11px] font-extrabold ${tooltip.row.overdue ? 'text-rose-500' : 'text-[var(--foreground)]'}`}>
                {formatDate(tooltip.row.start)} - {formatDate(tooltip.row.end)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Postęp</span>
              <span className="text-[11px] font-extrabold text-[var(--foreground)]">
                {tooltip.row.progress === null ? 'brak robót' : `${tooltip.row.progress}%`}
              </span>
            </div>
            {tooltip.row.overdue ? (
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Po terminie</div>
            ) : null}
          </div>
        </div>
      )}
    </article>
  )
}
