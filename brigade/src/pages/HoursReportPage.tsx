import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Flame, RefreshCw, TableProperties, Users } from 'lucide-react'
import { ErrorNote } from '@/components/ui'
import { brigadeApi, type HoursReport } from '@/lib/api'
import { KINDS, MARK_KIND, type DayMark } from '@/lib/kinds'
import { displayName } from '@/lib/names'

const TZ = 'Europe/Warsaw'
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()).slice(0, 7)
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const monthLabel = (m: string) =>
  new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`))
const weekday = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)).slice(0, 2)
const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay())
const fmtHours = (h: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(h)
const timeLabel = (iso: string) => new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))

const MARK_LABEL: Record<DayMark, string> = { U: 'Urlop', C: 'Chory', W: 'Wolne', Z: 'Zwolniony', A: 'Absencja', K: 'Kara' }

export function HoursReportPage() {
  const [month, setMonth] = useState(currentMonth)
  const [company, setCompany] = useState<string | null>(null)
  const [data, setData] = useState<HoursReport | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (m: string, c: string | null, fresh = false) => {
    setLoading(true)
    setError('')
    try {
      setData(await brigadeApi.hoursReport(m, c, fresh))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(month, company)
  }, [load, month, company])

  const changeMonth = (m: string | null) => {
    if (!m) return
    setMonth(m)
    setCompany(null) // companies differ between months
  }

  const overtime = useMemo(
    () => (data ? data.workers.reduce((s, w) => s + w.hours.filter((h) => h !== null && h > data.overtimeThreshold).length, 0) : 0),
    [data],
  )
  const shown = data?.month === month ? data : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Raport godzin</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Godziny Twoich pracowników dzień po dniu.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(month, company, true)}
          disabled={loading}
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {data ? `Stan na ${timeLabel(data.generatedAt)}` : 'Odśwież'}
        </button>
      </div>

      {/* Filters and totals */}
      <section className="rise-in rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-1.5">
            <MonthButton dir="prev" disabled={loading || !data?.prevMonth} onClick={() => changeMonth(data?.prevMonth ?? null)} />
            <div className="min-w-[170px] text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Miesiąc</p>
              <p className="text-base font-semibold capitalize tracking-tight">{monthLabel(month)}</p>
            </div>
            <MonthButton dir="next" disabled={loading || !data?.nextMonth || month >= currentMonth()} onClick={() => changeMonth(data?.nextMonth ?? null)} />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:w-[480px]">
            <Total icon={Users} label="Pracownicy" value={shown ? String(shown.totals.workers) : null} />
            <Total icon={Clock} label="Suma godzin" value={shown ? fmtHours(shown.totals.hours) : null} />
            <Total icon={Flame} label={`Ponad ${data?.overtimeThreshold ?? 12} h`} value={shown ? String(overtime) : null} warn={overtime > 0} />
          </div>
        </div>

        {data && data.filters.companies.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Firma</span>
            {[null, ...data.filters.companies].map((c) => (
              <button
                key={c ?? 'all'}
                type="button"
                onClick={() => setCompany(c)}
                className={`h-7 rounded-full px-3 text-xs font-semibold transition ${
                  company === c
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                    : 'border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {c ?? 'Wszystkie'}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <ErrorNote>
          Błąd pobierania danych: {error}{' '}
          <button type="button" onClick={() => void load(month, company, true)} className="font-semibold underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </ErrorNote>
      ) : null}

      <Legend threshold={data?.overtimeThreshold ?? 12} />

      {loading && !shown ? (
        <span className="skeleton block h-[420px] w-full rounded-xl" />
      ) : shown && shown.workers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center">
          <TableProperties className="mx-auto size-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-sm font-semibold">Brak danych za wybrany okres.</p>
        </div>
      ) : shown ? (
        <Pivot report={shown} dim={loading} />
      ) : null}
    </div>
  )
}

function MonthButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-35"
      aria-label={dir === 'prev' ? 'Poprzedni miesiąc' : 'Następny miesiąc'}
    >
      <Icon className="size-4" />
    </button>
  )
}

function Total({ icon: Icon, label, value, warn }: { icon: typeof Users; label: string; value: string | null; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg bg-[var(--background)] px-3 py-2">
      <p className="flex items-center gap-1.5 truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)] sm:text-[10px] sm:tracking-[0.12em]">
        <Icon className={`hidden size-3 shrink-0 sm:block ${warn ? 'text-[var(--warning)]' : ''}`} />
        {label}
      </p>
      {value === null ? (
        <span className="skeleton mt-1.5 block h-6 w-14" />
      ) : (
        <p className="mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      )}
    </div>
  )
}

function Legend({ threshold }: { threshold: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-5 min-w-7 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--warning)_22%,transparent)] px-1 text-[10px] font-bold text-[var(--foreground)]">13</span>
        Ponad {threshold} h
      </span>
      {(Object.keys(MARK_LABEL) as DayMark[]).map((m) => (
        <span key={m} className="inline-flex items-center gap-1.5">
          <MarkBadge mark={m} />
          {MARK_LABEL[m]}
        </span>
      ))}
    </div>
  )
}

