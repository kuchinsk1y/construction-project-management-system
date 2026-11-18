import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownAZ,
  Ban,
  Coffee,
  ArrowLeft,
  ArrowUpAZ,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eraser,
  Hand,
  HardHat,
  Lock,
  MapPin,
  Palmtree,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Star,
  Thermometer,
  Trash2,
  User,
  UserMinus,
  UserX,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FloatInput } from '@/components/FloatField'
import { DatePicker } from '@/components/DatePicker'
import { Select } from '@/components/Select'
import { ErrorNote } from '@/components/ui'
import { brigadeApi, type DayForm, type RowKind } from '@/lib/api'
import {
  canRate,
  clampHours,
  initialState,
  nextRow,
  startRows,
  workBlocks,
  isServiceValue,
  kindOfValue,
  readDraft,
  sumHours,
  toNumber,
  validate,
  writeDraft,
  type Crew,
  type FormRow,
  type FormState,
  type CheckIn,
  type Problems,
  type WorkerEntry,
} from '@/lib/dayForm'
import { KINDS } from '@/lib/kinds'
import { displayName } from '@/lib/names'

const TZ = 'Europe/Warsaw'
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
/** Check-in time in Warsaw, e.g. 06:52 */
const checkInTime = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const fmtHours = (h: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(h)

type SortKey = 'name-asc' | 'name-desc' | 'company-asc' | 'company-desc'

const input =
  'h-11 w-full min-w-0 rounded-lg border bg-[var(--background)] px-3 text-base outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-2.5 sm:text-sm'

export function DayFormPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [date, setDate] = useState(todayIso)
  /** The form waits for the calendar: it opens on the nearest day TMA allows */
  const [dateReady, setDateReady] = useState(false)
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
    if (dateReady) void load(date)
  }, [load, date, dateReady])

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
  // on the same project (projects come from TMA and work types differ between projects)
  const source = visible[0]?.entry.rows[0]
  const canCopy = !!source && !!source.workType && (isServiceValue(source.workType) || (!!source.projectId && toNumber(source.hours) > 0))
  const copyToAll = () => {
    if (!state || !source) return
    const service = isServiceValue(source.workType)
    setState({
      ...state,
      workers: state.workers.map((w) => {
        if (w.key === visible[0].entry.key || onVacationOrGone(crewByKey.get(w.key))) return w
        // First line of the same project in the card (a card can hold several projects)
        const target = w.rows.find((r) => r.projectId === source.projectId)
        if (!target) return w
        const copy: FormRow = {
          ...target,
          workType: source.workType,
          hours: service ? '' : source.hours,
          surchargeIds: service ? [] : source.surchargeIds,
          note: service ? '' : source.note,
        }
        return { ...w, rows: w.rows.map((r) => (r.id === target.id ? copy : r)) }
      }),
    })
    setReady(false)
  }

  const [confirmClear, setConfirmClear] = useState(false)
  const clearAll = () => {
    if (!form || !state) return
    setState(initialState(form, null))
    setProblems(null)
    setReady(false)
    setConfirmClear(false)
  }
  const closeConfirm = useCallback(() => setConfirmClear(false), [])
  // Cards the foreman already filled in (absences from TMA do not count: they stay)
  const filledCards = state
    ? state.workers.filter(
        (w) => !crewByKey.get(w.key)?.status && (w.rating > 0 || w.rows.some((r) => r.workType || r.hours || r.note || r.surchargeIds.length)),
      ).length + (state.foreman.hours || state.foreman.note || state.foreman.workType ? 1 : 0)
    : 0

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


  return (
    <div className="space-y-3 pb-24 sm:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dziennik" className="-my-2 mb-0 inline-flex items-center gap-1 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-3.5" />
            Historia
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Dodaj wpis</h1>
        </div>

        {/* Date: only days TMA opens can be picked */}
        <DatePicker
          value={date}
          onChange={setDate}
          onFirstLoad={(calendar) => {
            if (calendar?.suggestedDate) setDate(calendar.suggestedDate)
            setDateReady(true)
          }}
        />
      </div>

      {error ? (
        <ErrorNote>
          {error}{' '}
          <button type="button" onClick={() => void load(date)} className="font-semibold underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </ErrorNote>
      ) : null}

      {form && !form.dayOpen ? (
        <Banner tone="warning" icon={Lock}>
          <b>Ten dzień jest zamknięty do wpisu.</b> Wybierz w kalendarzu dzień zaznaczony jako dostępny.
        </Banner>
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
      {form ? <NotWorking crew={form.crew} isToday={date === todayIso()} /> : null}

      {/* Toolbar */}
      <div className="sticky top-14 z-10 -mx-3 border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_88%,transparent)] px-3 py-2 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 basis-full sm:basis-[180px] sm:flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj: nazwisko, firma, stanowisko" className={`${input} border-[var(--border)] pl-9 sm:pl-9`} type="search" enterKeyHint="search" />
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
              <ToolButton icon={Copy} onClick={copyToAll} title="Pierwszy wiersz pierwszej karty do pracowników na tym samym obiekcie (bez urlopów, chorób i zwolnień)">
                Skopiuj dla wszystkich
              </ToolButton>
            ) : null}
            <ToolButton icon={Eraser} onClick={() => setConfirmClear(true)}>
              Wyczyść wszystkie
            </ToolButton>
            <button
              type="button"
              onClick={submit}
              disabled={!state || loading || !!form?.alreadyFilled || !form?.dayOpen}
              className="hidden h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:bg-[color-mix(in_oklch,var(--primary)_88%,black)] disabled:opacity-50 sm:inline-flex"
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
        <fieldset disabled={!form.dayOpen} className={`min-w-0 space-y-2 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''} ${form.dayOpen ? '' : 'opacity-70'}`}>
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
              {query ? 'Nikogo nie znaleziono.' : 'TMA nie zwróciła pracowników Twojej brygady.'}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-1 pt-1 text-xs text-[var(--muted-foreground)]">
            <span>
              Pracują: <b className="text-[var(--foreground)]">{totals.people}</b> · razem <b className="text-[var(--foreground)]">{fmtHours(totals.hours)} h</b>
            </span>
            <button type="button" onClick={() => void load(date)} className="-my-3 inline-flex items-center gap-1 py-3 hover:text-[var(--foreground)]">
              <RefreshCw className="size-3" />
              Odśwież listę
            </button>
          </div>
        </fieldset>
      ) : null}

      {form && state ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_92%,transparent)] px-3 pt-2.5 backdrop-blur-xl sm:hidden"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Pracują</p>
              <p className="truncate text-sm font-semibold tabular-nums">
                {totals.people} prac. · {fmtHours(totals.hours)} h
              </p>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={loading || form.alreadyFilled || !form.dayOpen}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] shadow-[0_10px_24px_-12px_color-mix(in_oklch,var(--primary),transparent_10%)] transition active:translate-y-px disabled:opacity-50"
            >
              <Save className="size-5" />
              Zapisz
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmClear}
        tone="danger"
        icon={Eraser}
        title="Wyczyścić wszystkie karty?"
        description={
          <>
            {filledCards > 0 ? (
              <>
                Wpisane dane z <b className="text-[var(--foreground)]">{filledCards === 1 ? '1 karty' : `${filledCards} kart`}</b> zostaną usunięte: obiekty, rodzaje,
                godziny, dopłaty i oceny.
              </>
            ) : (
              'Wszystkie karty wrócą do stanu początkowego.'
            )}{' '}
            Urlopy, choroby i zwolnienia z TMA zostaną, a obiekty brygady wybiorą się ponownie.
          </>
        }
        confirmLabel="Wyczyść wszystkie"
        onConfirm={clearAll}
        onCancel={closeConfirm}
      />
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
  const bad = (f: string) => !!problems?.fields.has(`foreman|${f}`)
  const messages = problems?.cards.get('foreman')
  const project = form.projects.find((p) => p.id === value.projectId)
  return (
    <section
      data-card="foreman"
      className={`rounded-xl border bg-[var(--card)] p-3 ${messages ? 'border-[var(--destructive)]' : 'border-[var(--border)]'}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
          <HardHat className="size-[18px]" />
        </span>
        <p className="text-[15px] font-semibold sm:text-sm">{name || 'Brygadzista'}</p>
        {messages ? <Problem messages={messages} /> : null}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_96px_minmax(0,1.4fr)]">
        <div className="col-span-2 sm:col-span-1">
          <Select
            label="Obiekt"
            title="Obiekt"
            value={value.projectId}
            invalid={bad('project')}
            placeholder="Wybierz obiekt"
            options={projectOptions(form)}
            // Another project has other work types
            onChange={(projectId) => onChange({ ...value, projectId, workType: projectId === value.projectId ? value.workType : '' })}
          />
        </div>
        <Select
            label="Rodzaj"
            title="Rodzaj"
            value={value.workType}
            invalid={bad('workType')}
            searchable
            hintInTrigger
            placeholder={project?.workTypes.length ? 'Wybierz rodzaj' : 'Brak rodzajów robót'}
            options={(project?.workTypes ?? []).map((w) => ({ value: `wt:${w.id}`, label: w.name, hint: w.unit ?? undefined, group: w.department ?? 'Roboty' }))}
            onChange={(workType) => onChange({ ...value, workType })}
          />
        <FloatInput
          label="Godziny"
          invalid={bad('hours')}
          inputMode="decimal"
          hint="np. 8"
          value={value.hours}
          onChange={(e) => onChange({ ...value, hours: e.target.value.replace(/[^\d.,]/g, '') })}
          onBlur={(e) => onChange({ ...value, hours: clampHours(e.target.value) })}
        />
        <FloatInput
          label="Uwagi"
          wrapperClassName="col-span-2 sm:col-span-1"
          hint="Komentarz do dnia"
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
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
  const status = worker.status ?? (kinds.includes('dismissed') ? 'dismissed' : kinds.includes('sick') ? 'sick' : kinds.includes('vacation') ? 'vacation' : null)
  const look = cardLook(status, kinds, entry.rows)
  const ring = messages ? 'border-[var(--destructive)]' : look.border
  const rate = form.isFriday && canRate(worker) && !worker.status
  // One block per project he checked in on that day (TMA)
  const blocks = useMemo(() => workBlocks(worker, form.projects), [worker, form.projects])
  const many = blocks.length > 1
  // One project: it stands next to the name and the visit badge sits with the other badges on the right
  const only = many ? null : blocks[0]
  const onlyProject = only ? projectsById.get(only.projectId) : undefined

  return (
    <section data-card={entry.key} className={`rounded-xl border bg-[var(--card)] p-3 transition-colors ${ring}`}>
      {/* Phone (grid): status square over two rows | name + "Wyczyść" | badges under them across the width.
          From sm up (flex): one line — square, name, then badges on the right next to "Wyczyść". */}
      <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:flex sm:gap-x-2">
        <span className={`row-span-2 flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-8 sm:rounded-lg ${look.square}`} title={look.label}>
          <look.icon className="size-[18px] sm:size-4" />
        </span>

          <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate text-[15px] leading-tight sm:text-sm">
              <span className="font-semibold">{displayName(worker.name)}</span>
              {only ? (
                // Phone: own line under the name (no room next to it); from sm up: "Name · Project"
                <span
                  className={`mt-0.5 block truncate text-[13px] sm:mt-0 sm:inline sm:text-sm ${only.projectId ? 'text-[var(--muted-foreground)]' : 'text-[var(--destructive)]'}`}
                  title={onlyProject ? 'Obiekt z odbicia w TMA' : 'Obiekt odbicia nie należy do Twojej listy obiektów'}
                >
                  <span className="hidden sm:inline">{' · '}</span>
                  {onlyProject?.name ?? 'obiekt spoza Twojej listy'}
                </span>
              ) : null}
            </p>
            {rate ? <Stars value={entry.rating} bad={!!fields?.has(`${entry.key}|rating`)} onChange={(rating) => set((e) => ({ ...e, rating }))} /> : null}
            {messages ? <Problem messages={messages} /> : null}
          </div>
          <div className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-1.5 sm:ml-auto sm:justify-end">
            {status === 'vacation' ? (
              <Badge tone="sky">
                <Palmtree className="size-3" />
                Urlop
              </Badge>
            ) : null}
            {status === 'sick' ? (
              <Badge tone="violet">
                <Thermometer className="size-3" />
                Chory
              </Badge>
            ) : null}
            {status === 'dismissed' ? (
              <Badge tone="zinc">
                <UserX className="size-3" />
                Zwolniony
              </Badge>
            ) : null}
            {many ? (
              <Badge tone="emerald" title="Odbicia QR na kilku obiektach tego dnia">
                <MapPin className="size-3" />
                {blocks.length} {blocks.length < 5 ? 'obiekty' : 'obiektów'}
              </Badge>
            ) : null}
            {only?.checkIns.map((c) => <CheckInBadge key={c.at} checkIn={c} />)}
            <Badge>{worker.company}</Badge>
            {worker.rate !== null ? <Badge title="Indeks (stawka za godzinę)">{fmtHours(worker.rate)}</Badge> : null}
            {worker.position ? <Badge muted>{worker.position}</Badge> : null}
            {entry.rows.length > 1 ? (
              <span
                className="ml-1 whitespace-nowrap text-xs font-semibold tabular-nums text-[var(--muted-foreground)]"
              >
                Razem: {fmtHours(total)} h
              </span>
            ) : null}
          </div>

        {!worker.status ? (
          <button
            type="button"
            onClick={() => set((e) => ({ ...e, rating: 0, rows: startRows(worker, form.projects) }))}
            title="Wyczyść kartę"
            aria-label="Wyczyść kartę"
            className="col-start-3 row-start-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium transition hover:bg-[var(--muted)] sm:h-8"
          >
            <Eraser className="size-3.5 text-[var(--muted-foreground)]" />
            <span className="hidden min-[340px]:inline">Wyczyść</span>
          </button>
        ) : null}
      </div>

      <div className={many ? 'space-y-2' : ''}>
        {blocks.map((block, bi) => {
          const project = projectsById.get(block.projectId)
          const rows = entry.rows.filter((r) => r.projectId === block.projectId)
          const groups = new Map<string, DayForm['projects'][number]['workTypes']>()
          for (const w of project?.workTypes ?? []) {
            const g = w.department ?? 'Roboty'
            groups.set(g, [...(groups.get(g) ?? []), w])
          }
          const workTypeOptions = [...groups].flatMap(([g, list]) => list.map((w) => ({ value: `wt:${w.id}`, label: w.name, hint: w.unit ?? undefined, group: g })))
          return (
            <div key={block.projectId || 'none'} className={many ? 'rounded-lg border border-[var(--border)] p-2.5 sm:p-3' : ''}>
              {many ? (
                <BlockHeader
                  project={project}
                  checkIns={block.checkIns}
                  index={bi + 1}
                  hours={sumHours(rows)}
                  invalid={rows.some((r) => !!fields?.has(`${entry.key}|${r.id}|project`))}
                  onAdd={() => set((e) => ({ ...e, rows: [...e.rows, nextRow(block.projectId)] }))}
                />
              ) : null}
              <div className="space-y-3 sm:space-y-2">
                {rows.map((row, i) => {
                  const service = isServiceValue(row.workType)
                  const bad = (f: string) => !!fields?.has(`${entry.key}|${row.id}|${f}`)
                  return (
                    <div
                      key={row.id}
                      className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] gap-x-2 gap-y-3 sm:grid-cols-[minmax(0,1.8fr)_84px_minmax(0,1fr)_minmax(0,1.2fr)_auto] ${
                        i > 0 ? 'border-t border-dashed border-[var(--border)] pt-3 sm:border-0 sm:pt-0' : ''
                      }`}
                    >
                      <div className="col-span-3 sm:col-span-1">
                        <Select
                          label="Rodzaj"
                          title="Rodzaj"
                          value={row.workType}
                          invalid={bad('workType')}
                          placeholder={project?.workTypes.length ? 'Wybierz rodzaj' : 'Brak rodzajów robót'}
                          searchable
                          hintInTrigger
                          options={workTypeOptions}
                          onChange={(value) => setRow(row.id, isServiceValue(value) ? { workType: value, hours: '', surchargeIds: [] } : { workType: value })}
                        />
                      </div>
                      <FloatInput
                        label="Godziny"
                        invalid={bad('hours')}
                        inputMode="decimal"
                        hint="np. 8"
                        disabled={service}
                        value={service ? '0' : row.hours}
                        onChange={(e) => setRow(row.id, { hours: e.target.value.replace(/[^\d.,]/g, '') })}
                        onBlur={(e) => setRow(row.id, { hours: clampHours(e.target.value) })}
                      />
                      <Select
                        label="Warunki"
                        title="Warunki"
                        multiple
                        values={row.surchargeIds}
                        disabled={service}
                        options={[{ value: '', label: 'Brak' }, ...form.surcharges.map((x) => ({ value: x.id, label: x.name, hint: `+${fmtHours(x.ratePerHour)} zł/h` }))]}
                        onChangeValues={(surchargeIds) => setRow(row.id, { surchargeIds })}
                      />
                      <FloatInput
                        label="Uwagi"
                        wrapperClassName="order-last col-span-3 sm:order-none sm:col-span-1"
                        hint="Komentarz"
                        value={row.note}
                        onChange={(e) => setRow(row.id, { note: e.target.value })}
                      />
                      <div className="flex items-center gap-1">
                        {/* One project: «+» on the last line adds another work type to it (several projects: «+» in each block head) */}
                        {!many ? (
                          i === rows.length - 1 ? (
                            <IconButton label="Dodaj rodzaj pracy" onClick={() => set((e) => ({ ...e, rows: [...e.rows, nextRow(block.projectId)] }))}>
                              <Plus className="size-4" />
                            </IconButton>
                          ) : (
                            <span className="hidden size-9 sm:block" />
                          )
                        ) : null}
                        {/* Every project he checked in on keeps at least one line */}
                        <IconButton label="Usuń wiersz" disabled={rows.length === 1} onClick={() => set((e) => ({ ...e, rows: e.rows.filter((r) => r.id !== row.id) }))}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
})

