import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowLeft, CalendarRange, CheckCircle2, ChevronRight, CircleDashed, ClipboardList,
  HardHat, Layers, Loader2, Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWorkTypeDailyReports } from '@/features/projects/api'
import type { ApiMilestone, ApiWorkType } from '@/features/projects/types'
import { formatAmount } from '@/lib/format'

type WorkTypeDetailsViewProps = {
  work: ApiWorkType
  milestone: ApiMilestone | null
  siblings: ApiWorkType[]
  departmentLabel: string
  foremanName: string | null
  formatBudget: (val: number, currency?: string) => string
  onClose: () => void
  onSelectWork: (workId: string) => void
}

const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: string | null | Date, fallback = '—'): string {
  const date = value instanceof Date ? value : parseDate(value)
  if (!date) return fallback
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysLabel(days: number): string {
  return days === 1 ? '1 dzień' : `${formatAmount(days, 0)} dni`
}

type WorkStatus = 'not_started' | 'in_progress' | 'completed'

const STATUS_META: Record<WorkStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  not_started: { label: 'Nierozpoczęte', className: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]', icon: CircleDashed },
  in_progress: { label: 'W trakcie', className: 'bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] border-[var(--sidebar-primary)]/25', icon: Timer },
  completed: { label: 'Zakończone', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25', icon: CheckCircle2 },
}

/** Compact circular progress ring */
function ProgressRing({ value, color }: { value: number; color: string }) {
  const size = 84
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
      <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums tracking-tight text-[var(--foreground)]">
        {formatAmount(value, 0)}<span className="text-xs font-bold text-[var(--muted-foreground)]">%</span>
      </span>
    </div>
  )
}

