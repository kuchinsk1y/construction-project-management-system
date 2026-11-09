import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  HardHat,
  Palmtree,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  UserX,
  X,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { ErrorNote } from '@/components/ui'
import { brigadeApi, type DayForm } from '@/lib/api'
import {
  MAX_DAY_HOURS,
  canRate,
  clampHours,
  emptyForeman,
  emptyRow,
  initialState,
  isServiceValue,
  kindOfValue,
  readDraft,
  serviceValue,
  sumHours,
  toNumber,
  validate,
  writeDraft,
  type Crew,
  type FormRow,
  type FormState,
  type Problems,
  type WorkerEntry,
} from '@/lib/dayForm'
import { KINDS } from '@/lib/kinds'
import { displayName } from '@/lib/names'

const TZ = 'Europe/Warsaw'
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
const fmtHours = (h: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(h)

type SortKey = 'name-asc' | 'name-desc' | 'company-asc' | 'company-desc'

const input =
  'h-9 w-full min-w-0 rounded-lg border bg-[var(--background)] px-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50'
const field = (bad: boolean) => `${input} ${bad ? 'border-[var(--destructive)]' : 'border-[var(--border)]'}`

export function DayFormPage() {
  const { user } = useAuth()
  const userId = user?.id ?? 0
  const [date, setDate] = useState(todayIso)
  const [form, setForm] = useState<DayForm | null>(null)
  const [state, setState] = useState<FormState | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('name-asc')
  const [problems, setProblems] = useState<Problems | null>(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(
    async (d: string) => {
      setLoading(true)
      setError('')
      setProblems(null)
      setReady(false)
      try {
        const data = await brigadeApi.dayForm(d)
        setForm(data)
        setState(initialState(data, readDraft(userId, d)))
      } catch (err) {
        setError((err as Error).message)
        setForm(null)
        setState(null)
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    void load(date)
  }, [load, date])

  // Draft is kept in the browser, so a reload does not lose the day
  useEffect(() => {
    if (!state || !form || form.date !== date) return
    const t = window.setTimeout(() => writeDraft(userId, date, state), 250)
    return () => window.clearTimeout(t)
  }, [state, form, date, userId])

  const crewByKey = useMemo(() => new Map(form?.crew.map((w) => [w.key, w])), [form])
  const projectsById = useMemo(() => new Map(form?.projects.map((p) => [p.id, p])), [form])

  const visible = useMemo(() => {
    if (!form || !state) return []
    const q = query.trim().toLowerCase()
    const list = state.workers
      .map((entry) => ({ entry, worker: crewByKey.get(entry.key)! }))
      .filter(({ worker }) => worker && (!q || `${worker.name} ${worker.company} ${worker.position}`.toLowerCase().includes(q)))
    const [by, dir] = sort.split('-') as ['name' | 'company', 'asc' | 'desc']
    list.sort((a, b) => {
      const cmp =
        by === 'company'
          ? a.worker.company.localeCompare(b.worker.company, 'pl') || a.worker.name.localeCompare(b.worker.name, 'pl')
          : a.worker.name.localeCompare(b.worker.name, 'pl')
      return dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [form, state, query, sort, crewByKey])

  const updateWorker = useCallback((key: string, change: (entry: WorkerEntry) => WorkerEntry) => {
    setState((s) => (s ? { ...s, workers: s.workers.map((w) => (w.key === key ? change(w) : w)) } : s))
    setReady(false)
  }, [])

  const onVacationOrGone = (w: Crew | undefined) => !!w?.status

  // "Skopiuj dla wszystkich": first row of the first card (in the current order) into the first row of everyone else
  const source = visible[0]?.entry.rows[0]
  const canCopy = !!source && !!source.workType && (isServiceValue(source.workType) || (!!source.projectId && toNumber(source.hours) > 0))
  const copyToAll = () => {
    if (!state || !source) return
    const service = isServiceValue(source.workType)
    setState({
      ...state,
      workers: state.workers.map((w) => {
        if (w.key === visible[0].entry.key || onVacationOrGone(crewByKey.get(w.key))) return w
        const first: FormRow = {
          ...w.rows[0],
          projectId: source.projectId,
          workType: source.workType,
          hours: service ? '' : source.hours,
          surchargeId: service ? '' : source.surchargeId,
          note: service ? '' : source.note,
        }
        const rows = [first, ...w.rows.slice(1)]
        // Keep the card within 16 h
        return { ...w, rows: sumHours(rows) > MAX_DAY_HOURS ? [first] : rows }
      }),
    })
    setReady(false)
  }

  const clearAll = () => {
    if (!form || !state) return
    if (!window.confirm('Wyczyścić wszystkie karty? Urlopy i zwolnienia zostaną.')) return
    setState(initialState(form, { foreman: emptyForeman(), workers: [] }))
    setProblems(null)
    setReady(false)
  }

  const fillRatings = () => {
    if (!state) return
    setState({
      ...state,
      workers: state.workers.map((w) => {
        const worker = crewByKey.get(w.key)
        return worker && canRate(worker) && !worker.status && !w.rating && worker.lastRating ? { ...w, rating: worker.lastRating } : w
      }),
    })
  }

  const submit = () => {
    if (!form || !state) return
    const result = validate(form, state)
    setProblems(result)
    setReady(result.count === 0 && !form.alreadyFilled)
    if (result.count > 0) {
      const first = [...result.cards.keys()][0]
      document.querySelector(`[data-card="${CSS.escape(first)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const totals = useMemo(() => {
    if (!state) return { people: 0, hours: 0 }
    const working = state.workers.filter((w) => sumHours(w.rows) > 0)
    return { people: working.length, hours: working.reduce((s, w) => s + sumHours(w.rows), 0) }
  }, [state])

  const vacation = form?.crew.filter((w) => w.status === 'vacation') ?? []
  const dismissed = form?.crew.filter((w) => w.status === 'dismissed') ?? []
  const today = todayIso()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dziennik" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-3.5" />
            Historia
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Dodaj wpis</h1>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <IconButton label="Poprzedni dzień" onClick={() => setDate((d) => shiftDate(d, -1))}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <label className="relative flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium">
            <CalendarDays className="size-4 text-[var(--primary)]" />
            <span className="first-letter:uppercase">{dayLabel(date)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Data"
            />
          </label>
          <IconButton label="Następny dzień" onClick={() => setDate((d) => shiftDate(d, 1))}>
            <ChevronRight className="size-4" />
          </IconButton>
          {date !== today ? (
            <button type="button" onClick={() => setDate(today)} className="h-9 rounded-lg px-2.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--muted)]">
              Dzisiaj
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <ErrorNote>
          {error}{' '}
          <button type="button" onClick={() => void load(date)} className="font-semibold underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </ErrorNote>
      ) : null}

      {form?.alreadyFilled ? (
        <Banner tone="destructive" icon={AlertTriangle}>
          <b>Dane na wybraną datę już istnieją.</b> Wpis za {date.split('-').reverse().join('.')} został już zapisany — wybierz inny dzień.
        </Banner>
      ) : null}
      {form?.warnings.map((w) => (
        <Banner key={w} tone="warning" icon={AlertTriangle}>
          {w}
        </Banner>
      ))}
      {vacation.length || dismissed.length ? (
        <Banner tone="info" icon={Palmtree}>
          {vacation.length ? (
            <p>
              <b>Urlop na wybrany dzień:</b> {vacation.map((w) => displayName(w.name)).join(', ')}
            </p>
          ) : null}
          {dismissed.length ? (
            <p>
              <b>Zwolniony na wybrany dzień:</b> {dismissed.map((w) => displayName(w.name)).join(', ')}
            </p>
          ) : null}
        </Banner>
      ) : null}

      {/* Toolbar */}
      <div className="sticky top-14 z-10 -mx-3 border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_88%,transparent)] px-3 py-2 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj: nazwisko, firma, stanowisko" className={`${input} border-[var(--border)] pl-9`} />
          </label>
          <SortButton sort={sort} onChange={setSort} />
          <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">
            {visible.length} prac.
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {form?.isFriday ? (
              <ToolButton icon={Star} onClick={fillRatings} title="Wstaw ostatnią ocenę pracownikom ISPIK bez oceny">
                Ostatnie oceny
              </ToolButton>
            ) : null}
            {canCopy ? (
              <ToolButton icon={Copy} onClick={copyToAll} title="Pierwszy wiersz pierwszej karty do pierwszego wiersza wszystkich (bez urlopów i zwolnień)">
                Skopiuj dla wszystkich
              </ToolButton>
            ) : null}
            <ToolButton icon={Eraser} onClick={clearAll}>
              Wyczyść wszystkie
            </ToolButton>
            <button
              type="button"
              onClick={submit}
              disabled={!state || loading || !!form?.alreadyFilled}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:bg-[color-mix(in_oklch,var(--primary)_88%,black)] disabled:opacity-50"
            >
              <Save className="size-4" />
              Zapisz
            </button>
          </div>
        </div>
      </div>

      {problems && problems.count > 0 ? (
        <Banner tone="destructive" icon={AlertTriangle}>
          <b>Uzupełnij {problems.cards.size === 1 ? '1 kartę' : `${problems.cards.size} kart`}:</b>{' '}
          {[...problems.cards.keys()].slice(0, 6).map((key, i) => (
            <span key={key}>
              {i ? ', ' : ''}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => document.querySelector(`[data-card="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                {key === 'foreman' ? 'Twoja karta' : displayName(crewByKey.get(key)?.name ?? key)}
              </button>
            </span>
          ))}
          {problems.cards.size > 6 ? ` i ${problems.cards.size - 6} więcej` : ''}
        </Banner>
      ) : null}
      {ready ? (
        <Banner tone="success" icon={CheckCircle2}>
          <b>Formularz jest poprawny:</b> {totals.people} prac., {fmtHours(totals.hours)} h. Zapis do ERP i potwierdzenie ilości robót pojawią się w kolejnym
          kroku — na razie nic nie jest wysyłane.
        </Banner>
      ) : null}

      {loading && !state ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skeleton block h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : form && state ? (
        <div className={`space-y-2 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}>
          <ForemanCard
            form={form}
            value={state.foreman}
            problems={problems}
            name={[user?.firstName, user?.lastName].filter(Boolean).join(' ')}
            onChange={(foreman) => {
              setState((s) => (s ? { ...s, foreman } : s))
              setReady(false)
            }}
          />
          {visible.map(({ entry, worker }) => (
            <WorkerCard
              key={entry.key}
              form={form}
              worker={worker}
              entry={entry}
              projectsById={projectsById}
              messages={problems?.cards.get(entry.key)}
              fields={problems?.fields}
              onChange={updateWorker}
            />
          ))}
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
              {query ? 'Nikogo nie znaleziono.' : 'Brak pracowników przypisanych do Ciebie w arkuszach kadrowych.'}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-1 pt-1 text-xs text-[var(--muted-foreground)]">
            <span>
              Pracują: <b className="text-[var(--foreground)]">{totals.people}</b> · razem <b className="text-[var(--foreground)]">{fmtHours(totals.hours)} h</b>
            </span>
            <button type="button" onClick={() => void load(date)} className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
              <RefreshCw className="size-3" />
              Odśwież listę
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// --- cards ---

function ForemanCard({
  form,
  value,
  name,
  problems,
  onChange,
}: {
  form: DayForm
  value: FormState['foreman']
  name: string
  problems: Problems | null
  onChange: (v: FormState['foreman']) => void
}) {
  const work = value.kind === 'Praca'
  const bad = (f: string) => !!problems?.fields.has(`foreman|${f}`)
  const messages = problems?.cards.get('foreman')
  return (
    <section data-card="foreman" className="rounded-xl border-2 border-[var(--primary)] bg-[var(--card)] p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
          <HardHat className="size-3.5" />
        </span>
        <p className="text-sm font-semibold">{name || 'Brygadzista'}</p>
        <Badge>Twoja karta</Badge>
        {messages ? <Problem messages={messages} /> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_96px_minmax(0,1.4fr)]">
        <Labeled label="Obiekt" className="col-span-2 sm:col-span-1">
          <select className={field(bad('project'))} value={value.projectId} disabled={!work} onChange={(e) => onChange({ ...value, projectId: e.target.value })}>
            <option value="">{work ? 'Wybierz obiekt' : '—'}</option>
            {form.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Rodzaj">
          <select
            className={field(false)}
            value={value.kind}
            onChange={(e) => {
              const kind = e.target.value
              onChange(kind === 'Praca' ? { ...value, kind } : { ...value, kind, hours: '', projectId: '' })
            }}
          >
            {form.foremanKinds.map((k) => (
              <option key={k.name} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Godziny">
          <input
            className={field(bad('hours'))}
            inputMode="decimal"
            disabled={!work}
            value={work ? value.hours : '0'}
            placeholder="0"
            onChange={(e) => onChange({ ...value, hours: e.target.value.replace(/[^\d.,]/g, '') })}
            onBlur={(e) => onChange({ ...value, hours: clampHours(e.target.value, [], '') })}
          />
        </Labeled>
        <Labeled label="Uwagi" className="col-span-2 sm:col-span-1">
          <input className={field(false)} value={value.note} placeholder="Komentarz" onChange={(e) => onChange({ ...value, note: e.target.value })} />
        </Labeled>
      </div>
    </section>
  )
}

const WorkerCard = memo(function WorkerCard({
  form,
  worker,
  entry,
  projectsById,
  messages,
  fields,
  onChange,
}: {
  form: DayForm
  worker: Crew
  entry: WorkerEntry
  projectsById: Map<string, DayForm['projects'][number]>
  messages?: string[]
  fields?: Set<string>
  onChange: (key: string, change: (e: WorkerEntry) => WorkerEntry) => void
}) {
  const set = (change: (e: WorkerEntry) => WorkerEntry) => onChange(entry.key, change)
  const setRow = (rowId: string, patch: Partial<FormRow>) => set((e) => ({ ...e, rows: e.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }))

  const total = sumHours(entry.rows)
  const kinds = entry.rows.map((r) => kindOfValue(r.workType, form.serviceKinds))
  const status = worker.status ?? (kinds.includes('dismissed') ? 'dismissed' : kinds.includes('vacation') ? 'vacation' : null)
  const penalty = kinds.includes('penalty')
  const ring = messages
    ? 'border-[var(--destructive)]'
    : status === 'dismissed'
      ? 'border-zinc-400 dark:border-zinc-500'
      : status === 'vacation'
        ? 'border-sky-400 dark:border-sky-500'
        : penalty
          ? 'border-rose-400 dark:border-rose-500'
          : 'border-[var(--border)]'
  const rate = form.isFriday && canRate(worker) && !worker.status

  return (
    <section data-card={entry.key} className={`rounded-xl border bg-[var(--card)] p-3 transition-colors ${ring}`}>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="text-sm font-semibold">{displayName(worker.name)}</p>
        <Badge>{worker.company}</Badge>
        {worker.rate !== null ? <Badge title="Indeks (stawka)">{`indeks ${fmtHours(worker.rate)}`}</Badge> : null}
        {worker.position ? <Badge muted>{worker.position}</Badge> : null}
        {status === 'vacation' ? (
          <Badge tone="sky">
            <Palmtree className="size-3" />
            Urlop
          </Badge>
        ) : null}
        {status === 'dismissed' ? (
          <Badge tone="zinc">
            <UserX className="size-3" />
            Zwolniony
          </Badge>
        ) : null}
        {rate ? <Stars value={entry.rating} bad={!!fields?.has(`${entry.key}|rating`)} onChange={(rating) => set((e) => ({ ...e, rating }))} /> : null}
        {messages ? <Problem messages={messages} /> : null}
        <span className="ml-auto flex items-center gap-2">
          {entry.rows.length > 1 ? (
            <span className={`text-xs font-semibold tabular-nums ${total > MAX_DAY_HOURS ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]'}`}>
              Razem: {fmtHours(total)} / {MAX_DAY_HOURS} h
            </span>
          ) : null}
          {!worker.status ? (
            <button
              type="button"
              onClick={() => set((e) => ({ ...e, rating: 0, rows: [emptyRow()] }))}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="size-3.5" />
              Wyczyść
            </button>
          ) : null}
        </span>
      </div>

      <div className="space-y-2">
        {entry.rows.map((row, i) => {
          const project = projectsById.get(row.projectId)
          const service = isServiceValue(row.workType)
          const bad = (f: string) => !!fields?.has(`${entry.key}|${row.id}|${f}`)
          const groups = new Map<string, DayForm['projects'][number]['workTypes']>()
          for (const w of project?.workTypes ?? []) {
            const g = w.department ?? 'Roboty'
            groups.set(g, [...(groups.get(g) ?? []), w])
          }
          return (
            <div key={row.id} className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_84px_minmax(0,0.9fr)_minmax(0,1fr)_auto] ${i > 0 ? 'border-t border-dashed border-[var(--border)] pt-2 sm:border-0 sm:pt-0' : ''}`}>
              <Labeled label="Obiekt" hide={i > 0} className="col-span-3 sm:col-span-1">
                <select
                  className={field(bad('project'))}
                  value={row.projectId}
                  onChange={(e) => setRow(row.id, { projectId: e.target.value, workType: service ? row.workType : '' })}
                >
                  <option value="">{service ? '—' : 'Wybierz obiekt'}</option>
                  {form.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="Rodzaj" hide={i > 0} className="col-span-3 sm:col-span-1">
                <select
                  className={field(bad('workType'))}
                  value={row.workType}
                  onChange={(e) => {
                    const value = e.target.value
                    setRow(row.id, isServiceValue(value) ? { workType: value, hours: '', surchargeId: '' } : { workType: value })
                  }}
                >
                  <option value="">{project ? 'Wybierz rodzaj' : 'Najpierw obiekt lub rodzaj nieobecności'}</option>
                  {[...groups].map(([g, list]) => (
                    <optgroup key={g} label={g}>
                      {list.map((w) => (
                        <option key={w.id} value={`wt:${w.id}`}>
                          {w.name}
                          {w.unit ? ` (${w.unit})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Nieobecność i inne">
                    {form.serviceKinds.map((k) => (
                      <option key={k.name} value={serviceValue(k.name)}>
                        {k.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Labeled>
              <Labeled label="Godziny" hide={i > 0}>
                <input
                  className={field(bad('hours'))}
                  inputMode="decimal"
                  disabled={service}
                  value={service ? '0' : row.hours}
                  placeholder="0"
                  onChange={(e) => setRow(row.id, { hours: e.target.value.replace(/[^\d.,]/g, '') })}
                  onBlur={(e) => setRow(row.id, { hours: clampHours(e.target.value, entry.rows, row.id) })}
                />
              </Labeled>
              <Labeled label="Warunki" hide={i > 0}>
                <select className={field(false)} value={row.surchargeId} disabled={service} onChange={(e) => setRow(row.id, { surchargeId: e.target.value })}>
                  <option value="">Brak</option>
                  {form.surcharges.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (+{fmtHours(s.ratePerHour)} zł/h)
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="Uwagi" hide={i > 0} className="col-span-3 sm:order-none sm:col-span-1 order-last">
                <input className={field(false)} value={row.note} placeholder="Komentarz" onChange={(e) => setRow(row.id, { note: e.target.value })} />
              </Labeled>
              <div className={`flex items-end gap-1 ${i === 0 ? 'sm:pt-[18px]' : ''}`}>
                {i === entry.rows.length - 1 ? (
                  <IconButton label="Dodaj wiersz" onClick={() => set((e) => ({ ...e, rows: [...e.rows, { ...emptyRow(), projectId: row.projectId }] }))}>
                    <Plus className="size-4" />
                  </IconButton>
                ) : (
                  <span className="hidden size-9 sm:block" />
                )}
                <IconButton label="Usuń wiersz" disabled={entry.rows.length === 1} onClick={() => set((e) => ({ ...e, rows: e.rows.filter((r) => r.id !== row.id) }))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
})

// --- small pieces ---

function Labeled({ label, hide, className = '', children }: { label: string; hide?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={`mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] ${hide ? 'sm:hidden' : ''}`}>{label}</span>
      {children}
    </label>
  )
}

function Badge({ children, muted, tone, title }: { children: ReactNode; muted?: boolean; tone?: 'sky' | 'zinc'; title?: string }) {
  const look =
    tone === 'sky'
      ? KINDS.vacation.badge
      : tone === 'zinc'
        ? KINDS.dismissed.badge
        : muted
          ? 'bg-transparent text-[var(--muted-foreground)] ring-[var(--border)]'
          : 'bg-[var(--muted)] text-[var(--foreground)] ring-transparent'
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${look}`}>
      {children}
    </span>
  )
}

function Stars({ value, bad, onChange }: { value: number; bad: boolean; onChange: (v: number) => void }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1 ${bad ? 'ring-1 ring-[var(--destructive)]' : ''}`} title="Ocena (piątek)">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)} className="p-0.5" aria-label={`Ocena ${n}`}>
          <Star className={`size-4 transition ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-[var(--muted-foreground)]/50 hover:text-amber-400'}`} />
        </button>
      ))}
    </span>
  )
}

function Problem({ messages }: { messages: string[] }) {
  return <span className="text-xs font-medium text-[var(--destructive)]">{messages.join(' · ')}</span>
}

function Banner({ tone, icon: Icon, children }: { tone: 'destructive' | 'warning' | 'info' | 'success'; icon: typeof AlertTriangle; children: ReactNode }) {
  const color = { destructive: 'var(--destructive)', warning: 'var(--warning)', info: 'var(--primary)', success: 'var(--success)' }[tone]
  return (
    <div
      className="rise-in flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm"
      style={{ borderColor: `color-mix(in oklch, ${color} 35%, transparent)`, background: `color-mix(in oklch, ${color} 8%, transparent)` }}
    >
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
      <div className="min-w-0 space-y-0.5">{children}</div>
    </div>
  )
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}

function ToolButton({ icon: Icon, onClick, title, children }: { icon: typeof Copy; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium transition hover:bg-[var(--muted)]"
    >
      <Icon className="size-4 text-[var(--muted-foreground)]" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}

function SortButton({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  const desc = sort.endsWith('desc')
  const Icon = desc ? ArrowUpAZ : ArrowDownAZ
  const ref = useRef<HTMLSelectElement>(null)
  return (
    <label className="relative inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] pl-2.5 pr-2 text-sm">
      <Icon className="size-4 text-[var(--muted-foreground)]" />
      <select ref={ref} value={sort} onChange={(e) => onChange(e.target.value as SortKey)} className="bg-transparent pr-1 text-sm outline-none" aria-label="Sortowanie">
        <option value="name-asc">Nazwisko A–Z</option>
        <option value="name-desc">Nazwisko Z–A</option>
        <option value="company-asc">Firma A–Z</option>
        <option value="company-desc">Firma Z–A</option>
      </select>
    </label>
  )
}
