import { useState, useMemo, useRef } from 'react'
import type { ApiWorkType } from '@/features/projects/types'
import { Activity } from 'lucide-react'

type ProjectWorksGanttProps = {
  works: ApiWorkType[]
}

const formatDate = (d: Date) => {
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function ProjectWorksGantt({ works }: ProjectWorksGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'14d' | '30d' | 'project'>('project')
  const [tooltip, setTooltip] = useState<{ x: number, y: number, work: any } | null>(null)

  const handleMouseMove = (e: React.MouseEvent, work: any) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()

    const tooltipWidth = 260
    const tooltipHeight = 130

    let xPos = e.clientX - rect.left + 15
    let yPos = e.clientY - rect.top + 15

    // Prevent overflow right edge
    if (e.clientX + tooltipWidth > window.innerWidth) {
      xPos = e.clientX - rect.left - tooltipWidth - 10
    }

    // Prevent overflow bottom edge
    if (e.clientY + tooltipHeight > window.innerHeight) {
      yPos = e.clientY - rect.top - tooltipHeight - 10
    }

    setTooltip({
      x: xPos,
      y: yPos,
      work
    })
  }

  const handleMouseLeave = () => setTooltip(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const mappedWorks = useMemo(() => {
    return works.map(w => {
      let s = w.plannedStart ? new Date(w.plannedStart) : null
      let e = w.plannedEnd ? new Date(w.plannedEnd) : null

      // Mock dates for demonstration if missing to make the Gantt look alive
      if (!s || !e) {
        const hash = w.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
        const offset = (hash % 10) - 5
        const duration = (hash % 5) + 2
        s = new Date(today)
        s.setDate(s.getDate() + offset)
        e = new Date(s)
        e.setDate(e.getDate() + duration)
      }

      s.setHours(0, 0, 0, 0)
      e.setHours(0, 0, 0, 0)

      const actual = w.actualQuantity || 0
      const total = w.totalQuantity || 0
      const progress = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0

      let status = 'not_started'
      if (progress === 100) status = 'completed'
      else if (progress > 0) status = 'in_progress'

      return {
        ...w,
        startDate: s,
        endDate: e,
        status,
        progress
      }
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [works, today])

  const groupedWorks = useMemo(() => {
    const groups: Record<string, typeof mappedWorks> = {}
    mappedWorks.forEach(w => {
      const km = w.milestoneNo || 'RD'
      if (!groups[km]) groups[km] = []
      groups[km].push(w)
    })

    return Object.keys(groups).sort((a, b) => {
      if (a === 'RD') return 1
      if (b === 'RD') return -1
      return a.localeCompare(b, undefined, { numeric: true })
    }).map(key => ({ km: key, works: groups[key] }))
  }, [mappedWorks])

  const { columns, totalMs, startTime, endTime } = useMemo(() => {
    if (viewMode === '14d') {
      const arr = []
      const start = new Date(today)
      start.setDate(start.getDate() - 14) // 14 days ago
      for (let i = 0; i < 17; i++) { // 14 past + today + 2 ahead = 17
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        arr.push({ date: d, label: formatDate(d), isToday: d.getTime() === today.getTime() })
      }
      return { columns: arr, totalMs: 17 * 24 * 60 * 60 * 1000, startTime: start.getTime(), endTime: start.getTime() + 17 * 24 * 60 * 60 * 1000 }
    } else if (viewMode === '30d') {
      const arr = []
      const start = new Date(today)
      start.setDate(start.getDate() - 30) // 30 days ago
      for (let i = 0; i < 33; i++) { // 30 past + today + 2 ahead = 33
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        arr.push({ date: d, label: formatDate(d), isToday: d.getTime() === today.getTime() })
      }
      return { columns: arr, totalMs: 33 * 24 * 60 * 60 * 1000, startTime: start.getTime(), endTime: start.getTime() + 33 * 24 * 60 * 60 * 1000 }
    } else {
      if (mappedWorks.length === 0) {
        const start = new Date(today)
        return { columns: [], totalMs: 1, startTime: start.getTime(), endTime: start.getTime() + 1 }
      }

      let minT = mappedWorks[0].startDate.getTime()
      let maxT = mappedWorks[0].endDate.getTime()

      mappedWorks.forEach(w => {
        if (w.startDate.getTime() < minT) minT = w.startDate.getTime()
        if (w.endDate.getTime() > maxT) maxT = w.endDate.getTime()
      })

      minT -= 7 * 24 * 60 * 60 * 1000
      maxT += 7 * 24 * 60 * 60 * 1000

      const startD = new Date(minT)
      const day = startD.getDay()
      const diff = startD.getDate() - day + (day === 0 ? -6 : 1)
      startD.setDate(diff)
      startD.setHours(0, 0, 0, 0)
      minT = startD.getTime()

      const durationDays = (maxT - minT) / (24 * 60 * 60 * 1000)
      let stepDays = durationDays > 150 ? 14 : 7 
      if (durationDays > 365) stepDays = 30 

      const arr = []
      let current = new Date(minT)
      while (current.getTime() <= maxT) {
        const label = stepDays === 30 
          ? current.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' })
          : current.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
        
        arr.push({ 
          date: new Date(current), 
          label,
          isToday: false 
        })
        current.setDate(current.getDate() + stepDays)
      }

      const exactEnd = current.getTime()
      return { columns: arr, totalMs: exactEnd - minT, startTime: minT, endTime: exactEnd }
    }
  }, [viewMode, today, mappedWorks])

  const minWidth = Math.max(750, columns.length * 60 + 260)

  return (
    <div ref={containerRef} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm min-w-0 w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-3 shrink-0 bg-[var(--background)]/50">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
          <div className="rounded p-1 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] shadow-sm">
            <Activity size={14} />
          </div>
          <span className="text-[var(--muted-foreground)] tracking-wider">Statystyki Robót</span>
        </div>
        
        <div className="flex bg-[var(--muted)]/50 p-0.5 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setViewMode('14d')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${viewMode === '14d'
              ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
          >
            14 Dni
          </button>
          <button
            onClick={() => setViewMode('30d')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${viewMode === '30d'
              ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
          >
            30 Dni
          </button>
          <button
            onClick={() => setViewMode('project')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${viewMode === 'project'
              ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
          >
            Cały projekt
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full p-3 overflow-x-auto overflow-y-hidden custom-scrollbar bg-white dark:bg-transparent">
        <div style={{ minWidth: `${minWidth}px` }}>
          {/* Header row (Days) */}
          <div className="flex items-end mb-2 relative">
            <div className="w-64 shrink-0 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)]">
              Projekt / Etap
            </div>
            <div className="flex-1 flex relative pb-2">
              {columns.map((col, i) => {
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end relative z-20">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 ${col.isToday ? 'bg-[var(--sidebar-primary)] text-white px-2.5 py-0.5 rounded-full shadow-md z-10' : 'text-[var(--muted-foreground)]'}`}>
                      {col.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative border-t border-[var(--border)] pt-2 min-h-[100px]">
            {/* Today Line Overlay */}
            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex z-0">
              <div className="w-64 shrink-0" />
              <div className="flex-1 relative">
                {(() => {
                  if (today.getTime() >= startTime && today.getTime() <= endTime) {
                    const todayPercent = ((today.getTime() - startTime) / totalMs) * 100
                    return (
                      <div className="absolute top-0 bottom-0 border-l-[1.5px] border-dashed border-[var(--sidebar-primary)]/50" style={{ left: `${todayPercent}%`, transform: 'translateX(-50%)' }} />
                    )
                  }
                  return null
                })()}
              </div>
            </div>

            {/* Works rows */}
            {groupedWorks.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[var(--muted-foreground)] z-20">
                Brak zdefiniowanych robót
              </div>
            ) : (
              <div className="flex flex-col relative z-10 pb-2">
                {groupedWorks.map((group, gIdx) => (
                  <div key={group.km} className={`flex flex-col ${gIdx > 0 ? 'mt-3' : ''}`}>
                    {/* KM Header */}
                    <div className="flex items-center relative mb-1.5">
                      <div className="w-64 shrink-0 pr-4 z-10">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--sidebar-primary)]/10">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--sidebar-primary)]">
                            {group.km}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 relative flex items-center h-full">
                        {/* Subtle line across for the header to separate visually */}
                        <div className="absolute left-0 right-0 h-[1px] bg-[var(--border)]" />
                      </div>
                    </div>

                    {/* Works in this KM */}
                    <div className="flex flex-col gap-1.5">
                      {group.works.map((w) => {
                        const msPerDay = 24 * 60 * 60 * 1000

                        const startT = Math.max(w.startDate.getTime(), startTime)
                        const endT = Math.min(w.endDate.getTime(), endTime)

                        let leftPercent = ((startT - startTime) / totalMs) * 100
                        let widthPercent = (((endT - startT) + msPerDay) / totalMs) * 100

                        const outOfView = w.endDate.getTime() < startTime || w.startDate.getTime() > endTime

                        return (
                          <div key={w.id} className="flex items-center group relative">
                            <div className="absolute inset-0 border-b border-[var(--border)] pointer-events-none" style={{ top: 'auto', bottom: '-3px' }} />

                            <div
                              className="w-64 shrink-0 pr-4 z-10 pl-2 flex flex-col justify-center gap-0.5"
                              onMouseMove={(e) => handleMouseMove(e, w)}
                              onMouseLeave={handleMouseLeave}
                            >
                              <span className="text-[12px] font-bold text-[var(--foreground)] truncate block group-hover:text-[var(--sidebar-primary)] transition-colors cursor-help">
                                {w.name}
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
                                    className="absolute top-1 bottom-1 rounded-full shadow-sm transition-all duration-700 ease-out hover:brightness-110 cursor-help"
                                    style={{ left: `${leftPercent}%`, width: `${Math.min(widthPercent, 100 - leftPercent)}%` }}
                                    onMouseMove={(e) => handleMouseMove(e, w)}
                                    onMouseLeave={handleMouseLeave}
                                  >
                                    {/* Background Layer with safe opacity */}
                                    <div className={`absolute inset-0 rounded-full ${
                                      w.status === 'completed' ? 'bg-[var(--sidebar-primary)]' : 
                                      w.status === 'in_progress' ? 'bg-[var(--sidebar-primary)] opacity-25' : 
                                      'bg-[#e4e4e7] dark:bg-zinc-800'
                                    }`} />

                                    {/* Optional progress fill inside the bar if in progress */}
                                    {w.status === 'in_progress' && (
                                      <div
                                        className="absolute left-0 top-0 bottom-0 bg-[var(--sidebar-primary)] rounded-full transition-all duration-1000 ease-out z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                                        style={{ width: `${w.progress}%` }}
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
          <div className="flex items-center gap-6 mt-1 pt-3 border-t border-[var(--border)]">
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
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">Nierozpoczęte</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Custom Tooltip */}
      {tooltip && (
        <div
          className="absolute z-[100] pointer-events-none bg-[var(--popover)] border border-[var(--border)] rounded-xl shadow-2xl p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100 min-w-[240px]"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="font-bold text-[13px] text-[var(--foreground)] leading-tight">{tooltip.work.name}</div>

          <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-[var(--border)]/50">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Termin</span>
              <span className="text-[11px] font-extrabold text-[var(--foreground)]">
                {formatDate(tooltip.work.startDate)} - {formatDate(tooltip.work.endDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Postęp</span>
              <div className="flex items-center gap-2">
                <div className="relative overflow-hidden px-1.5 py-0.5 rounded-sm flex items-center justify-center">
                  <div className={`absolute inset-0 ${
                    tooltip.work.progress === 100 ? 'bg-[var(--sidebar-primary)] opacity-10' :
                    tooltip.work.progress > 0 ? 'bg-[var(--sidebar-primary)] opacity-25' : 'bg-[var(--muted)]'
                  }`} />
                  <span className={`relative z-10 text-[10px] font-bold ${
                    tooltip.work.progress === 100 ? 'text-[var(--sidebar-primary)]' :
                    tooltip.work.progress > 0 ? 'text-[var(--sidebar-primary)] brightness-75 dark:brightness-125' : 'text-[var(--muted-foreground)]'
                  }`}>
                    {tooltip.work.progress}%
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">({tooltip.work.actualQuantity || 0} / {tooltip.work.totalQuantity || 0} {tooltip.work.unit})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