/** One label/value pair in the facts grid */
function Fact({ label, children, hint, tone = 'default', className = '' }: {
  label: string
  className?: string
  children: ReactNode
  hint?: string
  tone?: 'default' | 'good' | 'bad' | 'accent'
}) {
  const toneCls = {
    default: 'text-[var(--foreground)]',
    good: 'text-emerald-500',
    bad: 'text-rose-500',
    accent: 'text-[var(--sidebar-primary)]',
  }[tone]
  return (
    <div className={`min-w-0 bg-[var(--card)] px-3 py-2 ${className}`}>
      <dt className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] truncate">{label}</dt>
      <dd className={`mt-0.5 text-sm font-extrabold tabular-nums truncate ${toneCls}`}>{children}</dd>
      {hint ? <p className="text-[10px] text-[var(--muted-foreground)] truncate">{hint}</p> : null}
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

export function WorkTypeDetailsView({
  work,
  milestone,
  siblings,
  departmentLabel,
  foremanName,
  formatBudget,
  onClose,
  onSelectWork,
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
    const totalHours = reports.reduce((sum, r) => sum + (r.hours ?? 0), 0)
    const workerReports = reports.filter((r) => r.workers !== null)
    const avgWorkers = workerReports.length ? workerReports.reduce((sum, r) => sum + (r.workers ?? 0), 0) / workerReports.length : null
    const reportDays = new Set(reports.map((r) => r.date)).size
    const avgPerDay = reportDays ? actual / reportDays : null
    const forecastDays = avgPerDay && avgPerDay > 0 && remaining > 0 ? Math.ceil(remaining / avgPerDay) : null
    const chart = [...reports].reverse().slice(-30)
    const chartMax = Math.max(1, ...chart.map((r) => r.quantity))
    return { totalHours, avgWorkers, avgPerDay, forecastDays, chart, chartMax, lastDate: reports[0]?.date ?? null }
  }, [reports, actual, remaining])

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
          className="h-8 w-8 rounded-full bg-[var(--muted)]/50 hover:bg-[var(--muted)] shrink-0"
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

      {/* Summary: progress + facts */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3">
          <ProgressRing value={progress} color={accentColor} />

          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Quantity */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span className="text-lg font-black tabular-nums text-[var(--foreground)]">{formatAmount(actual)}</span>
                  {' '}z <span className="font-bold tabular-nums text-[var(--foreground)]">{formatAmount(total)}</span> {unit}
                </p>
                <span className="text-[11px] text-[var(--muted-foreground)] whitespace-nowrap">
                  {actual > total && total > 0
                    ? <span className="font-semibold text-amber-500">+{formatAmount(actual - total)} {unit} ponad plan</span>
                    : <>zostało <strong className="tabular-nums text-[var(--foreground)]">{formatAmount(remaining)}</strong> {unit}</>}
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
                  <span>
                    Czas: <strong className="tabular-nums text-[var(--foreground)]">
                      {schedule.started ? `${daysLabel(schedule.elapsedDays)} z ${daysLabel(schedule.durationDays)}` : `start za ${daysLabel(schedule.daysUntilStart)}`}
                    </strong>
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div className={`h-full rounded-full ${overdue ? 'bg-rose-500/70' : 'bg-[var(--muted-foreground)]/40'}`} style={{ width: `${schedule.timePct}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-[11px] italic text-[var(--muted-foreground)]">Brak zaplanowanego terminu.</p>
            )}
          </div>
        </div>

        {/* Facts grid */}
        <dl className="grid grid-cols-2 lg:grid-cols-5 gap-px border-t border-[var(--border)] bg-[var(--border)]">
          <Fact
            label="Wartość etapu"
            tone="accent"
            hint={milestone ? `netto, etap ${milestone.milestoneNo}` : undefined}
            className="col-span-2 lg:col-span-1"
          >
            {milestone ? formatBudget(milestone.netAmount || 0) : '—'}
          </Fact>
          <Fact label="Udział w etapie" hint={milestone ? `etap ${milestone.milestoneNo}` : undefined}>
            {formatAmount(share, 0, 2)}%
          </Fact>
          <Fact label={overdue ? 'Po terminie' : 'Do końca'} tone={overdue ? 'bad' : 'default'} hint={schedule ? `koniec ${formatDate(schedule.end)}` : undefined}>
            {schedule ? daysLabel(Math.abs(schedule.daysLeft)) : '—'}
          </Fact>
          <Fact label="Wydajność / dzień" hint={reportStats.forecastDays !== null ? `prognoza: ${daysLabel(reportStats.forecastDays)}` : undefined} tone={forecastLate ? 'bad' : 'default'}>
            {reportStats.avgPerDay !== null ? `${formatAmount(reportStats.avgPerDay, 0, 2)} ${unit}` : '—'}
          </Fact>
          <Fact label="Śr. ekipa" hint={reportStats.totalHours > 0 ? `${formatAmount(reportStats.totalHours, 0, 1)} godz. łącznie` : undefined}>
            {reportStats.avgWorkers !== null ? `${formatAmount(reportStats.avgWorkers, 0, 1)} os.` : '—'}
          </Fact>
        </dl>
      </div>

      {/* Reports + milestone context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Daily reports */}
        <section className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/30 overflow-hidden min-w-0">
          <SectionTitle
            icon={ClipboardList}
            aside={reports.length > 0 ? (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {reports.length} {reports.length === 1 ? 'raport' : 'raportów'} · ostatni <strong className="text-[var(--foreground)] tabular-nums">{formatDate(reportStats.lastDate)}</strong>
              </span>
            ) : null}
          >
            Raporty dzienne
          </SectionTitle>

          {reportsLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-[var(--muted-foreground)]">
              <Loader2 size={14} className="animate-spin" />
              Wczytywanie raportów...
            </div>
          ) : reports.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[var(--muted-foreground)]">
              Brak raportów — postęp pojawi się po pierwszym raporcie dziennym.
            </p>
          ) : (
            <>
              {reportStats.chart.length > 1 ? (
                <div className="flex items-end gap-0.5 h-14 px-3 pt-3" role="img" aria-label="Wykonanie w kolejnych raportach">
                  {reportStats.chart.map((r) => (
                    <div key={r.id} className="group relative flex-1 flex items-end justify-center h-full">
                      <div
                        className="w-full max-w-[18px] rounded-t-sm bg-[var(--sidebar-primary)]/60 group-hover:bg-[var(--sidebar-primary)] transition-colors"
                        style={{ height: `${Math.max(4, (r.quantity / reportStats.chartMax) * 100)}%` }}
                      />
                      <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--popover)] px-2 py-1 text-[10px] font-semibold text-[var(--popover-foreground)] shadow-lg z-10">
                        {formatDate(r.date)}: {formatAmount(r.quantity)} {unit}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="max-h-56 overflow-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--card)] text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Data</th>
                      <th className="px-3 py-1.5 text-right">Ilość</th>
                      <th className="px-3 py-1.5 text-right">Ekipa</th>
                      <th className="px-3 py-1.5 text-right">Godziny</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors">
                        <td className="px-3 py-1.5 tabular-nums text-[var(--foreground)]">{formatDate(r.date)}</td>
                        <td className="px-3 py-1.5 text-right font-bold tabular-nums text-[var(--foreground)]">
                          {formatAmount(r.quantity)} <span className="font-normal text-[var(--muted-foreground)]">{unit}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[var(--muted-foreground)]">{r.workers !== null ? `${r.workers} os.` : '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[var(--muted-foreground)]">{r.hours !== null ? formatAmount(r.hours, 0, 1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Milestone context */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 overflow-hidden">
          <SectionTitle icon={Layers}>Etap {milestone?.milestoneNo ?? ''}</SectionTitle>
          {milestone ? (
            <p className="px-3 py-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{milestone.description}</p>
          ) : (
            <p className="px-3 py-2 text-xs italic text-[var(--muted-foreground)]">Robota nie jest przypisana do etapu.</p>
          )}

          {siblings.length > 0 ? (
            <ul className="border-t border-[var(--border)] p-1">
              {siblings.map((s) => {
                const sProgress = s.totalQuantity > 0 ? Math.min(100, ((s.actualQuantity || 0) / s.totalQuantity) * 100) : 0
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onSelectWork(s.id)}
                      className="group w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--sidebar-primary)]/5 cursor-pointer"
                    >
                      <span className="flex-1 min-w-0 truncate text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--sidebar-primary)]">{s.name}</span>
                      <span className="w-12 h-1 rounded-full bg-[var(--muted)] overflow-hidden shrink-0">
                        <span className="block h-full rounded-full bg-[var(--sidebar-primary)]" style={{ width: `${sProgress}%` }} />
                      </span>
                      <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[var(--muted-foreground)]">{formatAmount(sProgress, 0)}%</span>
                      <ChevronRight size={12} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  )
}
