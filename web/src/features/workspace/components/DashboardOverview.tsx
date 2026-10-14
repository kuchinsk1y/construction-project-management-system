import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, CalendarClock, ClipboardList, Clock, FileText, FolderKanban, HardHat, PieChart, Wrench } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { fetchDashboardSummary, type DashboardProjectStatus, type DashboardSummary } from '@/features/workspace/api/dashboard'
import { formatAmount, formatMoney } from '@/lib/format'

const STATUS_BADGE: Record<DashboardProjectStatus, string> = {
  active: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
  planning: 'border-amber-500/25 bg-amber-500/10 text-amber-500',
  blocked: 'border-rose-500/25 bg-rose-500/10 text-rose-500',
  done: 'border-blue-500/25 bg-blue-500/10 text-blue-500',
}

const SETTLEMENT_SEGMENTS = [
  { key: 'paid', label: 'Zapłacono', color: 'var(--sidebar-primary)' },
  { key: 'invoicedNotPaid', label: 'Wystawiono FV', color: '#3b82f6' },
  { key: 'remaining', label: 'Pozostało', color: 'var(--border)' },
] as const

const cardCls = 'rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm'
const pillCls = 'shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest'
const rowHoverCls = 'transition-colors hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_4.5%,transparent)]'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  return `${d}.${m}.${y}`
}

function dayMonth(value: string | null): { day: string; month: string } {
  if (!value) return { day: '—', month: '' }
  const date = new Date(`${value}T00:00:00`)
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('pl-PL', { month: 'short' }).replace('.', ''),
  }
}

