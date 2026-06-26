import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']
const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

type DatePickerProps = {
  value: string            // yyyy-mm-dd or ''
  onChange: (value: string) => void
  min?: string             // yyyy-mm-dd
  max?: string             // yyyy-mm-dd
  placeholder?: string
  title?: string
  ariaLabel?: string
  className?: string
  size?: 'sm' | 'md'
}

function toDateObj(s: string): Date | null {
  if (!s) return null
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDisplay(s: string): string {
  if (!s) return ''
  const d = toDateObj(s)
  if (!d) return s
  const day = String(d.getDate()).padStart(2, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${m}.${d.getFullYear()}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Mon ... 6=Sun
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'дд.мм.гггг',
  title,
  ariaLabel,
  className,
  size = 'md',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Calendar view state
  const today = useMemo(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth(), day: n.getDate(), str: fmt(n) }
  }, [])

  const selected = useMemo(() => toDateObj(value), [value])

  const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? today.year)
  const [viewMonth, setViewMonth] = useState(() => selected?.getMonth() ?? today.month)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Position calendar to stay within viewport
  useEffect(() => {
    if (!open || !calendarRef.current || !containerRef.current) return
    const cal = calendarRef.current
    const container = containerRef.current
    const rect = container.getBoundingClientRect()

    // Reset position
    cal.style.top = ''
    cal.style.bottom = ''
    cal.style.left = ''
    cal.style.right = ''

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceRight = window.innerWidth - rect.left

    if (spaceBelow < 320) {
      cal.style.bottom = '100%'
      cal.style.marginBottom = '4px'
    } else {
      cal.style.top = '100%'
      cal.style.marginTop = '4px'
    }

    if (spaceRight < 300) {
      cal.style.right = '0'
    } else {
      cal.style.left = '0'
    }
  }, [open, viewMonth, viewYear])

  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }, [])

  const handleSelectDay = useCallback((day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    onChange(fmt(d))
    setOpen(false)
  }, [viewYear, viewMonth, onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }, [onChange])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
    const minDate = toDateObj(min ?? '')
    const maxDate = toDateObj(max ?? '')

    const cells: { day: number; current: boolean; disabled: boolean }[] = []

    // Previous month padding
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
    const prevDays = getDaysInMonth(prevYear, prevMonth)
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, current: false, disabled: true })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d)
      let disabled = false
      if (minDate && date < minDate) disabled = true
      if (maxDate && date > maxDate) disabled = true
      cells.push({ day: d, current: true, disabled })
    }

    // Next month padding
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, current: false, disabled: true })
    }

    return cells
  }, [viewYear, viewMonth, min, max])

  const isToday = (day: number) =>
    viewYear === today.year && viewMonth === today.month && day === today.day

  const isSelected = (day: number) =>
    selected && viewYear === selected.getFullYear() && viewMonth === selected.getMonth() && day === selected.getDate()

  const h = size === 'sm' ? 'h-8' : 'h-9'

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger input */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            if (!o) {
              // Sync calendar view to selected date when opening
              const s = toDateObj(value)
              setViewYear(s?.getFullYear() ?? today.year)
              setViewMonth(s?.getMonth() ?? today.month)
            }
            return !o
          })
        }}
        title={title}
        aria-label={ariaLabel}
        className={cn(
          h,
          'inline-flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 text-sm outline-none transition',
          'focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20',
          'hover:border-[var(--muted-foreground)]/40',
          open && 'border-[var(--sidebar-primary)] ring-2 ring-[var(--sidebar-primary)]/20',
          className,
        )}
      >
        <CalendarDays size={13} className="shrink-0 text-[var(--muted-foreground)]" />
        <span className={cn('flex-1 text-left truncate', !value && 'text-[var(--muted-foreground)]')}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            className="ml-auto shrink-0 rounded-full p-0.5 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ×
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div
          ref={calendarRef}
          className="absolute z-[100] w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl shadow-black/15"
          style={{ animation: 'calendarPopIn 150ms ease-out both' }}
        >
          {/* Header: month/year nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex size-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {MONTHS_PL[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex size-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {DAYS_PL.map((d) => (
              <span key={d} className="py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, i) => {
              if (!cell.current) {
                return (
                  <span
                    key={`pad-${i}`}
                    className="flex size-[34px] items-center justify-center text-xs text-[var(--muted-foreground)]/30"
                  >
                    {cell.day}
                  </span>
                )
              }

              const sel = isSelected(cell.day)
              const tod = isToday(cell.day)

              return (
                <button
                  key={`day-${cell.day}`}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => handleSelectDay(cell.day)}
                  className={cn(
                    'flex size-[34px] items-center justify-center rounded-lg text-xs font-medium transition-all',
                    cell.disabled && 'cursor-not-allowed opacity-30',
                    !cell.disabled && !sel && 'hover:bg-[var(--sidebar-primary)]/10 hover:text-[var(--sidebar-primary)]',
                    sel && 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-sm shadow-[var(--sidebar-primary)]/30',
                    !sel && tod && 'ring-1 ring-[var(--sidebar-primary)]/50 text-[var(--sidebar-primary)] font-bold',
                    !sel && !tod && !cell.disabled && 'text-[var(--foreground)]',
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Today button */}
          <div className="mt-2 flex justify-center border-t border-[var(--border)] pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(today.str)
                setOpen(false)
              }}
              className="rounded-lg px-3 py-1 text-xs font-medium text-[var(--sidebar-primary)] transition hover:bg-[var(--sidebar-primary)]/10"
            >
              Dzisiaj
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
