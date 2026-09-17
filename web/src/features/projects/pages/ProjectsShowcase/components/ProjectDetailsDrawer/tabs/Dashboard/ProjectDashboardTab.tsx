import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkTypes } from '@/features/projects/api'
import {
  CheckCircle2,
  CircleDollarSign,
  Clock,
  MapPin,
  TrendingUp,
  UserRoundCheck,
  Zap,
  Activity,
  PieChart,
  Briefcase,
  LayoutList,
  List
} from 'lucide-react'
import { ProjectActiveWorkers } from './ProjectActiveWorkers'
import type { ApiMilestone, ApiProject } from '@/features/projects/types'
import { useTranslation } from 'react-i18next'

type FinancialDonutChartProps = {
  total: number;
  invoiced: number;
  doneUninvoiced: number;
  remaining: number;
  formatBudget: (val: number, currency?: string) => string;
  currency?: string | null;
}

type DonutSegment = {
  id: string;
  value: number;
  color: string;
  label: string;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.99) {
    return `M ${x - radius}, ${y} a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
  }
  const start = polarToCartesian(x, y, radius, startAngle)
  const end = polarToCartesian(x, y, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(' ')
}

function FinancialDonutChart({ total, invoiced, doneUninvoiced, remaining, formatBudget, currency }: FinancialDonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number, y: number, seg: DonutSegment } | null>(null)
  const radius = 68

  const segments = [
    { id: 'invoiced', value: invoiced, color: 'var(--sidebar-primary)', label: 'Zapłacone' },
    { id: 'done', value: doneUninvoiced, color: '#f59e0b', label: 'Wykonano (bez FV)' },
    { id: 'remaining', value: remaining, color: 'var(--border)', label: 'Pozostało do wykonania' }
  ]

  const activeSegments = segments.filter(s => s.value > 0)
  const gapPercent = activeSegments.length > 1 ? 0.025 : 0
  const gapDegrees = gapPercent * 360
  const availableDegrees = 360 - (gapDegrees * activeSegments.length)

  let currentAngle = 0

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full max-w-[280px] mx-auto relative">
      <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
        <svg 
          className="w-full h-full overflow-visible drop-shadow-sm cursor-pointer"
          onMouseLeave={() => setTooltip(null)}
          onMouseMove={(e) => {
            if (!containerRef.current) return;
            const rect = e.currentTarget.getBoundingClientRect()
            const centerX = rect.width / 2
            const centerY = rect.height / 2
            const dx = e.clientX - rect.left - centerX
            const dy = e.clientY - rect.top - centerY
            
            // Calculate distance from center
            const d = Math.sqrt(dx*dx + dy*dy)
            // Stroke radius is 68, width is 16 -> 60 to 76. Let's add some margin: 48 to 88.
            if (d < 48 || d > 88) {
              setTooltip(null)
              return
            }

            // Calculate angle from Top (12 o'clock)
            let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
            if (angle < 0) angle += 360

            let curAngle = 0
            let hoveredSeg = null
            for (const seg of activeSegments) {
              const segDegrees = (seg.value / total) * availableDegrees
              if (angle >= curAngle && angle <= curAngle + segDegrees) {
                hoveredSeg = seg
                break
              }
              curAngle += segDegrees + gapDegrees
            }

            if (hoveredSeg) {
              const contRect = containerRef.current.getBoundingClientRect()
              setTooltip({ x: e.clientX - contRect.left, y: e.clientY - contRect.top, seg: hoveredSeg })
            } else {
              setTooltip(null)
            }
          }}
        >
          {activeSegments.map(seg => {
            const segDegrees = (seg.value / total) * availableDegrees
            const startAngle = currentAngle - 90
            const endAngle = currentAngle + segDegrees - 90
            const pathData = describeArc(100, 100, radius, startAngle, endAngle)
            
            currentAngle += segDegrees + gapDegrees

            const isHovered = tooltip?.seg.id === seg.id

            return (
              <path
                key={seg.id}
                d={pathData}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? 18 : 14}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out pointer-events-none"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {total === 0 ? (
            <span className="text-xl font-extrabold text-[var(--muted-foreground)]">Brak KM</span>
          ) : (
            <>
              <span className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight leading-none">{((invoiced + doneUninvoiced) / total * 100).toFixed(0)}%</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--muted-foreground)] mt-1 text-center leading-tight max-w-[80px]">Wykonano łącznie</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-8 w-full px-2">
        {segments.map(seg => (
          <div
            key={seg.id}
            className="flex items-center justify-between gap-2 cursor-default"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)] truncate max-w-[110px]">{seg.label}</span>
            </div>
            <span className="text-sm font-extrabold text-[var(--foreground)] shrink-0">{formatBudget(seg.value, currency || undefined)}</span>
          </div>
        ))}
      </div>

      {/* Floating Custom Tooltip */}
      {tooltip && (
        <div
          className="absolute z-[100] pointer-events-none bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-xl p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100 min-w-[160px]"
          style={{ top: tooltip.y + 15, left: tooltip.x + 15 }}
        >
          <div className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider text-[var(--foreground)]">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tooltip.seg.color }} />
            {tooltip.seg.label}
          </div>
          <div className="font-extrabold text-[15px] text-[var(--foreground)] pl-4.5 flex items-baseline gap-1.5">
            <span>{formatBudget(tooltip.seg.value, currency || undefined)}</span>
            <span className="text-xs text-[var(--muted-foreground)] font-semibold">
              ({(tooltip.seg.value / total * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

type ProjectDashboardTabProps = {
  project: ApiProject
  milestones: ApiMilestone[]
  formatBudget: (val: number, currency?: string) => string
}

export function ProjectDashboardTab({ project, milestones, formatBudget }: ProjectDashboardTabProps) {
  const { t } = useTranslation()
  const [workersViewMode, setWorkersViewMode] = useState<'grouped' | 'list'>('grouped')

  const { data: workTypes = [] } = useQuery({
    queryKey: ['work-types', project.id],
    queryFn: () => fetchWorkTypes(project.id),
    enabled: !!project.id,
  })

  const { data: activeWorkers = [] } = useQuery({
    queryKey: ['workers-attendance'],
    queryFn: async () => {
      const response = await fetch(`/mock/workers-attendance.json?t=${Date.now()}`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json() as Promise<unknown[]>
    },
    enabled: project.status?.toUpperCase() === 'ACTIVE'
  })

  // Calculate Progress
  const { totalMilestones, completedMilestones, overallProgress } = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return { totalMilestones: 0, completedMilestones: 0, overallProgress: 0 }
    }
    const total = milestones.length
    const completed = milestones.filter(m => {
      const milestoneWorks = workTypes.filter(wt => wt.milestoneId === m.id)
      
      if (milestoneWorks.length === 0) {
        return false
      }

      // Check if ALL works assigned to this milestone are completed (100% or more)
      return milestoneWorks.every(wt => (wt.actualQuantity || 0) >= wt.totalQuantity)
    }).length

    return {
      totalMilestones: total,
      completedMilestones: completed,
      overallProgress: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [milestones, workTypes])

  // Financial calculations for donut chart (3-part)
  const { totalKmNet, invoicedKmNet, doneUninvoicedKmNet, remainingKmNet } = useMemo(() => {
    let total = 0
    let invoiced = 0
    let doneUninvoiced = 0
    let remaining = 0

    if (milestones && milestones.length > 0) {
      milestones.forEach(m => {
        const net = Number(m.netAmount) || 0
        const perc = m.percentage || 0
        const invPerc = m.invoicingPercentage || 0

        total += net
        invoiced += net * (invPerc / 100)
        doneUninvoiced += net * (Math.max(0, perc - invPerc) / 100)
        remaining += net * (Math.max(0, 100 - perc) / 100)
      })
    }
    return {
      totalKmNet: total,
      invoicedKmNet: invoiced,
      doneUninvoicedKmNet: doneUninvoiced,
      remainingKmNet: remaining
    }
  }, [milestones])

  const budgetValue = project.contract_net_value ? Number(project.contract_net_value) : 0

  const statusTone = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
      case 'COMPLETED': return 'bg-blue-500/15 text-blue-500 border-blue-500/20'
      case 'ON_HOLD': return 'bg-amber-500/15 text-amber-500 border-amber-500/20'
      case 'CANCELLED': return 'bg-rose-500/15 text-rose-500 border-rose-500/20'
      default: return 'bg-zinc-500/15 text-zinc-500 border-zinc-500/20'
    }
  }

  const managerName = project.manager
    ? `${project.manager.firstName} ${project.manager.lastName}`
    : 'Nieprzypisany'

  const formatDate = (dateStr: string | null | undefined) =>
    dateStr ? new Date(dateStr).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric', day: 'numeric' }) : '-'

  return (
    <div className="w-full flex flex-col gap-1 animate-tab-content">
      {/* TOP ROW: Progress Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-lg bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]">Postęp Projektu</span>
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${overallProgress === 100
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] border-[var(--sidebar-primary)]/20'
                }`}>
                {overallProgress === 100 ? 'Zakończono' : 'W Trakcie'}
              </span>
            </div>
            <p className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5">
              Na podstawie zafakturowanych etapów
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:flex-1">
          <div className="h-2 flex-1 bg-[var(--border)] rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-[var(--sidebar-primary)] relative"
              style={{ width: `${overallProgress}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
            </div>
          </div>
          <span className="text-lg font-extrabold text-[var(--foreground)] w-12 text-right">{overallProgress}%</span>
        </div>
      </div>

      {/* SECOND ROW: TOP GRID (KPIs, Donut, Project Info / Workers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch lg:h-[340px]">
        
        {/* LEFT COLUMN: KPIs (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm flex flex-col transition-colors hover:border-[var(--sidebar-primary)]/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="rounded bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] p-1 shrink-0">
                <CircleDollarSign size={14} />
              </div>
              <span>Wartość</span>
            </div>
            <div className="flex-1 flex items-center justify-start w-full mt-1">
              <p className="text-base font-extrabold text-[var(--foreground)] truncate">
                {budgetValue > 0 ? formatBudget(budgetValue, project.currency || 'PLN') : '-'}
              </p>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm flex flex-col transition-colors hover:border-[var(--sidebar-primary)]/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="rounded bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] p-1 shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <span>Zamknięte Etapy</span>
            </div>
            <div className="flex-1 flex items-center justify-start w-full mt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold text-[var(--foreground)]">{completedMilestones}</span>
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">/ {totalMilestones}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm flex flex-col transition-colors hover:border-[var(--sidebar-primary)]/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="rounded bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] p-1 shrink-0">
                <Zap size={14} />
              </div>
              <span>Moc</span>
            </div>
            <div className="flex-1 flex items-center justify-start w-full mt-1">
              <p className="text-base font-extrabold text-[var(--foreground)] truncate">
                {project.power ? `${project.power} MW` : '-'}
              </p>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm flex flex-col transition-colors hover:border-[var(--sidebar-primary)]/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="rounded bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] p-1 shrink-0">
                <Clock size={14} />
              </div>
              <span>Termin</span>
            </div>
            <div className="flex-1 flex items-center justify-start w-full mt-1">
              <p className="text-base font-extrabold text-[var(--foreground)] truncate">
                {formatDate(project.end_date_contract)}
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Donut Chart (col-span-4) */}
        <div className="lg:col-span-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex flex-col h-full relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              <div className="rounded p-1 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                <PieChart size={14} />
              </div>
              <span className="text-[var(--muted-foreground)]">Rozliczenia</span>
            </div>
          </div>
          <div className="p-4 flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 p-24 bg-[var(--sidebar-primary)]/5 rounded-full blur-3xl" />
            </div>
            <FinancialDonutChart
              total={totalKmNet}
              invoiced={invoicedKmNet}
              doneUninvoiced={doneUninvoicedKmNet}
              remaining={remainingKmNet}
              formatBudget={formatBudget}
              currency={project.currency}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Active Workers / Project Info (col-span-5) */}
        <div className="lg:col-span-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              <div className="rounded p-1 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                {project.status?.toUpperCase() === 'ACTIVE' ? <UserRoundCheck size={14} /> : <Briefcase size={14} />}
              </div>
              <span className="text-[var(--muted-foreground)] flex items-center gap-1.5">
                {project.status?.toUpperCase() === 'ACTIVE' ? (
                  <>
                    Obecni na budowie
                    {activeWorkers.length > 0 && (
                      <span className="text-[10px] bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] px-1.5 py-0.5 rounded-sm font-extrabold">
                        {activeWorkers.length}
                      </span>
                    )}
                  </>
                ) : (
                  'Szczegóły Projektu'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {project.status?.toUpperCase() === 'ACTIVE' && (
                <div className="flex bg-[var(--muted)]/50 p-0.5 rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => setWorkersViewMode('grouped')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      workersViewMode === 'grouped'
                        ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <LayoutList size={12} />
                    <span className="hidden xl:inline">Grupy</span>
                  </button>
                  <button
                    onClick={() => setWorkersViewMode('list')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      workersViewMode === 'list'
                        ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <List size={12} />
                    <span className="hidden xl:inline">Lista</span>
                  </button>
                </div>
              )}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusTone(project.status || '')}`}>
                {t(`projects.form.statuses.${project.status}`)}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {project.status?.toUpperCase() === 'ACTIVE' ? (
              <ProjectActiveWorkers viewMode={workersViewMode} />
            ) : (
              <div className="flex flex-col gap-5 p-6 bg-[var(--background)] h-full justify-center min-h-0 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <CircleDollarSign size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Budżet</span>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--foreground)]">
                      {formatBudget(budgetValue, project.currency || undefined)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <UserRoundCheck size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Kierownik</span>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--foreground)] truncate">
                      {managerName}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <MapPin size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Lokalizacja</span>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--foreground)] truncate">
                      {project.city || '-'}, {project.country || '-'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Start (Fakt)</span>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--foreground)]">
                      {formatDate(project.start_date_fact)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* THIRD ROW: Work Statistics (Full width, columns layout) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex flex-col overflow-hidden max-h-[500px]">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            <div className="rounded p-1 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
              <Activity size={14} />
            </div>
            <span className='text-[var(--muted-foreground)]'>Statystyki Robót</span>
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
          {workTypes.length === 0 ? (
            <div className="text-center text-xs text-[var(--muted-foreground)] py-8 font-medium">Brak zdefiniowanych robót</div>
          ) : (
            (() => {
              const groups: Record<string, typeof workTypes> = {}
              workTypes.forEach(wt => {
                const km = wt.milestoneNo || 'RD'
                if (!groups[km]) groups[km] = []
                groups[km].push(wt)
              })

              const sortedGroups = Object.keys(groups).sort((a, b) => {
                if (a === 'RD') return 1
                if (b === 'RD') return -1
                return a.localeCompare(b, undefined, { numeric: true })
              }).map(key => ({ km: key, works: groups[key] }))

              return (
                <div className="flex flex-col gap-3">
                  {sortedGroups.map(group => (
                    <div key={group.km} className="flex flex-col md:flex-row items-stretch gap-4 bg-[var(--background)]/30 rounded-xl p-3 border border-[var(--border)] hover:border-[var(--sidebar-primary)]/30 transition-colors">
                      {/* Left side: KM Badge (vertically centered) */}
                      <div className="md:w-16 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] pb-2 md:pb-0 md:pr-4">
                        <div className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--sidebar-primary)] text-center">
                          {group.km}
                        </div>
                      </div>

                      {/* Right side: Works Grid */}
                      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-1">
                        {group.works.map(wt => {
                          const actual = wt.actualQuantity || 0
                          const total = wt.totalQuantity || 0
                          const progress = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0

                          let progressColor = 'bg-blue-500'
                          if (progress === 100) progressColor = 'bg-emerald-500'
                          else if (progress > 0) progressColor = 'bg-amber-500'

                          return (
                            <div key={wt.id} className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[var(--sidebar-primary)]/10 transition-all border border-transparent hover:border-[var(--border)]">
                              <span className="text-[11px] font-bold text-[var(--foreground)] truncate flex-1 group-hover:text-[var(--sidebar-primary)] transition-colors" title={wt.name}>
                                {wt.name}
                              </span>

                              <div className="w-24 shrink-0 flex justify-end items-baseline gap-1">
                                <span className="text-[11px] font-extrabold text-[var(--foreground)]">{actual}</span>
                                <span className="text-[9px] font-semibold text-[var(--muted-foreground)]">/ {total} <span className="text-[8px] uppercase">{wt.unit}</span></span>
                              </div>

                              <div className="w-24 shrink-0 flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-[var(--border)] rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className={`h-full ${progressColor} transition-all duration-1000 ease-out relative`}
                                    style={{ width: `${progress}%` }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-[var(--foreground)] w-7 text-right">{progress}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}