function MarkBadge({ mark }: { mark: DayMark }) {
  const kind = KINDS[MARK_KIND[mark]]
  return (
    <span className={`inline-flex size-5 items-center justify-center rounded-md text-[10px] font-bold ring-1 ring-inset ${kind.badge}`} title={MARK_LABEL[mark]}>
      {mark}
    </span>
  )
}

/** Worker × day table: names stay on the left and the month total on the right while scrolling */
function Pivot({ report, dim }: { report: HoursReport; dim: boolean }) {
  const now = today()
  const dayTotals = report.dates.map((_, i) => report.workers.reduce((s, w) => s + (w.hours[i] ?? 0), 0))
  const head = 'sticky top-0 z-20 bg-[var(--card)]'

  return (
    <div className={`rise-in overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-opacity ${dim ? 'opacity-60' : ''}`}>
      <div className="scrollbar-thin max-h-[calc(100vh-260px)] min-h-[320px] overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${head} left-0 z-30 min-w-[150px] border-b border-r border-[var(--border)] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)] sm:min-w-[250px]`}>
                Pracownik
              </th>
              {report.dates.map((d) => {
                const isToday = d === now
                return (
                  <th
                    key={d}
                    className={`${head} min-w-[42px] border-b border-[var(--border)] px-1 py-2 text-center font-normal ${isWeekend(d) ? 'bg-[color-mix(in_oklch,var(--muted)_70%,var(--card))]' : ''}`}
                    title={d.split('-').reverse().join('.')}
                  >
                    <span className="block text-[9px] uppercase text-[var(--muted-foreground)]">{weekday(d)}</span>
                    <span
                      className={`mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                        isToday ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''
                      }`}
                    >
                      {Number(d.slice(8))}
                    </span>
                  </th>
                )
              })}
              <th className={`${head} right-0 z-30 min-w-[84px] border-b border-l border-[var(--border)] px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]`}>
                Suma
              </th>
            </tr>
          </thead>
          <tbody>
            {report.workers.map((w, row) => (
              <tr key={w.key} className="group">
                <td className="sticky left-0 z-10 border-b border-r border-[var(--border)] bg-[var(--card)] px-3 py-2 group-hover:bg-[var(--muted)] sm:px-4">
                  <span className="flex items-baseline gap-2">
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{row + 1}.</span>
                    <span className="min-w-0">
                      <span className="block max-w-[120px] truncate font-medium sm:max-w-[200px]">{displayName(w.name)}</span>
                      {w.company ? <span className="block truncate text-[11px] text-[var(--muted-foreground)]">{w.company}</span> : null}
                    </span>
                  </span>
                </td>
                {report.dates.map((d, i) => {
                  const h = w.hours[i]
                  const mark = w.marks[i]
                  const over = h !== null && h > report.overtimeThreshold
                  return (
                    <td
                      key={d}
                      className={`border-b border-[var(--border)] px-1 py-2 text-center tabular-nums group-hover:bg-[var(--muted)] ${
                        isWeekend(d) ? 'bg-[color-mix(in_oklch,var(--muted)_45%,transparent)]' : ''
                      }`}
                    >
                      {h !== null ? (
                        <span
                          className={`inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1 text-[13px] ${
                            over ? 'bg-[color-mix(in_oklch,var(--warning)_22%,transparent)] font-bold' : 'font-medium'
                          }`}
                          title={over ? `${fmtHours(h)} h — ponad ${report.overtimeThreshold} h` : `${fmtHours(h)} h`}
                        >
                          {fmtHours(h)}
                        </span>
                      ) : mark ? (
                        <MarkBadge mark={mark} />
                      ) : null}
                    </td>
                  )
                })}
                <td className="sticky right-0 z-10 border-b border-l border-[var(--border)] bg-[var(--card)] px-3 py-2 text-right font-semibold tabular-nums group-hover:bg-[var(--muted)]">
                  {fmtHours(w.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky bottom-0 left-0 z-30 border-r border-t border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                Suma dnia
              </td>
              {dayTotals.map((t, i) => (
                <td key={report.dates[i]} className="sticky bottom-0 z-20 border-t border-[var(--border)] bg-[var(--background)] px-1 py-2.5 text-center text-xs font-semibold tabular-nums">
                  {t ? fmtHours(t) : <span className="text-[var(--muted-foreground)]">·</span>}
                </td>
              ))}
              <td className="sticky bottom-0 right-0 z-30 border-l border-t border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-right font-bold tabular-nums">
                {fmtHours(report.totals.hours)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
