import { BarChart3, Calendar, CalendarDays, GanttChart, LayoutList, Plus } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import type { ProjectItem, ProjectStatus } from '@/features/projects/types'
import type { ViewMode } from '@/features/projects/pages/ProjectsShowcase/components/ProjectsTableView'

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

type Scale = 'week' | 'month'

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const day = new Date(d)
  const dow = day.getDay()
  const diff = dow === 0 ? -6 : 1 - dow // Monday = start
  day.setDate(day.getDate() + diff)
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  r.setDate(1)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date): Date {
  const r = new Date(d)
  r.setDate(1)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfMonth(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  r.setHours(23, 59, 59, 999)
  return r
}

function formatWeekLabel(d: Date): string {
  const month = d.toLocaleString('pl', { month: 'short' })
  return `${d.getDate()} ${month}`
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleString('pl', { month: 'short', year: '2-digit' })
}

type CellState = 'none' | 'plan' | 'fact' | 'both' | 'overdue'

function getCellState(
  cellStart: Date,
  cellEnd: Date,
  pStart: Date | null,
  pEnd: Date | null,
  fStart: Date | null,
  fEnd: Date | null,
  status: ProjectStatus,
): CellState {
  const cs = cellStart.getTime()
  const ce = cellEnd.getTime()

  const inPlan = pStart && pEnd && pStart.getTime() <= ce && pEnd.getTime() >= cs
  const inFact = fStart && fEnd && fStart.getTime() <= ce && fEnd.getTime() >= cs

  if (inPlan && inFact) return 'both'
  if (inFact) return 'fact'
  if (inPlan) {
    const now = Date.now()
    if (pEnd && pEnd.getTime() < now && status !== 'done') return 'overdue'
    return 'plan'
  }
  return 'none'
}

const CELL_COLORS: Record<CellState, string> = {
  none: 'bg-[var(--background)] hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30',
  plan: 'bg-indigo-400/70 dark:bg-indigo-500/60 hover:bg-indigo-500 dark:hover:bg-indigo-400',
  fact: 'bg-emerald-400/80 dark:bg-emerald-500/70 hover:bg-emerald-500 dark:hover:bg-emerald-400',
  both: 'bg-gradient-to-br from-indigo-400/80 to-emerald-400/80 dark:from-indigo-500/60 dark:to-emerald-500/60 hover:brightness-110',
  overdue: 'bg-rose-400/70 dark:bg-rose-500/60 hover:bg-rose-500 dark:hover:bg-rose-400',
}

const CELL_RING: Record<CellState, string> = {
  none: 'ring-1 ring-zinc-200/50 dark:ring-zinc-700/30',
  plan: 'ring-1 ring-indigo-500/30 dark:ring-indigo-400/20',
  fact: 'ring-1 ring-emerald-500/30 dark:ring-emerald-400/20',
  both: 'ring-1 ring-indigo-400/30',
  overdue: 'ring-1 ring-rose-500/30',
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
  statusTone,
  statusLabel,
}: ProjectsGanttViewProps) {
  const { t } = useTranslation()
  const [scale, setScale] = useState<Scale>('month')
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    content: string
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build time cells
  const cells = useMemo(() => {
    if (!timelineBounds.startDate || !timelineBounds.endDate) return []

    const result: { start: Date; end: Date; label: string; isToday: boolean }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (scale === 'week') {
      let cursor = startOfWeek(timelineBounds.startDate)
      const limit = addDays(timelineBounds.endDate, 7)
      while (cursor <= limit) {
        const end = addDays(cursor, 6)
        end.setHours(23, 59, 59, 999)
        result.push({
          start: new Date(cursor),
          end,
          label: formatWeekLabel(cursor),
          isToday: today >= cursor && today <= end,
        })
        cursor = addDays(cursor, 7)
      }
    } else {
      let cursor = startOfMonth(timelineBounds.startDate)
      const limit = addMonths(timelineBounds.endDate, 1)
      while (cursor <= limit) {
        const end = endOfMonth(cursor)
        result.push({
          start: new Date(cursor),
          end,
          label: formatMonthLabel(cursor),
          isToday: today >= cursor && today <= end,
        })
        cursor = addMonths(cursor, 1)
      }
    }
    return result
  }, [timelineBounds, scale])

  // Year group labels (week view)
  const yearGroups = useMemo(() => {
    if (scale !== 'week' || cells.length === 0) return []
    const groups: { year: number; span: number }[] = []
    let current = cells[0].start.getFullYear()
    let count = 0
    for (const cell of cells) {
      const y = cell.start.getFullYear()
      if (y === current) {
        count++
      } else {
        groups.push({ year: current, span: count })
        current = y
        count = 1
      }
    }
    groups.push({ year: current, span: count })
    return groups
  }, [cells, scale])

  if (cells.length === 0) return null

  const CW = scale === 'week' ? 36 : 56 // cell width
  const CH = 26 // cell height
  const GAP = 3  // gap between cells

  const dateFmt = (d: Date | null) =>
    d ? d.toLocaleDateString('pl', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <>
      {tooltip && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none px-3 py-2 rounded-xl bg-[var(--popover)]/95 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl text-[11px] font-medium text-[var(--popover-foreground)] whitespace-pre-line leading-relaxed max-w-[240px]"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          {tooltip.content}
        </div>,
        document.body,
      )}

      <article className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xs animate-fade-in">

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
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-[10px] font-semibold">
              {[
                { color: 'bg-indigo-400/80 ring-1 ring-indigo-500/30', label: 'Plan' },
                { color: 'bg-emerald-400/80 ring-1 ring-emerald-500/30', label: 'Fakt' },
                { color: 'bg-gradient-to-br from-indigo-400/80 to-emerald-400/80 ring-1 ring-indigo-400/30', label: 'Plan + Fakt' },
                { color: 'bg-rose-400/70 ring-1 ring-rose-500/30', label: 'Przekroczono' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`size-3 rounded-[3px] shadow-2xs ${item.color}`} />
                  <span className="text-[var(--muted-foreground)]">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Scale switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] shrink-0">
              <button
                type="button"
                onClick={() => setScale('week')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${scale === 'week'
                  ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
              >
                <CalendarDays size={12} />
                <span className="hidden sm:inline">Tygodnie</span>
              </button>
              <button
                type="button"
                onClick={() => setScale('month')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${scale === 'month'
                  ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
              >
                <Calendar size={12} />
                <span className="hidden sm:inline">Miesiące</span>
              </button>
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

        {/* Grid area */}
        <div className="w-full p-2 sm:p-4 overflow-hidden">

          <div
            ref={containerRef}
            className="w-full overflow-x-auto touch-pan-x hide-scrollbar rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-[var(--background)]/40"
            onMouseLeave={() => setTooltip(null)}
          >
            <div style={{ minWidth: `${180 + cells.length * (CW + GAP)}px` }}>

              {/* Year labels (week view, multi-year) */}
              {scale === 'week' && yearGroups.length > 1 && (
                <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/30 bg-[var(--card)]/80">
                  <div className="shrink-0 w-[180px] border-r border-zinc-200/60 dark:border-zinc-800/40" />
                  {yearGroups.map((g) => (
                    <div
                      key={g.year}
                      style={{ width: g.span * (CW + GAP) }}
                      className="shrink-0 text-center text-[10px] font-extrabold uppercase tracking-widest text-[var(--sidebar-primary)] py-1 border-r border-zinc-200/30 dark:border-zinc-800/20 last:border-r-0"
                    >
                      {g.year}
                    </div>
                  ))}
                </div>
              )}

              {/* Column header row */}
              <div className="flex border-b border-zinc-200/60 dark:border-zinc-800/40 bg-[var(--card)]/90 backdrop-blur-xs sticky top-0 z-30">
                <div className="shrink-0 w-[180px] px-3 py-2.5 border-r border-zinc-200/60 dark:border-zinc-800/40 text-[10px] font-extrabold uppercase tracking-wider text-[var(--foreground)] flex items-center sticky left-0 z-40 bg-[var(--card)] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                  Projekt
                </div>
                <div className="flex items-end gap-0" style={{ paddingLeft: 0, paddingBottom: 6, paddingTop: 4 }}>
                  {cells.map((cell, ci) => (
                    <div
                      key={ci}
                      style={{ width: CW, marginRight: GAP }}
                      className={`shrink-0 text-center text-[8.5px] font-bold uppercase tracking-wide truncate select-none pb-0.5 ${cell.isToday
                        ? 'text-rose-500 dark:text-rose-400 font-extrabold'
                        : 'text-[var(--muted-foreground)]'
                        }`}
                    >
                      {cell.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Project rows */}
              <div className="divide-y divide-zinc-200/25 dark:divide-zinc-800/10">
                {filteredProjects.map((project, idx) => {
                  const pStart = parseDateValue(project.startDate)
                  const pEnd = parseDateValue(project.endDate) ?? parseDateValue(project.dueDate)
                  const fStart = parseDateValue(project.startDateFact)
                  const fEnd = parseDateValue(project.endDateFact)

                  return (
                    <div
                      key={project.id}
                      style={{ animationDelay: `${idx * 15}ms` }}
                      className={`flex items-center group transition-colors hover:bg-[var(--sidebar-primary)]/[0.025] dark:hover:bg-zinc-800/[0.10] animate-fade-in ${canEditProject ? 'cursor-pointer' : ''
                        }`}
                      onClick={() => canEditProject && onSelectProject(project.id)}
                    >
                      {/* Left sticky: project info */}
                      <div className="shrink-0 w-[180px] px-3 py-2.5 border-r border-zinc-200/60 dark:border-zinc-800/40 flex flex-col gap-0.5 sticky left-0 z-20 bg-[var(--card)] group-hover:bg-[var(--card)] transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.25)]">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-bold text-[var(--foreground)] truncate group-hover:text-[var(--sidebar-primary)] transition-colors duration-200 leading-tight">
                            {project.name}
                          </span>
                          <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold ${statusTone(project.status)}`}>
                            {statusLabel(project.status, t)}
                          </span>
                        </div>
                      </div>

                      {/* Cells */}
                      <div className="flex items-center shrink-0" style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 0 }}>
                        {cells.map((cell, ci) => {
                          const state = getCellState(cell.start, cell.end, pStart, pEnd, fStart, fEnd, project.status)
                          const todayRing = cell.isToday && state === 'none'
                            ? ' ring-[1.5px] ring-inset ring-rose-400/50 dark:ring-rose-400/30'
                            : ''

                          return (
                            <div
                              key={ci}
                              style={{ width: CW, height: CH, marginRight: GAP }}
                              className={`shrink-0 rounded-[4px] transition-all duration-100 ${CELL_COLORS[state]} ${CELL_RING[state]}${todayRing}`}
                              onMouseEnter={(e) => {
                                const owner = project.owner || 'Brak kierownika'
                                let content = `${project.name}\n👤 ${owner}\n${cell.label}\n`
                                if (state === 'none') content += 'Brak aktywności'
                                else if (state === 'plan') content += `📅 Plan\n${dateFmt(pStart)} – ${dateFmt(pEnd)}`
                                else if (state === 'fact') content += `✅ Fakt\n${dateFmt(fStart)} – ${dateFmt(fEnd)}`
                                else if (state === 'both') content += `📅 Plan: ${dateFmt(pStart)} – ${dateFmt(pEnd)}\n✅ Fakt: ${dateFmt(fStart)} – ${dateFmt(fEnd)}`
                                else if (state === 'overdue') content += `⚠️ Przekroczono termin\nPlan: ${dateFmt(pStart)} – ${dateFmt(pEnd)}`
                                setTooltip({ x: e.clientX, y: e.clientY, content })
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {filteredProjects.length === 0 && (
                  <div className="px-3 py-10 text-center text-xs text-[var(--muted-foreground)]">
                    {t('projects.states.noResults')}
                  </div>
                )}
              </div>

              {/* Bottom legend row: today indicator */}
              {cells.some((c) => c.isToday) && (
                <div className="flex items-center gap-2 px-4 py-2 border-t border-zinc-200/40 dark:border-zinc-800/20 bg-[var(--card)]/50">
                  <span className="size-2.5 rounded-[3px] ring-[1.5px] ring-rose-400/50 bg-[var(--background)]" />
                  <span className="text-[10px] text-[var(--muted-foreground)] font-medium">
                    Czerwone obramowanie = bieżący {scale === 'week' ? 'tydzień' : 'miesiąc'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </>
  )
}

