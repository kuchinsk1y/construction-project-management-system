import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe2,
  HardHat,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { ErrorNote } from '@/components/ui'
import { brigadeApi, type CountItem, type Pulpit } from '@/lib/api'

const TZ = 'Europe/Warsaw'
const TOP = 5

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', ...options }).format(new Date(`${iso}T00:00:00Z`))
const timeLabel = (iso: string) => new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const hoursLabel = (h: number) => `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(h)} h`
const daysWord = (n: number) => (n === 1 ? 'dzień' : 'dni')
const peopleWord = (n: number) => (n === 1 ? 'osoba' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'osoby' : 'osób')

const PROJECT_STATUS: Record<string, string> = { DRAFT: 'Szkic', ACTIVE: 'Aktywny', ON_HOLD: 'Wstrzymany' }

function usePulpit() {
  const [data, setData] = useState<Pulpit | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (fresh = false) => {
    setLoading(true)
    setError('')
    try {
      setData(await brigadeApi.pulpit(fresh))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, error, loading, reload: () => load(true) }
}

export function PulpitPage() {
  const { user } = useAuth()
  const { data, error, loading, reload } = usePulpit()
  const firstName = user?.firstName ?? ''
  const today = data?.today ?? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  const initial = loading && !data

  return (
    <div className="space-y-3">
      {/* Greeting + status of the log */}
      <section className="brand-panel rise-in relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_24px_48px_-30px_color-mix(in_oklch,var(--primary-strong),transparent_20%)]">
        <div className="brand-grid pointer-events-none absolute inset-0" />
        <div className="glow-orb pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              <CalendarDays className="size-3.5" />
              {fmt(today, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">Dzień dobry{firstName ? `, ${firstName}` : ''}!</h1>
            <p className="mt-1 max-w-xl text-sm text-white/75">Twoja brygada i ostatnie wpisy w jednym miejscu.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {initial ? <span className="skeleton h-8 w-44 opacity-30" /> : <EntryStatus days={data?.activity?.daysWithoutEntry ?? null} />}
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/12 px-3 text-xs font-medium ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 disabled:opacity-70"
              title="Odśwież dane"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              {data ? `Stan na ${timeLabel(data.generatedAt)}` : 'Odśwież'}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <ErrorNote>
          {error}{' '}
          <button type="button" onClick={reload} className="font-semibold underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </ErrorNote>
      ) : null}

      {data?.warnings.length ? (
        <div className="rise-in flex items-start gap-3 rounded-xl border border-[color-mix(in_oklch,var(--warning)_40%,transparent)] bg-[color-mix(in_oklch,var(--warning)_10%,transparent)] px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
          <div className="min-w-0 flex-1">
            {data.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
            <p className="text-[var(--muted-foreground)]">Pozostałe dane są aktualne.</p>
          </div>
          <button type="button" onClick={reload} disabled={loading} className="shrink-0 font-semibold text-[var(--primary)] hover:underline">
            Ponów
          </button>
        </div>
      ) : null}

      {/* Key numbers */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Users} label="Pracownicy" loading={initial} value={data?.workers?.total} note="przypisani do Ciebie" />
        <Kpi
          icon={HardHat}
          label="ISPIK"
          loading={initial}
          value={data?.workers ? data.workers.ispikPolska.count + data.workers.ispikLotwa.count : undefined}
          note={data?.workers ? `Polska ${data.workers.ispikPolska.count} · Łotwa ${data.workers.ispikLotwa.count}` : 'Polska · Łotwa'}
        />
        <Kpi
          icon={Globe2}
          label="Agencje"
          loading={initial}
          value={data?.workers?.agencies.count}
          note={data?.workers ? `${data.workers.agencies.companies.length} ${data.workers.agencies.companies.length === 1 ? 'firma' : 'firm'}` : 'pracownicy agencji'}
        />
        <Kpi
          icon={Clock}
          label="Ostatni wpis"
          loading={initial}
          value={data?.activity ? (data.activity.latestEntryDate ? fmt(data.activity.latestEntryDate, { day: 'numeric', month: 'short' }) : '—') : undefined}
          note={
            data?.activity?.daysWithoutEntry != null
              ? data.activity.daysWithoutEntry === 0
                ? 'dzisiaj'
                : `${data.activity.daysWithoutEntry} ${daysWord(data.activity.daysWithoutEntry)} temu`
              : 'brak wpisów w 14 dniach'
          }
        />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Card title="Godziny brygady" subtitle="Ostatnie 14 dni, z dziennika prac" className="[animation-delay:60ms]">
          {initial ? <ChartSkeleton /> : data?.activity ? <ActivityChart days={data.activity.days} today={today} /> : <Unavailable />}
        </Card>

        <Card title="Moje obiekty" subtitle="Z ERP: działy, do których jesteś przypisany" className="[animation-delay:120ms]">
          {initial ? <ListSkeleton /> : <Projects projects={data?.projects ?? []} />}
        </Card>
      </div>

      <Card title="Skład brygady" subtitle="Według stanowisk i firm" className="[animation-delay:180ms]">
        {initial ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <ListSkeleton key={i} />
            ))}
          </div>
        ) : data?.workers ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Group title="ISPIK Polska" count={data.workers.ispikPolska.count} sections={[{ label: 'Stanowiska', items: data.workers.ispikPolska.positions }]} />
            <Group title="ISPIK Łotwa" count={data.workers.ispikLotwa.count} sections={[{ label: 'Stanowiska', items: data.workers.ispikLotwa.positions }]} />
            <Group
              title="Agencje"
              count={data.workers.agencies.count}
              sections={[
                { label: 'Firmy', items: data.workers.agencies.companies },
                { label: 'Stanowiska', items: data.workers.agencies.positions },
              ]}
            />
          </div>
        ) : (
          <Unavailable />
        )}
      </Card>
    </div>
  )
}