function relativeDay(value: string | null): string {
  if (!value) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(`${value}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'dziś'
  if (diff === -1) return 'wczoraj'
  if (diff === 1) return 'jutro'
  return diff < 0 ? `${-diff} dni temu` : `za ${diff} dni`
}

function initials(text: string): string {
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function IconBox({ icon: Icon }: { icon: typeof Clock }) {
  return (
    <span className="flex shrink-0 text-[var(--sidebar-primary)]">
      <Icon size={14} />
    </span>
  )
}

function Kpi({ icon, label, value, note, noteTone = 'muted' }: {
  icon: typeof Clock
  label: string
  value: ReactNode
  note: ReactNode
  noteTone?: 'muted' | 'good' | 'warn' | 'bad'
}) {
  const toneCls = {
    muted: 'text-[var(--muted-foreground)]',
    good: 'text-emerald-500 font-semibold',
    warn: 'text-amber-500 font-semibold',
    bad: 'text-rose-500 font-semibold',
  }[noteTone]
  return (
    <div className={`${cardCls} flex flex-col gap-1.5 px-3 py-2.5`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        <IconBox icon={icon} />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-extrabold leading-7 text-[var(--foreground)]">{value}</div>
      <div className={`truncate text-[10px] font-medium ${toneCls}`}>{note}</div>
    </div>
  )
}

/** Section header: tinted icon on the left + uppercase title, divider below (Pulpit style) */
function CardHeader({ icon, title, action }: { icon: typeof Clock; title: string; action?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] p-2">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        <IconBox icon={icon} />
        <span>{title}</span>
      </div>
      {action}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-4 text-[11px] font-medium text-[var(--muted-foreground)]">{children}</p>
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  if (end - start >= 359.99) {
    return `M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`
  }
  const from = polarToCartesian(cx, cy, r, start)
  const to = polarToCartesian(cx, cy, r, end)
  return ['M', from.x, from.y, 'A', r, r, 0, end - start <= 180 ? '0' : '1', 1, to.x, to.y].join(' ')
}

/** Settlement donut — same look and states as the project Pulpit "Rozliczenia" chart */
function SettlementChart({ data }: { data: DashboardSummary['settlement'] }) {
  const [hovered, setHovered] = useState<{ key: (typeof SETTLEMENT_SEGMENTS)[number]['key']; x: number; y: number } | null>(null)
  const size = 180
  const center = size / 2
  const radius = 66
  const total = data.total
  const active = SETTLEMENT_SEGMENTS.filter((seg) => data[seg.key] > 0)
  const gapDegrees = active.length > 1 ? 9 : 0
  const available = 360 - gapDegrees * active.length
  const invoicedPct = total > 0 ? Math.round(((data.paid + data.invoicedNotPaid) / total) * 100) : 0

  let angle = 0
  const hoveredSeg = hovered ? SETTLEMENT_SEGMENTS.find((seg) => seg.key === hovered.key) : null

  return (
    <div className="relative flex w-full flex-wrap items-center justify-center gap-6" onMouseLeave={() => setHovered(null)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible drop-shadow-sm" role="img"
          aria-label={`Zafakturowano ${invoicedPct}%: ${SETTLEMENT_SEGMENTS.map((seg) => `${seg.label} ${formatMoney(data[seg.key])}`).join(', ')}`}
        >
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth={14} />
          ) : (
            active.map((seg) => {
              const degrees = (data[seg.key] / total) * available
              const path = describeArc(center, center, radius, angle - 90, angle + degrees - 90)
              angle += degrees + gapDegrees
              return (
                <path
                  key={seg.key}
                  d={path}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hovered?.key === seg.key ? 18 : 14}
                  strokeLinecap="round"
                  className="cursor-pointer transition-all duration-300 ease-out"
                  onMouseMove={(e) => {
                    const box = e.currentTarget.ownerSVGElement?.parentElement?.parentElement?.getBoundingClientRect()
                    if (box) setHovered({ key: seg.key, x: e.clientX - box.left, y: e.clientY - box.top })
                  }}
                />
              )
            })
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {total === 0 ? (
            <span className="text-xl font-extrabold text-[var(--muted-foreground)]">Brak KM</span>
          ) : (
            <>
              <span className="text-4xl font-extrabold leading-none tracking-tight text-[var(--foreground)]">{invoicedPct}%</span>
              <span className="mt-1 max-w-[90px] text-center text-[10px] font-extrabold uppercase leading-tight tracking-wider text-[var(--muted-foreground)]">
                Zafakturowano łącznie
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex min-w-[140px] flex-col gap-4">
        {SETTLEMENT_SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: seg.color }} aria-hidden="true" />
              <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{seg.label}</span>
            </div>
            <span className="pl-5 text-sm font-extrabold text-[var(--foreground)]">{formatMoney(data[seg.key])}</span>
          </div>
        ))}
      </div>

      {hovered && hoveredSeg ? (
        <div
          className="pointer-events-none absolute z-[100] flex min-w-[160px] flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-2 shadow-xl"
          style={{ top: hovered.y + 15, left: hovered.x + 15 }}
        >
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]">
            <span className="size-2.5 rounded-full shadow-sm" style={{ backgroundColor: hoveredSeg.color }} />
            {hoveredSeg.label}
          </div>
          <div className="flex items-baseline gap-1.5 pl-[18px] text-[15px] font-extrabold text-[var(--foreground)]">
            <span>{formatMoney(data[hoveredSeg.key])}</span>
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
              ({total > 0 ? Math.round((data[hoveredSeg.key] / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HoursChart({ weeks }: { weeks: DashboardSummary['hoursByWeek'] }) {
  const max = Math.max(...weeks.map((w) => w.hours), 0)
  const magnitude = max > 0 ? 10 ** Math.floor(Math.log10(max)) : 1
  const axisMax = max > 0 ? Math.ceil(max / magnitude) * magnitude : 1

  return (
    <div className="relative mt-3 h-44 px-4">
      <div className="pointer-events-none absolute inset-x-4 top-5 bottom-6 flex flex-col justify-between">
        <div className="border-t border-dashed border-[var(--border)]" />
        <div className="border-t border-dashed border-[var(--border)]" />
        <div className="border-t border-[var(--border)]" />
      </div>
      <div
        className="relative flex h-full items-stretch gap-3"
        role="img"
        aria-label={`Godziny tygodniowo: ${weeks.map((w) => `${w.label} ${Math.round(w.hours)} h`).join(', ')}`}
      >
        {weeks.map((w) => (
          <div key={w.weekStart} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full flex-1 flex-col items-center justify-end pb-0">
              <span className={`mb-1 text-[10px] ${w.isCurrent ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                {w.hours > 0 ? formatAmount(Math.round(w.hours), 0) : ''}
              </span>
              <div
                className="w-full max-w-[32px] rounded-t-[4px] transition-[height] duration-700 ease-out"
                style={{
                  height: `calc(${(w.hours / axisMax) * 100}% - 18px)`,
                  minHeight: w.hours > 0 ? 3 : 0,
                  background: w.isCurrent ? 'var(--sidebar-primary)' : 'color-mix(in oklch, var(--muted-foreground) 35%, transparent)',
                }}
              />
            </div>
            <span className={`h-6 pt-1.5 text-[10px] ${w.isCurrent ? 'font-semibold text-[var(--sidebar-primary)]' : 'text-[var(--muted-foreground)]'}`}>
              {w.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Ładowanie pulpitu">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${cardCls} h-[108px] animate-pulse p-4`}>
            <div className="h-3 w-24 rounded bg-[var(--muted)]" />
            <div className="mt-3 h-6 w-16 rounded bg-[var(--muted)]" />
            <div className="mt-3 h-3 w-32 rounded bg-[var(--muted)]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={`${cardCls} h-72 animate-pulse lg:col-span-2`} />
        <div className={`${cardCls} h-72 animate-pulse`} />
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  })

  if (isLoading) return <Skeleton />
  if (isError || !data) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
        <div>
          <p className="font-medium text-rose-500">Nie udało się wczytać pulpitu</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error instanceof Error ? error.message : 'Spróbuj odświeżyć stronę.'}</p>
        </div>
      </div>
    )
  }

  const { kpis, invoices } = data

  return (
    <div className="space-y-1.5">
      {/* KPIs */}
      <section aria-label="Wskaźniki" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={FolderKanban}
          label="Aktywne projekty"
          value={kpis.activeProjects}
          note={`z ${kpis.totalProjects} w portfelu${kpis.blockedProjects > 0 ? ` · ${kpis.blockedProjects} wstrzymane` : ''}`}
        />
        <Kpi
          icon={Wrench}
          label="Roboty w toku"
          value={kpis.worksInProgress}
          note={kpis.worksLate > 0 ? `${kpis.worksLate} po terminie` : 'wszystkie w terminie'}
          noteTone={kpis.worksLate > 0 ? 'bad' : 'good'}
        />
        <Kpi
          icon={FileText}
          label="Wnioski o fakturę"
          value={kpis.invoiceRequests}
          note={kpis.invoiceRequests > 0 ? `${formatMoney(kpis.invoiceRequestsNet)} czeka na wystawienie` : 'brak oczekujących wniosków'}
          noteTone={kpis.invoiceRequests > 0 ? 'warn' : 'muted'}
        />
        <Kpi
          icon={Clock}
          label="Godziny w tym tygodniu"
          value={`${formatAmount(Math.round(kpis.hoursThisWeek), 0)} h`}
          note={`${formatAmount(Math.round(kpis.hoursLastWeek), 0)} h w zeszłym tygodniu`}
        />
      </section>

      {/* Projects + invoices */}
      <section className="grid grid-cols-1 gap-1.5 lg:grid-cols-3">
        <div className={`${cardCls} overflow-hidden lg:col-span-2`}>
          <CardHeader
            icon={FolderKanban}
            title="Projekty"
            action={
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Zobacz wszystkie <ArrowRight size={12} />
              </button>
            }
          />
          {data.projects.length === 0 ? (
            <Empty>Brak projektów.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Projekt</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                    <th className="w-[190px] border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Postęp</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Termin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/projects/${p.id}`) }}
                      className={`group cursor-pointer outline-none ${rowHoverCls} focus-visible:bg-[color-mix(in_oklch,var(--sidebar-primary)_7%,transparent)]`}
                    >
                      <td className="border-b border-[var(--border)] px-4 py-3.5 align-middle">
                        <p className="text-sm font-bold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--sidebar-primary)]">{p.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)]">{p.contractor ?? '—'}</p>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3.5 align-middle">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
                          {t(`projects.status.${p.status}`)}
                        </span>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3.5 align-middle">
                        {p.progress === null ? (
                          <span className="text-xs font-medium text-[var(--muted-foreground)]">brak robót</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                              <div className="h-full rounded-full bg-[var(--sidebar-primary)]" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="w-9 text-right text-xs font-semibold text-[var(--foreground)]">{p.progress}%</span>
                          </div>
                        )}
                        {p.lateWorks > 0 ? (
                          <p className="mt-1 text-[10px] font-semibold text-rose-500">
                            {p.lateWorks === 1 ? '1 robota po terminie' : `${p.lateWorks} roboty po terminie`}
                          </p>
                        ) : null}
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3.5 text-right align-middle text-xs font-semibold text-[var(--foreground)]">{formatDate(p.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${cardCls} flex flex-col`}>
          <CardHeader icon={PieChart} title="Rozliczenia" />
          <div className="flex flex-1 items-center justify-center px-4 py-4">
            <SettlementChart data={data.settlement} />
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--border)] px-3 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Wymaga uwagi</div>
            {invoices.attention.length === 0 ? (
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">Wszystko w porządku.</p>
            ) : (
              invoices.attention.map((a) => {
                const badge = a.kind === 'overdue'
                  ? { text: `${a.days} dni po terminie`, cls: 'border-rose-500/20 bg-rose-500/10 text-rose-500' }
                  : a.kind === 'due_soon'
                    ? { text: a.days === 0 ? 'termin dziś' : `termin za ${a.days} dni`, cls: 'border-amber-500/20 bg-amber-500/10 text-amber-500' }
                    : { text: 'wniosek', cls: 'border-amber-500/20 bg-amber-500/10 text-amber-500' }
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate(`/projects/${a.projectId}/milestones`)}
                    className="group flex items-center gap-2 rounded-md text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--sidebar-primary)]">{a.number ?? `${a.milestoneNo} · ${formatMoney(a.net, a.currency)}`}</span>
                      <span className="block truncate text-[10px] font-medium text-[var(--muted-foreground)]">{a.projectName} · {a.milestoneNo}</span>
                    </span>
                    <span className={`${pillCls} ${badge.cls}`}>{badge.text}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* Hours + upcoming + reports */}
      <section className="grid grid-cols-1 gap-1.5 lg:grid-cols-3">
        <div className={`${cardCls} flex flex-col`}>
          <CardHeader icon={Clock} title="Godziny pracy · 8 tygodni" />
          <HoursChart weeks={data.hoursByWeek} />
          <p className="px-3 pb-3 pt-1 text-[10px] font-medium text-[var(--muted-foreground)]">
            Z raportów dziennych. Bieżący tydzień ({data.hoursByWeek[data.hoursByWeek.length - 1]?.label}) jest niepełny.
          </p>
        </div>

        <div className={`${cardCls} flex flex-col`}>
          <CardHeader icon={CalendarClock} title="Najbliższe terminy" />
          {data.upcoming.length === 0 ? (
            <Empty>Brak zaplanowanych robót.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)] px-3">
              {data.upcoming.map((u) => {
                const { day, month } = dayMonth(u.plannedEnd)
                return (
                  <li key={u.workId}>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${u.projectId}/works/praca/${u.workId}`)}
                      className="group flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left"
                    >
                      <div className="w-11 shrink-0 text-center">
                        <div className="text-base font-extrabold leading-6 text-[var(--foreground)]">{day}</div>
                        <div className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">{month}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--sidebar-primary)]">{u.name}</div>
                        <div className="truncate text-[10px] font-medium text-[var(--muted-foreground)]">
                          {u.projectName}{u.milestoneNo ? ` · ${u.milestoneNo}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-bold text-[var(--foreground)]">{u.started ? `${u.progress}%` : 'nierozp.'}</div>
                        <div className="text-[10px] font-medium text-[var(--muted-foreground)]">{relativeDay(u.plannedEnd)}</div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className={`${cardCls} flex flex-col`}>
          <CardHeader icon={ClipboardList} title="Ostatnie raporty" />
          {data.recentReports.length === 0 ? (
            <Empty>Brak raportów.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)] px-3">
              {data.recentReports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${r.projectId}/works/praca/${r.workId}`)}
                    className="group flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[10px] font-bold text-[var(--sidebar-primary)] shadow-sm"
                    >
                      {r.department ? initials(r.department) : <HardHat size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--sidebar-primary)]">{r.workName}</div>
                      <div className="truncate text-[11px] font-medium text-[var(--muted-foreground)]">
                        {[
                          `${formatAmount(r.quantity, 0, 2)} ${r.unit ?? ''}`.trim(),
                          r.workers !== null ? `${r.workers} os.` : null,
                          relativeDay(r.date),
                        ].filter(Boolean).join(' · ')}
                      </div>
                      <div className="truncate text-[10px] font-medium text-[var(--muted-foreground)]">{r.projectName}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="flex items-center gap-1.5 px-1 text-[10px] font-medium text-[var(--muted-foreground)]">
        <CalendarClock size={12} />
        Stan na {new Date(data.generatedAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        <ClipboardList size={12} className="ml-2" />
        Postęp projektu liczony z raportów dziennych dla etapów KM.
      </p>
    </div>
  )
}