// --- status of a worker's card ---

type CardLook = { icon: typeof User; square: string; border: string; label: string }

const LOOKS: Record<'dismissed' | 'sick' | 'vacation' | 'penalty' | 'absence' | 'day_off' | 'work' | 'empty', CardLook> = {
  dismissed: { icon: UserX, square: 'bg-zinc-500 text-white', border: 'border-zinc-400 dark:border-zinc-500', label: 'Zwolniony' },
  sick: { icon: Thermometer, square: 'bg-violet-500 text-white', border: 'border-violet-400 dark:border-violet-500', label: 'Chory' },
  vacation: { icon: Palmtree, square: 'bg-sky-500 text-white', border: 'border-sky-400 dark:border-sky-500', label: 'Urlop' },
  penalty: { icon: Ban, square: 'bg-rose-500 text-white', border: 'border-rose-400 dark:border-rose-500', label: 'Pijaństwo' },
  absence: { icon: UserMinus, square: 'bg-orange-500 text-white', border: 'border-orange-400 dark:border-orange-500', label: 'Absencja' },
  day_off: { icon: Coffee, square: 'bg-slate-400 text-white dark:bg-slate-500', border: 'border-slate-300 dark:border-slate-500', label: 'Wolne' },
  work: { icon: User, square: 'bg-[var(--muted)] text-[var(--muted-foreground)]', border: 'border-[var(--border)]', label: 'Praca' },
  empty: { icon: User, square: 'bg-[var(--muted)] text-[var(--muted-foreground)]', border: 'border-[var(--border)]', label: 'Do uzupełnienia' },
}