// --- pieces ---

function EntryStatus({ days }: { days: number | null }) {
  const look =
    days === null
      ? { icon: XCircle, text: 'Brak wpisów w 14 dniach', tone: 'var(--destructive)' }
      : days <= 1
        ? { icon: CheckCircle2, text: 'Dziennik na bieżąco', tone: 'var(--success)' }
        : days <= 3
          ? { icon: AlertTriangle, text: `Brak wpisu od ${days} dni`, tone: 'var(--warning)' }
          : { icon: XCircle, text: `Brak wpisu od ${days} dni`, tone: 'var(--destructive)' }
  const Icon = look.icon
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[var(--foreground)] shadow-sm dark:bg-[var(--card)]">
      <Icon className="size-3.5" style={{ color: look.tone }} />
      {look.text}
    </span>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  note,
  loading,
}: {
  icon: typeof Users
  label: string
  value: number | string | undefined
  note: string
  loading: boolean
}) {
  return (
    <div className="rise-in rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <Icon className="size-3.5" />
        </span>
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.12em]">{label}</span>
      </div>
      {loading ? (
        <span className="skeleton mt-2.5 block h-6 w-16" />
      ) : (
        <p className="mt-2.5 truncate text-2xl font-semibold leading-none tracking-tight">{value ?? '—'}</p>
      )}
      <p className="mt-1.5 truncate text-xs text-[var(--muted-foreground)]">{note}</p>
    </div>
  )
}

function Card({ title, subtitle, className = '', children }: { title: string; subtitle: string; className?: string; children: ReactNode }) {
  return (
    <section className={`rise-in min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 ${className}`}>
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p>
      <div className="mt-3.5">{children}</div>
    </section>
  )
}

function Unavailable() {
  return <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Dane chwilowo niedostępne.</p>
}

