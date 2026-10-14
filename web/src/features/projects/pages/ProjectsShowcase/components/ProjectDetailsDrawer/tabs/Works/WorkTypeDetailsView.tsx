import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowLeft, BarChart3, CalendarClock, CalendarRange, CheckCircle2, CircleDashed,
  Gauge, HardHat, Layers, Loader2, PieChart, Timer, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWorkTypeDailyReports } from '@/features/projects/api'
import type { ApiMilestone, ApiWorkType, ApiWorkTypeDailyReport } from '@/features/projects/types'
import { formatAmount } from '@/lib/format'

type WorkTypeDetailsViewProps = {
  work: ApiWorkType
  milestone: ApiMilestone | null
  departmentLabel: string
  foremanName: string | null
  formatBudget: (val: number, currency?: string) => string
  onClose: () => void
}

const DAY_MS = 24 * 60 * 60 * 1000
// Longest period drawn in the daily chart
const MAX_CHART_DAYS = 90

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value: string | null | Date, fallback = '—'): string {
  const date = value instanceof Date ? value : parseDate(value)
  if (!date) return fallback
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatShortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

function daysLabel(days: number): string {
  return days === 1 ? '1 dzień' : `${formatAmount(days, 0)} dni`
}

/** Quantity with up to two decimals, no trailing zeros ("100", "12,5") */
function qty(value: number): string {
  return formatAmount(value, 0, 2)
}

type WorkStatus = 'not_started' | 'in_progress' | 'completed'

const STATUS_META: Record<WorkStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  not_started: { label: 'Nierozpoczęte', className: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]', icon: CircleDashed },
  in_progress: { label: 'W trakcie', className: 'bg-[color-mix(in_oklch,var(--sidebar-primary)_10%,transparent)] text-[var(--sidebar-primary)] border-[color-mix(in_oklch,var(--sidebar-primary)_25%,transparent)]', icon: Timer },
  completed: { label: 'Zakończone', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25', icon: CheckCircle2 },
}

/** Progress donut: shows "done / total" in the middle, percentage on hover */
function ProgressDonut({ actual, total, unit, progress, color }: {
  actual: number
  total: number
  unit: string
  progress: number
  color: string
}) {
  const size = 116
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, progress))

  return (
    <div
      className="group relative shrink-0 cursor-default"
      style={{ width: size, height: size }}
      title={`Wykonano ${formatAmount(progress, 0)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 900ms ease-out' }}
        />
      </svg>

      {/* Default: done / total */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center transition-opacity duration-200 group-hover:opacity-0">
        <span className="text-lg font-black leading-none tabular-nums tracking-tight text-[var(--foreground)]">{qty(actual)}</span>
        <span className="mt-1 h-px w-8 bg-[var(--border)]" aria-hidden="true" />
        <span className="mt-1 text-[11px] font-bold leading-none tabular-nums text-[var(--muted-foreground)]">
          {qty(total)} {unit}
        </span>
      </div>

      {/* Hover: percentage */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="text-2xl font-black tabular-nums tracking-tight text-[var(--foreground)]">
          {formatAmount(progress, 0)}<span className="text-sm font-bold text-[var(--muted-foreground)]">%</span>
        </span>
      </div>
    </div>
  )
}

type FactTone = 'default' | 'accent' | 'good' | 'bad'

const FACT_TONES: Record<FactTone, string> = {
  default: 'text-[var(--foreground)]',
  accent: 'text-[var(--sidebar-primary)]',
  good: 'text-emerald-500',
  bad: 'text-rose-500',
}

/** Key figure card — same look as the KPI cards on the project dashboard (Pulpit) */
function Fact({ icon: Icon, label, value, suffix, hint, tone = 'default', footer }: {
  icon: typeof Wallet
  label: string
  value: ReactNode
  suffix?: string
  hint?: ReactNode
  tone?: FactTone
  footer?: ReactNode
}) {
  return (
    <div className="min-w-0 bg-[var(--card)] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        <Icon size={14} className="shrink-0 text-[var(--sidebar-primary)]" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1 flex items-baseline gap-1 min-w-0">
        <span className={`truncate text-[14px] font-extrabold ${FACT_TONES[tone]}`}>{value}</span>
        {suffix ? <span className="shrink-0 text-[11px] font-semibold text-[var(--muted-foreground)]">{suffix}</span> : null}
      </dd>
      {footer}
      {hint ? <p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">{hint}</p> : null}
    </div>
  )
}

function SectionTitle({ icon: Icon, children, aside }: { icon: typeof Layers; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border)]">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        <Icon size={12} className="text-[var(--sidebar-primary)]" />
        {children}
      </span>
      {aside}
    </div>
  )
}

type ChartDay = { date: Date; iso: string; quantity: number; workers: number | null; hours: number | null; isToday: boolean; isWeekend: boolean }

/** Bar per calendar day across the planned period (or the reported period when there is no plan) */
function buildChartDays(reports: ApiWorkTypeDailyReport[], plannedStart: Date | null, plannedEnd: Date | null): ChartDay[] {
  const byDate = new Map<string, { quantity: number; workers: number | null; hours: number | null }>()
  for (const r of reports) {
    const prev = byDate.get(r.date) ?? { quantity: 0, workers: null, hours: null }
    byDate.set(r.date, {
      quantity: prev.quantity + r.quantity,
      workers: r.workers !== null ? (prev.workers ?? 0) + r.workers : prev.workers,
      hours: r.hours !== null ? (prev.hours ?? 0) + r.hours : prev.hours,
    })
  }

  const reportDates = reports.map((r) => parseDate(r.date)).filter((d): d is Date => d !== null)
  const candidatesStart = [plannedStart, ...reportDates].filter((d): d is Date => d !== null)
  const candidatesEnd = [plannedEnd, ...reportDates].filter((d): d is Date => d !== null)
  if (candidatesStart.length === 0 || candidatesEnd.length === 0) return []

  let start = new Date(Math.min(...candidatesStart.map((d) => d.getTime())))
  let end = new Date(Math.max(...candidatesEnd.map((d) => d.getTime())))
  // Too long to draw day by day: stick to the planned period, else the latest days
  if ((end.getTime() - start.getTime()) / DAY_MS + 1 > MAX_CHART_DAYS) {
    if (plannedStart && plannedEnd && plannedEnd >= plannedStart) {
      start = new Date(plannedStart)
      end = new Date(plannedEnd)
    }
    if ((end.getTime() - start.getTime()) / DAY_MS + 1 > MAX_CHART_DAYS) {
      start = new Date(end.getTime() - (MAX_CHART_DAYS - 1) * DAY_MS)
    }
  }

  const todayIso = toIsoDate(new Date())
  const days: ChartDay[] = []
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const iso = toIsoDate(cursor)
    const entry = byDate.get(iso)
    days.push({
      date: new Date(cursor),
      iso,
      quantity: entry?.quantity ?? 0,
      workers: entry?.workers ?? null,
      hours: entry?.hours ?? null,
      isToday: iso === todayIso,
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
    })
  }
  return days
}

function DailyChart({ days, unit }: { days: ChartDay[]; unit: string }) {
  const max = Math.max(...days.map((d) => d.quantity), 0)
  // Round the axis up to a "nice" number
  const magnitude = max > 0 ? 10 ** Math.floor(Math.log10(max)) : 1
  const axisMax = max > 0 ? Math.ceil(max / magnitude) * magnitude : 1
  const labelEvery = Math.max(1, Math.ceil(days.length / 12))
  // Tooltip is portalled to <body> so the card's overflow-hidden can't clip it
  const [hover, setHover] = useState<{ day: ChartDay; x: number; y: number } | null>(null)

  return (
    <div className="flex gap-2 px-3 pt-3 pb-2" onMouseLeave={() => setHover(null)}>
      {/* Y axis */}
      <div className="flex h-40 flex-col justify-between pb-5 text-right text-[9px] tabular-nums text-[var(--muted-foreground)]">
        <span>{qty(axisMax)}</span>
        <span>{qty(axisMax / 2)}</span>
        <span>0</span>
      </div>

      <div className="relative flex-1 min-w-0">
        {/* Grid lines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%-1.25rem)] flex flex-col justify-between">
          <div className="border-t border-dashed border-[var(--border)]" />
          <div className="border-t border-dashed border-[var(--border)]" />
          <div className="border-t border-[var(--border)]" />
        </div>

        <div className="relative flex h-40 items-stretch gap-[2px]" role="img" aria-label={`Wykonanie dzienne (${unit})`}>
          {days.map((d, i) => {
            const height = (d.quantity / axisMax) * 100
            return (
              <div
                key={d.iso}
                className="group relative flex flex-1 min-w-0 flex-col"
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  setHover({ day: d, x: rect.left + rect.width / 2, y: rect.top })
                }}
              >
                {/* Bar area */}
                <div className={`relative flex flex-1 items-end justify-center rounded-sm ${d.isWeekend ? 'bg-[color-mix(in_oklch,var(--muted)_25%,transparent)]' : ''}`}>
                  {d.isToday ? (
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-[color-mix(in_oklch,var(--sidebar-primary)_60%,transparent)]" aria-hidden="true" />
                  ) : null}
                  {d.quantity > 0 ? (
                    <div
                      className="relative w-full max-w-[22px] rounded-t-[3px] bg-[color-mix(in_oklch,var(--sidebar-primary)_75%,transparent)] transition-colors group-hover:bg-[var(--sidebar-primary)]"
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                  ) : null}
                </div>

                {/* X label */}
                <div className="h-5 pt-1 text-center text-[9px] tabular-nums leading-none text-[var(--muted-foreground)]">
                  {i % labelEvery === 0 || d.isToday ? (
                    <span className={d.isToday ? 'font-bold text-[var(--sidebar-primary)]' : ''}>{formatShortDate(d.date)}</span>
                  ) : null}
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {hover && createPortal(
        <div
          className="pointer-events-none fixed z-[200] whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--popover)] px-2.5 py-1.5 text-[11px] text-[var(--popover-foreground)] shadow-xl"
          style={{
            left: Math.min(Math.max(hover.x, 80), window.innerWidth - 80),
            top: hover.y - 6,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="font-semibold">{formatDate(hover.day.date)}{hover.day.isToday ? ' · dziś' : ''}</p>
          <p className="tabular-nums">
            {hover.day.quantity > 0 ? <><strong>{qty(hover.day.quantity)}</strong> {unit}</> : 'Brak raportu'}
          </p>
          {hover.day.workers !== null || hover.day.hours !== null ? (
            <p className="tabular-nums text-[var(--muted-foreground)]">
              {[
                hover.day.workers !== null ? `${hover.day.workers} os.` : null,
                hover.day.hours !== null ? `${qty(hover.day.hours)} godz.` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>,
        document.body,
      )}
    </div>
  )
}

export function WorkTypeDetailsView({
  work,
  milestone,
  departmentLabel,
  foremanName,
  formatBudget,
  onClose,
}: WorkTypeDetailsViewProps) {
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['work-type-daily-reports', work.id],
    queryFn: () => fetchWorkTypeDailyReports(work.id),
  })

  const unit = work.unit || ''
  const total = work.totalQuantity || 0
  const actual = work.actualQuantity || 0
  const progress = total > 0 ? (actual / total) * 100 : 0
  const remaining = Math.max(0, total - actual)
  const status: WorkStatus = total > 0 && actual >= total ? 'completed' : actual > 0 ? 'in_progress' : 'not_started'
  const share = work.percentage ?? 100
  const isKM = milestone?.type !== 'roboty_dodatkowe'

  // ── Schedule ──────────────────────────────────────────────────────────────
  const schedule = useMemo(() => {
    const start = parseDate(work.plannedStart)
    const end = parseDate(work.plannedEnd)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!start || !end || end < start) return null

    const durationDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
    const elapsedDays = Math.min(durationDays, Math.max(0, Math.round((today.getTime() - start.getTime()) / DAY_MS) + 1))
    const daysLeft = Math.round((end.getTime() - today.getTime()) / DAY_MS)
    const timePct = (elapsedDays / durationDays) * 100
    const daysUntilStart = Math.round((start.getTime() - today.getTime()) / DAY_MS)
    return { start, end, durationDays, elapsedDays, daysLeft, timePct, daysUntilStart, started: today >= start }
  }, [work.plannedStart, work.plannedEnd])

  const overdue = Boolean(schedule && schedule.daysLeft < 0 && status !== 'completed')

  // ── Reports ───────────────────────────────────────────────────────────────
  const reportStats = useMemo(() => {
    const reportDays = new Set(reports.map((r) => r.date)).size
    const avgPerDay = reportDays ? actual / reportDays : null
    const forecastDays = avgPerDay && avgPerDay > 0 && remaining > 0 ? Math.ceil(remaining / avgPerDay) : null
    return { avgPerDay, forecastDays, reportDays, lastDate: reports[0]?.date ?? null }
  }, [reports, actual, remaining])

  const chartDays = useMemo(
    () => buildChartDays(reports, parseDate(work.plannedStart), parseDate(work.plannedEnd)),
    [reports, work.plannedStart, work.plannedEnd],
  )

  // Reports that fall outside the drawn period
  const reportsOutsideChart = chartDays.length
    ? reports.filter((r) => r.date < chartDays[0].iso || r.date > chartDays[chartDays.length - 1].iso).length
    : 0

  const scheduleFact = (() => {
    if (status === 'completed') {
      const finished = parseDate(reportStats.lastDate)
      const lateBy = finished && schedule ? Math.round((finished.getTime() - schedule.end.getTime()) / DAY_MS) : null
      return {
        label: 'Ukończono',
        value: finished ? formatDate(finished) : '—',
        suffix: undefined,
        tone: (lateBy !== null && lateBy > 0 ? 'bad' : 'good') as FactTone,
        hint: lateBy === null ? 'wg ostatniego raportu' : lateBy > 0 ? `${daysLabel(lateBy)} po planie` : 'w terminie',
      }
    }
    if (!schedule) return { label: 'Termin', value: '—', suffix: undefined, tone: 'default' as FactTone, hint: 'brak planu' }
    if (!schedule.started) {
      return {
        label: 'Start za',
        value: formatAmount(schedule.daysUntilStart, 0),
        suffix: schedule.daysUntilStart === 1 ? 'dzień' : 'dni',
        tone: 'default' as FactTone,
        hint: `planowany start ${formatDate(schedule.start)}`,
      }
    }
    if (overdue) {
      return {
        label: 'Po terminie',
        value: formatAmount(Math.abs(schedule.daysLeft), 0),
        suffix: Math.abs(schedule.daysLeft) === 1 ? 'dzień' : 'dni',
        tone: 'bad' as FactTone,
        hint: `plan do ${formatDate(schedule.end)}`,
      }
    }
    return {
      label: 'Do końca',
      value: schedule.daysLeft === 0 ? 'dziś' : formatAmount(schedule.daysLeft, 0),
      suffix: schedule.daysLeft === 0 ? undefined : schedule.daysLeft === 1 ? 'dzień' : 'dni',
      tone: 'default' as FactTone,
      hint: `koniec ${formatDate(schedule.end)}`,
    }
  })()

  const statusMeta = STATUS_META[status]
  const StatusIcon = statusMeta.icon
  const accentColor = overdue ? '#f43f5e' : status === 'completed' ? '#10b981' : 'var(--sidebar-primary)'
  const forecastLate = reportStats.forecastDays !== null && schedule !== null && reportStats.forecastDays > Math.max(0, schedule.daysLeft)

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm space-y-3 animate-tab-content">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Wróć do listy robót"
          className="h-8 w-8 rounded-full bg-[color-mix(in_oklch,var(--muted)_50%,transparent)] hover:bg-[var(--muted)] shrink-0"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold leading-tight text-[var(--foreground)] truncate" title={work.name}>{work.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted-foreground)]">
            {milestone ? (
              <>
                <span className={`font-bold ${isKM ? 'text-[var(--sidebar-primary)]' : 'text-amber-600 dark:text-amber-400'}`}>{milestone.milestoneNo}</span>
                <span aria-hidden="true" className="opacity-40">·</span>
              </>
            ) : null}
            <span className="inline-flex items-center gap-1"><Layers size={11} />{departmentLabel}</span>
            {foremanName ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1"><HardHat size={11} />{foremanName}</span>
              </>
            ) : null}
            <span aria-hidden="true" className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums"><CalendarRange size={11} />{formatDate(work.plannedStart)} – {formatDate(work.plannedEnd)}</span>
          </div>
        </div>

        {/* Status on the right */}
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
          {overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500 whitespace-nowrap">
              <AlertTriangle size={11} />
              Po terminie
            </span>
          ) : null}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${statusMeta.className}`}>
            <StatusIcon size={11} />
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Summary: donut + bars on the left, key facts on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] rounded-xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_30%,transparent)] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3">
          <ProgressDonut actual={actual} total={total} unit={unit} progress={progress} color={accentColor} />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted-foreground)]">
                <span>Wykonanie</span>
                <span className="whitespace-nowrap">
                  {actual > total && total > 0
                    ? <span className="font-semibold text-amber-500">+{qty(actual - total)} {unit} ponad plan</span>
                    : <>zostało <strong className="tabular-nums text-[var(--foreground)]">{qty(remaining)}</strong> {unit}</>}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, progress)}%`, background: accentColor }} />
              </div>
            </div>

            {/* Time */}
            {schedule ? (
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted-foreground)]">
                  <span>Czas</span>
                  <strong className="tabular-nums text-[var(--foreground)]">
                    {schedule.started ? `${daysLabel(schedule.elapsedDays)} z ${daysLabel(schedule.durationDays)}` : `start za ${daysLabel(schedule.daysUntilStart)}`}
                  </strong>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div className={`h-full rounded-full ${overdue ? 'bg-rose-500/70' : 'bg-[color-mix(in_oklch,var(--muted-foreground)_40%,transparent)]'}`} style={{ width: `${schedule.timePct}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-[11px] italic text-[var(--muted-foreground)]">Brak zaplanowanego terminu.</p>
            )}
          </div>
        </div>

        {/* Facts 2×2 */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--border)] border-t lg:border-t-0 lg:border-l border-[var(--border)]">
          <Fact
            icon={Wallet}
            label="Wartość etapu"
            tone="accent"
            value={milestone ? formatBudget(milestone.netAmount || 0) : '—'}
            hint={milestone ? `netto · ${milestone.milestoneNo}` : 'brak etapu'}
          />
          <Fact
            icon={PieChart}
            label="Udział w etapie"
            value={formatAmount(share, 0, 2)}
            suffix="%"
            footer={
              <div className="mt-1.5 h-1 w-full max-w-[140px] overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full bg-[var(--sidebar-primary)]" style={{ width: `${Math.min(100, share)}%` }} />
              </div>
            }
          />
          <Fact
            icon={CalendarClock}
            label={scheduleFact.label}
            value={scheduleFact.value}
            suffix={scheduleFact.suffix}
            tone={scheduleFact.tone}
            hint={scheduleFact.hint}
          />
          <Fact
            icon={Gauge}
            label="Wydajność"
            value={reportStats.avgPerDay !== null ? qty(reportStats.avgPerDay) : '—'}
            suffix={reportStats.avgPerDay !== null ? `${unit}/dzień` : undefined}
            tone={forecastLate ? 'bad' : 'default'}
            hint={
              reportStats.forecastDays !== null
                ? `przy tym tempie: ok. ${daysLabel(reportStats.forecastDays)} do końca`
                : reportStats.reportDays > 0
                  ? `średnio z ${reportStats.reportDays} dni pracy`
                  : 'brak raportów'
            }
          />
        </dl>
      </div>

      {/* Daily chart */}
        <section className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_30%,transparent)] overflow-hidden min-w-0">
          <SectionTitle
            icon={BarChart3}
            aside={reports.length > 0 ? (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                ostatni raport <strong className="text-[var(--foreground)] tabular-nums">{formatDate(reportStats.lastDate)}</strong>
              </span>
            ) : null}
          >
            Wykonanie dzienne{unit ? ` (${unit})` : ''}
          </SectionTitle>

          {reportsLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-[var(--muted-foreground)]">
              <Loader2 size={14} className="animate-spin" />
              Wczytywanie raportów...
            </div>
          ) : chartDays.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[var(--muted-foreground)]">
              Brak raportów i terminu — wykres pojawi się po pierwszym raporcie dziennym.
            </p>
          ) : (
            <>
              <DailyChart days={chartDays} unit={unit} />
              {reports.length === 0 ? (
                <p className="px-3 pb-3 text-[11px] text-[var(--muted-foreground)]">Brak raportów dziennych w tym okresie.</p>
              ) : reportsOutsideChart > 0 ? (
                <p className="px-3 pb-3 text-[11px] text-amber-600 dark:text-amber-400">
                  {reportsOutsideChart === 1 ? '1 raport' : `${reportsOutsideChart} raportów`} poza okresem wykresu (ostatni {formatDate(reportStats.lastDate)}) — wliczone w wykonanie.
                </p>
              ) : null}
            </>
          )}
        </section>

    </div>
  )
}