/** Square icon and border by meaning: absence from TMA first, then what the rows say */
function cardLook(status: Crew['status'], kinds: Array<RowKind | null>, rows: FormRow[]): CardLook {
  if (status) return LOOKS[status === 'drunk' || status === 'drunk_on_site' ? 'penalty' : status]
  for (const k of ['penalty', 'absence', 'day_off'] as const) if (kinds.includes(k)) return LOOKS[k]
  const working = rows.some((r) => r.workType && !isServiceValue(r.workType) && toNumber(r.hours) > 0)
  return working ? LOOKS.work : LOOKS.empty
}

const projectOptions = (form: DayForm) => form.projects.map((p) => ({ value: p.id, label: p.name, hint: p.city ?? undefined }))

/**
 * Work day from TMA in one badge: "06:52–15:02" (check-in – close), "06:52–…" while open,
 * amber when TMA closed the day by itself (the hours are then not filled in)
 */
function CheckInBadge({ checkIn }: { checkIn: CheckIn }) {
  const auto = checkIn.status === 'auto_closed'
  const from = checkInTime(checkIn.at)
  const to = checkIn.closedAt ? checkInTime(checkIn.closedAt) : '…'
  const how = checkIn.method === 'qr' ? 'Kod QR' : 'Ręcznie'
  const title = [
    `${how}: od ${from}${checkIn.closedAt ? ` do ${to}` : ' — dzień jeszcze otwarty'}`,
    auto ? 'Dzień zamknięty automatycznie — godzin nie wpisano, sprawdź je' : checkIn.closedAt ? 'Godziny wpisane z odbicia, możesz je zmienić' : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ring-1 ring-inset ${
        auto ? 'bg-amber-500/12 text-amber-700 ring-amber-500/30 dark:text-amber-300' : KINDS.work.badge
      }`}
    >
      {checkIn.method === 'qr' ? <QrCode className="size-3" /> : <Hand className="size-3" />}
      {from}–{to}
      {auto ? <AlertTriangle className="size-3" /> : null}
    </span>
  )
}

// --- who did not work that day ---

type Absence = NonNullable<Crew['status']> | 'no_check_in'

/** Reasons in the order they are shown; colours and icons follow the meaning (same as the cards) */
const ABSENCES: Array<{ key: Absence; label: string; look: keyof typeof LOOKS; icon?: typeof User }> = [
  { key: 'drunk_on_site', label: 'Pijaństwo na budowie', look: 'penalty' },
  { key: 'drunk', label: 'Pijaństwo', look: 'penalty' },
  { key: 'absence', label: 'Absencja', look: 'absence' },
  { key: 'no_check_in', label: 'Brak odbicia', look: 'empty', icon: QrCode },
  { key: 'sick', label: 'Chory', look: 'sick' },
  { key: 'vacation', label: 'Urlop', look: 'vacation' },
  { key: 'day_off', label: 'Wolne', look: 'day_off' },
  { key: 'dismissed', label: 'Zwolniony', look: 'dismissed' },
]

/** Crew members without a card: absent (TMA) or not checked in. Grouped by reason, compact. */
function NotWorking({ crew, isToday }: { crew: Crew[]; isToday: boolean }) {
  const groups = ABSENCES.map((a) => ({
    ...a,
    people: crew
      .filter((w) => (w.status ?? (w.checkIns.length ? null : 'no_check_in')) === a.key)
      .map((w) => displayName(w.name))
      .sort((x, y) => x.localeCompare(y, 'pl')),
  })).filter((g) => g.people.length)
  const total = groups.reduce((n, g) => n + g.people.length, 0)
  // Folded by default on every screen: one line with the reasons; opens on click
  const [open, setOpen] = useState(false)
  if (!total) return null

  return (
    <section className="rise-in rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left"
      >
        <UserMinus className="size-4 shrink-0 text-[var(--muted-foreground)]" />
        <span className="whitespace-nowrap text-sm font-semibold">
          {isToday ? (
            <>
              Nie pracują<span className="hidden sm:inline"> dziś</span>
            </>
          ) : (
            'Nie pracowali'
          )}
        </span>
        <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--muted-foreground)]">{total}</span>
        {/* Folded: reasons as small coloured squares with counts */}
        {!open ? (
          <span className="flex min-w-0 flex-wrap items-center gap-1 sm:ml-1">
            {groups.map((g) => {
              const look = LOOKS[g.look]
              const Icon = g.icon ?? look.icon
              return (
                <span key={g.key} title={`${g.label}: ${g.people.length}`} className={`inline-flex h-5 items-center gap-0.5 rounded px-1 text-[10px] font-semibold sm:h-6 sm:gap-1 sm:rounded-md sm:px-1.5 sm:text-[11px] ${look.square}`}>
                  <Icon className="size-2.5 sm:size-3" />
                  {g.people.length}
                </span>
              )
            })}
          </span>
        ) : (
          <span className="ml-auto hidden text-[11px] text-[var(--muted-foreground)] sm:inline">Dane z TMA · bez kart w formularzu</span>
        )}
        <ChevronDown className={`ml-auto size-4 shrink-0 text-[var(--muted-foreground)] transition-transform sm:ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul className="grid gap-1 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => {
            const look = LOOKS[g.look]
            const Icon = g.icon ?? look.icon
            return (
              <li key={g.key} className="flex min-w-0 items-start gap-2.5 rounded-lg bg-[var(--background)] px-2.5 py-1.5">
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${look.square}`}>
                  <Icon className="size-3" />
                </span>
                <p className="min-w-0 flex-1 text-[13px] leading-snug">
                  <span className="font-semibold">{g.label}</span>
                  <span className="tabular-nums text-[var(--muted-foreground)]"> · {g.people.length}</span>
                  <span className="block text-[var(--muted-foreground)]">{g.people.join(', ')}</span>
                </p>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

/**
 * Head of one project block of a card: the project (from the TMA check-in, locked), the visit time(s)
 * and «+ Rodzaj pracy» — another line on the same project.
 */
function BlockHeader({
  project,
  checkIns,
  index,
  hours,
  invalid,
  onAdd,
}: {
  project: DayForm['projects'][number] | undefined
  checkIns: CheckIn[]
  /** Number of the block (shown only when the worker was on several projects) */
  index: number
  hours: number
  invalid: boolean
  onAdd: () => void
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2 sm:mb-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="flex min-w-0 items-center gap-1.5"
          title={project ? 'Obiekt z odbicia w TMA' : 'Obiekt odbicia nie należy do Twojej listy obiektów'}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--foreground)] text-[11px] font-semibold tabular-nums text-[var(--background)]">
            {index}
          </span>
          <span className={`truncate text-sm font-semibold ${invalid ? 'text-[var(--destructive)]' : ''}`}>{project?.name ?? 'Obiekt spoza Twojej listy'}</span>
          {project?.city ? <span className="hidden shrink-0 text-xs text-[var(--muted-foreground)] sm:inline">· {project.city}</span> : null}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          {checkIns.map((c) => (
            <CheckInBadge key={c.at} checkIn={c} />
          ))}
          <span className="ml-0.5 text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">{fmtHours(hours)} h</span>
        </span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        title="Dodaj kolejny rodzaj pracy na tym obiekcie"
        className="-my-1 inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[color-mix(in_oklch,var(--primary)_10%,transparent)] sm:h-8"
      >
        <Plus className="size-4" />
        <span className="hidden min-[380px]:inline">Rodzaj pracy</span>
      </button>
    </div>
  )
}

// --- small pieces ---

function Badge({ children, muted, tone, title }: { children: ReactNode; muted?: boolean; tone?: 'sky' | 'violet' | 'zinc' | 'emerald'; title?: string }) {
  const look =
    tone === 'emerald'
      ? KINDS.work.badge
      : tone === 'sky'
      ? KINDS.vacation.badge
      : tone === 'violet'
        ? KINDS.sick.badge
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
      className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-35 sm:size-9"
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
      aria-label={typeof children === 'string' ? children : undefined}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium transition hover:bg-[var(--muted)] sm:h-9 sm:min-w-0"
    >
      <Icon className="size-4 text-[var(--muted-foreground)]" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}

function SortButton({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  const Icon = sort.endsWith('desc') ? ArrowUpAZ : ArrowDownAZ
  return (
    <div className="min-w-0 flex-1 sm:w-[160px] sm:flex-none">
      <Select
        title="Sortowanie"
        value={sort}
        icon={<Icon className="size-4" />}
        options={[
          { value: 'name-asc', label: 'Nazwisko A–Z' },
          { value: 'name-desc', label: 'Nazwisko Z–A' },
          { value: 'company-asc', label: 'Firma A–Z' },
          { value: 'company-desc', label: 'Firma Z–A' },
        ]}
        onChange={(v) => onChange(v as SortKey)}
      />
    </div>
  )
}