/** Hours per day: one series (bars), hover / tap shows the day */
function ActivityChart({ days, today }: { days: NonNullable<Pulpit['activity']>['days']; today: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(...days.map((d) => d.hours), 0)
  const step = niceStep(max)
  const top = Math.max(step * 3, step)
  const ticks = [top, (top * 2) / 3, top / 3]

  const worked = days.filter((d) => d.hours > 0)
  const total = worked.reduce((s, d) => s + d.hours, 0)
  const shown = days.find((d) => d.date === active)

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-8 gap-y-2">
        <Stat label="Łącznie" value={hoursLabel(total)} />
        <Stat label="Średnio na dzień pracy" value={worked.length ? hoursLabel(total / worked.length) : '—'} />
        <Stat label="Dni z pracą" value={`${worked.length} z ${days.length}`} />
      </div>

      <div className="relative">
        {/* Grid with values */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44">
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-2" style={{ top: `${(i / 3) * 100}%` }}>
              <span className="w-9 text-right text-[10px] tabular-nums text-[var(--muted-foreground)]">{Math.round(t)}</span>
              <span className="h-px flex-1 bg-[var(--border)] opacity-70" />
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 ml-11 h-px bg-[var(--border)]" />
        </div>

        <div className="ml-11 flex h-44 items-end gap-[3px] sm:gap-1.5" onMouseLeave={() => setActive(null)}>
          {days.map((d) => {
            const isToday = d.date === today
            const isActive = d.date === active
            const height = top ? (d.hours / top) * 100 : 0
            return (
              <button
                key={d.date}
                type="button"
                onMouseEnter={() => setActive(d.date)}
                onFocus={() => setActive(d.date)}
                onClick={() => setActive(d.date)}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                aria-label={`${fmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${d.filled ? `${hoursLabel(d.hours)}, ${d.workers} ${peopleWord(d.workers)}` : 'brak wpisu'}`}
              >
                <span className={`absolute inset-x-0 inset-y-0 rounded-md transition ${isActive ? 'bg-[var(--muted)]' : ''}`} />
                {d.hours > 0 ? (
                  <span
                    className="relative w-full max-w-[26px] rounded-t-[4px] transition-[filter]"
                    style={{
                      height: `${Math.max(height, 2)}%`,
                      background: 'var(--primary)',
                      filter: active && !isActive ? 'saturate(0.55) opacity(0.6)' : undefined,
                    }}
                  />
                ) : d.filled ? (
                  // Written, but nobody worked (days off, vacations)
                  <span className="relative h-1 w-full max-w-[26px] rounded-full bg-[var(--muted-foreground)] opacity-40" />
                ) : (
                  <span
                    className={`relative h-3 w-full max-w-[26px] rounded-t-[4px] border border-b-0 border-dashed ${
                      isToday ? 'border-[var(--primary)]' : 'border-[var(--muted-foreground)]/50'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="ml-11 mt-2 flex gap-[3px] sm:gap-1.5">
          {days.map((d) => {
            const isToday = d.date === today
            const weekend = [0, 6].includes(new Date(`${d.date}T00:00:00Z`).getUTCDay())
            return (
              <div key={d.date} className="min-w-0 flex-1 text-center leading-tight">
                <span className={`block text-[9px] uppercase sm:text-[10px] ${weekend ? 'text-[var(--muted-foreground)]/60' : 'text-[var(--muted-foreground)]'}`}>
                  {fmt(d.date, { weekday: 'short' }).slice(0, 2)}
                </span>
                <span
                  className={`mx-auto mt-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-semibold tabular-nums sm:size-5 sm:text-[11px] ${
                    isToday ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''
                  }`}
                >
                  {Number(d.date.slice(8))}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day details: hover on desktop, tap on phone */}
      <div className="mt-3 flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm">
        {shown ? (
          <>
            <span className="font-semibold">{fmt(shown.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="ml-auto text-right text-[var(--muted-foreground)]">
              {shown.filled ? (
                shown.hours > 0 ? (
                  <>
                    <span className="font-semibold text-[var(--foreground)]">{hoursLabel(shown.hours)}</span> · {shown.workers} {peopleWord(shown.workers)}
                  </>
                ) : (
                  'Wpis bez godzin pracy (wolne, urlopy)'
                )
              ) : shown.date === today ? (
                'Dzisiaj jeszcze bez wpisu'
              ) : (
                'Brak wpisu'
              )}
            </span>
          </>
        ) : (
          <span className="text-[var(--muted-foreground)]">Najedź lub dotknij słupka, aby zobaczyć szczegóły dnia.</span>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

/** Round grid step so that 3 steps cover the maximum */
function niceStep(max: number) {
  if (max <= 0) return 10
  const raw = max / 3
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
}

function Projects({ projects }: { projects: Pulpit['projects'] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--muted-foreground)]">
          <Building2 className="size-5" />
        </span>
        <p className="text-sm font-medium">Brak przypisanych obiektów</p>
        <p className="max-w-xs text-xs text-[var(--muted-foreground)]">Kierownik projektu przypisuje brygadzistów do działów obiektu w ERP.</p>
      </div>
    )
  }
  return (
    <ul className="scrollbar-thin -mx-1 max-h-[330px] space-y-2 overflow-y-auto px-1">
      {projects.map((p) => (
        <li key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-[var(--primary)]">
              <Building2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                {p.status !== 'ACTIVE' ? (
                  <span className="shrink-0 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">
                    {PROJECT_STATUS[p.status] ?? p.status}
                  </span>
                ) : null}
              </div>
              {p.city ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                  <MapPin className="size-3" />
                  {p.city}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {p.departments.map((d) => (
                  <span key={d} className="rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-[11px] font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Group({ title, count, sections }: { title: string; count: number; sections: Array<{ label: string; items: CountItem[] }> }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{count}</p>
      </div>
      {count === 0 ? (
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">Brak pracowników</p>
      ) : (
        sections.map((s) => <Breakdown key={s.label} label={s.label} items={s.items} total={count} />)
      )}
    </div>
  )
}

/** Share of the group: thin bar under each name, the number is the label */
function Breakdown({ label, items, total }: { label: string; items: CountItem[]; total: number }) {
  const [open, setOpen] = useState(false)
  const visible = useMemo(() => (open ? items : items.slice(0, TOP)), [items, open])
  const hidden = items.length - TOP
  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p>
      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item.name} title={`${item.name}: ${item.count}`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-[var(--muted-foreground)]">{item.name}</span>
              <span className="font-semibold tabular-nums">{item.count}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-[var(--muted)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${(item.count / total) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          {open ? 'Zwiń' : `+${hidden} więcej`}
          <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div>
      <div className="mb-4 flex gap-8">
        {[0, 1, 2].map((i) => (
          <span key={i} className="skeleton h-10 w-24" />
        ))}
      </div>
      <div className="ml-11 flex h-44 items-end gap-1.5">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="skeleton flex-1 rounded-b-none" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
        ))}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="skeleton block h-14 w-full rounded-xl" />
      ))}
    </div>
  )
}
