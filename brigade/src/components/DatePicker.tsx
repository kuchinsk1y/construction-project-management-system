import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { brigadeApi, type FormCalendar } from '@/lib/api'

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

/** Days of the month as a Monday-first grid; empty cells before the 1st */
function grid(month: string): Array<string | null> {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lead = (first.getUTCDay() + 6) % 7
  return [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
}

type Props = {
  value: string
  onChange: (date: string) => void
  /** Called with the first loaded month (contains the day the form should open on) */
  onFirstLoad?: (calendar: FormCalendar | null) => void
}

/** Date picker of the day form: only the days TMA opens for filling in can be picked */
export function DatePicker({ value, onChange, onFirstLoad }: Props) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(value.slice(0, 7))
  const [months, setMonths] = useState<Record<string, FormCalendar>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Phone: the calendar is a bottom sheet with bigger days */
  const [phone, setPhone] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const firstLoad = useRef(onFirstLoad)

  const load = useCallback(async (m?: string) => {
    setLoading(true)
    setError('')
    try {
      const calendar = await brigadeApi.dayFormCalendar(m)
      setMonths((prev) => ({ ...prev, [calendar.month]: calendar }))
      if (firstLoad.current) {
        firstLoad.current(calendar)
        firstLoad.current = undefined
      }
    } catch (err) {
      setError((err as Error).message)
      // Without the calendar the form still opens (on today); the server checks the day anyway
      if (firstLoad.current) {
        firstLoad.current(null)
        firstLoad.current = undefined
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Current month at once: it gives the day the form opens on
  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (open && !months[month]) void load(month)
  }, [open, month, months, load])

  useEffect(() => {
    if (!open) return
    setMonth(value.slice(0, 7))
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    const isPhone = window.matchMedia('(max-width: 639px)').matches
    const overflow = document.body.style.overflow
    if (isPhone) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      if (isPhone) document.body.style.overflow = overflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const calendar = months[month]
  const openSet = useMemo(() => new Set(calendar?.openDays ?? []), [calendar])
  const today = Object.values(months)[0]?.today ?? ''
  const currentMonth = today.slice(0, 7)
  const selectedOpen = months[value.slice(0, 7)]?.openDays.includes(value)

  const pick = (date: string) => {
    onChange(date)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setPhone(window.matchMedia('(max-width: 639px)').matches)
          setOpen((v) => !v)
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-11 max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] pl-3 pr-2.5 text-[15px] font-medium transition hover:bg-[var(--muted)] sm:h-9 sm:text-sm"
      >
        <CalendarDays className="size-4 shrink-0 text-[var(--primary)]" />
        <span className="truncate first-letter:uppercase">{dayLabel(value)}</span>
        {selectedOpen === false ? (
          <span className="rounded-full bg-[var(--muted)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Zamknięty
          </span>
        ) : null}
        <ChevronDown className={`size-4 shrink-0 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && phone ? <div className="dialog-backdrop fixed inset-0 z-[69] bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} /> : null}
      {open ? (
        <div
          role="dialog"
          aria-label="Wybierz dzień"
          className={
            phone
              ? 'sheet-panel fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] px-4 pt-2 shadow-2xl'
              : 'rise-in absolute right-0 top-[calc(100%+6px)] z-40 w-[296px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl'
          }
          style={phone ? { paddingBottom: 'max(16px, env(safe-area-inset-bottom))' } : undefined}
        >
          {phone ? (
            <div className="mb-2 flex justify-center">
              <span className="h-1 w-10 rounded-full bg-[var(--border)]" />
            </div>
          ) : null}
          <div className="mb-2 flex items-center justify-between">
            <MonthButton label="Poprzedni miesiąc" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
              <ChevronLeft className="size-4" />
            </MonthButton>
            <p className="flex items-center gap-2 text-sm font-semibold capitalize">
              {monthLabel(month)}
              {loading ? <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" /> : null}
            </p>
            <MonthButton label="Następny miesiąc" disabled={!!currentMonth && month >= currentMonth} onClick={() => setMonth((m) => shiftMonth(m, 1))}>
              <ChevronRight className="size-4" />
            </MonthButton>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className={`pb-1 text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? 'text-[var(--muted-foreground)]/60' : 'text-[var(--muted-foreground)]'}`}>
                {d}
              </span>
            ))}
            {grid(month).map((date, i) => {
              if (!date) return <span key={`e${i}`} />
              const isOpen = openSet.has(date)
              const selected = date === value
              const isToday = date === today
              return (
                <button
                  key={date}
                  type="button"
                  disabled={!isOpen}
                  onClick={() => pick(date)}
                  title={isOpen ? 'Dostępny do wpisu' : 'Zamknięty'}
                  className={`relative flex items-center justify-center rounded-lg tabular-nums transition ${phone ? 'h-11 text-base' : 'h-9 text-sm'} ${
                    selected
                      ? isOpen
                        ? 'bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] shadow-sm'
                        : 'font-semibold text-[var(--muted-foreground)] ring-2 ring-[var(--border)]'
                      : isOpen
                        ? 'bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] font-semibold text-[var(--primary)] hover:bg-[color-mix(in_oklch,var(--primary)_22%,transparent)]'
                        : 'cursor-not-allowed text-[var(--muted-foreground)]/45'
                  } ${calendar ? '' : 'opacity-40'}`}
                >
                  {Number(date.slice(8))}
                  {isToday ? (
                    <span className={`absolute bottom-1 size-1 rounded-full ${selected && isOpen ? 'bg-[var(--primary-foreground)]' : 'bg-[var(--primary)]'}`} />
                  ) : null}
                </button>
              )
            })}
          </div>

          {error ? <p className="mt-2 text-xs text-[var(--destructive)]">{error}</p> : null}
          {calendar && calendar.openDays.length === 0 ? (
            <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">W tym miesiącu nie ma dni do wpisania.</p>
          ) : null}

          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[color-mix(in_oklch,var(--primary)_35%,transparent)]" />
                Dostępny
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border border-[var(--border)]" />
                Zamknięty
              </span>
            </span>
            {today && months[currentMonth]?.openDays.includes(today) && value !== today ? (
              <button type="button" onClick={() => pick(today)} className="font-semibold text-[var(--primary)] hover:underline">
                Dzisiaj
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MonthButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
