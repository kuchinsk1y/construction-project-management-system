import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronDown, Clock, Plus, RefreshCw, Search, Star, Users, X } from 'lucide-react'
import { ErrorNote } from '@/components/ui'
import { brigadeApi, type RowKind, type WorkLog } from '@/lib/api'
import { KIND_ORDER, KINDS } from '@/lib/kinds'
import { displayName } from '@/lib/names'

type Day = WorkLog['days'][number]
type DayWorker = Day['workers'][number]

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
const hoursLabel = (h: number) => `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(h)} h`
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }).format(new Date(iso))
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date())

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')

export function WorkLogPage() {
  const [data, setData] = useState<WorkLog | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const load = useCallback(async (fresh = false) => {
    setLoading(true)
    setError('')
    try {
      const log = await brigadeApi.workLog(fresh)
      setData(log)
      // The newest day is open, the rest folded
      setOpen((prev) => (prev.size ? prev : new Set(log.days.slice(0, 1).map((d) => d.date))))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const search = plain(query.trim())
  const days = useMemo(() => {
    if (!data) return []
    if (!search) return data.days
    return data.days
      .map((d) => ({ ...d, workers: d.workers.filter((w) => plain(w.worker.name).includes(search)) }))
      .filter((d) => d.workers.length > 0)
  }, [data, search])

  const today = data?.to ?? todayIso()
  const todayDone = !!data?.days.some((d) => d.date === today)
  const toggle = (date: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Historia</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Twoje wpisy z ostatnich 14 dni. Tylko do odczytu.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] disabled:opacity-60"
            title="Odśwież"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{data ? `Stan na ${timeLabel(data.generatedAt)}` : 'Odśwież'}</span>
          </button>
          <Link
            to="/dziennik/nowy"
            title={todayDone ? 'Dzisiejszy dzień jest już zapisany — możesz wybrać inną datę' : 'Wpisz dzień'}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:bg-[color-mix(in_oklch,var(--primary)_88%,black)]"
          >
            <Plus className="size-4" />
            Dodaj wpis
            {todayDone ? <span className="rounded-full bg-white/20 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider">Dziś zapisano</span> : null}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj pracownika"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-10 pr-9 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_oklch,var(--primary)_15%,transparent)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Wyczyść"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>
        <Legend />
      </div>

      {error ? (
        <ErrorNote>
          {error}{' '}
          <button type="button" onClick={() => void load(true)} className="font-semibold underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </ErrorNote>
      ) : null}

      {loading && !data ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skeleton block h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : data && days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center">
          <CalendarDays className="mx-auto size-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-sm font-semibold">{search ? 'Nikogo nie znaleziono' : 'Brak wpisów w ostatnich 14 dniach'}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {search ? 'Sprawdź pisownię nazwiska.' : 'Wpisy pojawią się tutaj po zapisaniu dnia.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((day, i) => (
            <DayCard key={day.date} day={day} today={today} open={!!search || open.has(day.date)} onToggle={() => toggle(day.date)} delay={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {KIND_ORDER.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <span className={`size-2 rounded-full ${KINDS[k].dot}`} />
          {KINDS[k].label}
        </span>
      ))}
    </div>
  )
}

function DayCard({ day, today, open, onToggle, delay }: { day: Day; today: string; open: boolean; onToggle: () => void; delay: number }) {
  const counts = useMemo(() => {
    const c = new Map<RowKind, number>()
    for (const w of day.workers) for (const r of w.rows) c.set(r.workType.kind, (c.get(r.workType.kind) ?? 0) + 1)
    return KIND_ORDER.filter((k) => k !== 'work' && c.get(k)).map((k) => [k, c.get(k)!] as const)
  }, [day])
  const hasRatings = day.workers.some((w) => w.rating !== null)

  return (
    <section
      className="rise-in overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
      style={{ animationDelay: `${Math.min(delay, 8) * 35}ms` }}
    >
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5 text-left" aria-expanded={open}>
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] leading-none text-[var(--primary)]">
            <span className="text-[15px] font-bold tabular-nums">{Number(day.date.slice(8))}</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold first-letter:uppercase">{dayLabel(day.date)}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {day.totals.workers}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {hoursLabel(day.totals.hours)}
              </span>
              {day.date === today ? <span className="font-semibold text-[var(--primary)]">Dzisiaj</span> : null}
            </span>
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {counts.map(([k, n]) => (
            <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${KINDS[k].badge}`}>
              {KINDS[k].label} {n}
            </span>
          ))}
          <ChevronDown className={`ml-1 size-4 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open ? (
        <div className="border-t border-[var(--border)]">
          <DayTable workers={day.workers} hasRatings={hasRatings} />
          <DayList workers={day.workers} hasRatings={hasRatings} />
        </div>
      ) : null}
    </section>
  )
}

const th = 'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]'
const td = 'px-3 py-2 align-top'

/** Desktop: table, the worker cell spans their rows */
function DayTable({ workers, hasRatings }: { workers: DayWorker[]; hasRatings: boolean }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--background)]">
          <tr>
            <th className={`${th} pl-3.5`}>Pracownik</th>
            <th className={th}>Obiekt</th>
            <th className={th}>Rodzaj</th>
            <th className={`${th} text-right`}>Godziny</th>
            <th className={`${th} text-right`}>Dopłata</th>
            {hasRatings ? <th className={`${th} pr-3.5 text-right`}>Ocena</th> : null}
          </tr>
        </thead>
        <tbody>
          {workers.map((w) =>
            w.rows.map((r, i) => (
              <tr key={`${w.worker.id ?? w.worker.name}-${i}`} className={i === 0 ? 'border-t border-[var(--border)]' : ''}>
                {i === 0 ? (
                  <td className={`${td} pl-3.5`} rowSpan={w.rows.length}>
                    <WorkerName worker={w} />
                  </td>
                ) : null}
                <td className={`${td} max-w-[220px]`}>
                  <span className="block truncate" title={r.project?.name}>
                    {r.project?.name ?? <span className="text-[var(--muted-foreground)]">—</span>}
                  </span>
                </td>
                <td className={td}>
                  <KindBadge kind={r.workType.kind} name={r.workType.name} />
                  {r.note ? <p className="mt-1 max-w-[280px] text-xs text-[var(--muted-foreground)]">{r.note}</p> : null}
                </td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{r.hours ? hoursLabel(r.hours) : <Muted>0 h</Muted>}</td>
                <td className={`${td} text-right tabular-nums`}>{r.surcharge ? `+${r.surcharge.ratePerHour} zł/h` : <Muted>—</Muted>}</td>
                {hasRatings && i === 0 ? (
                  <td className={`${td} pr-3.5 text-right`} rowSpan={w.rows.length}>
                    <Rating value={w.rating} />
                  </td>
                ) : null}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Phone: one block per worker */
function DayList({ workers, hasRatings }: { workers: DayWorker[]; hasRatings: boolean }) {
  return (
    <ul className="divide-y divide-[var(--border)] md:hidden">
      {workers.map((w) => (
        <li key={w.worker.id ?? w.worker.name} className="px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <WorkerName worker={w} />
            <span className="flex shrink-0 items-center gap-2">
              {hasRatings ? <Rating value={w.rating} /> : null}
              <span className="text-sm font-semibold tabular-nums">{hoursLabel(w.hours)}</span>
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {w.rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <KindBadge kind={r.workType.kind} name={r.workType.name} />
                {r.project ? <span className="text-[var(--muted-foreground)]">{r.project.name}</span> : null}
                {w.rows.length > 1 ? <span className="font-semibold tabular-nums">{hoursLabel(r.hours)}</span> : null}
                {r.surcharge ? <span className="font-medium tabular-nums">+{r.surcharge.ratePerHour} zł/h</span> : null}
                {r.note ? <span className="basis-full text-[var(--muted-foreground)]">{r.note}</span> : null}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

function WorkerName({ worker: w }: { worker: DayWorker }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium">{displayName(w.worker.name)}</span>
      {w.worker.company ? <span className="block truncate text-xs text-[var(--muted-foreground)]">{w.worker.company}</span> : null}
    </span>
  )
}

function KindBadge({ kind, name }: { kind: RowKind; name: string }) {
  return (
    <span
      className={`inline-flex max-w-[260px] items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${KINDS[kind].badge}`}
      title={`${KINDS[kind].label}: ${name}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${KINDS[kind].dot}`} />
      <span className="truncate">{name}</span>
    </span>
  )
}

function Rating({ value }: { value: number | null }) {
  if (value === null) return <Muted>—</Muted>
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums" title={`Ocena ${value} z 5`}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" />
      {value}
    </span>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-[var(--muted-foreground)]">{children}</span>
}
