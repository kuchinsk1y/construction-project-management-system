import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { FloatLabel } from './FloatField'

export type SelectOption = {
  value: string
  label: string
  /** Small text on the right (unit, rate…) */
  hint?: string
  /** Options with the same group are shown under one header */
  group?: string
}

type Props = {
  value?: string
  onChange?: (value: string) => void
  /**
   * Several values with checkboxes: `values` / `onChangeValues`. An option with value "" (e.g. "Brak") clears them all.
   * The list stays open while ticking.
   */
  multiple?: boolean
  values?: string[]
  onChangeValues?: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
  /** Title of the phone sheet and accessible name */
  title: string
  disabled?: boolean
  invalid?: boolean
  /** Search field; by default when there are more than 8 options */
  searchable?: boolean
  /** Icon at the start of the trigger */
  icon?: ReactNode
  /** Show the chosen option's hint (e.g. the unit) in the field too; by default only in the list */
  hintInTrigger?: boolean
  /** Floating label inside the field (moves onto the border when there is a value or the list is open) */
  label?: string
  className?: string
}

const PHONE = '(max-width: 639px)'
const PANEL_MAX_H = 320
const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')

/**
 * Select in the app style. Phone: bottom sheet with big rows (and search for long lists).
 * Desktop: popover under the field (above it when there is no room), keyboard: ↑ ↓ Enter Esc, type to jump.
 */
export function Select({
  value = '',
  onChange,
  multiple = false,
  values = [],
  onChangeValues,
  options,
  placeholder = 'Wybierz',
  title,
  disabled,
  invalid,
  searchable,
  icon,
  hintInTrigger,
  label,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [phone, setPhone] = useState(false)
  const [focused, setFocused] = useState(false)
  const [place, setPlace] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const listId = useId()

  const withSearch = searchable ?? options.length > 8
  const selected = multiple ? undefined : options.find((o) => o.value === value)
  const chosen = multiple ? options.filter((o) => o.value !== '' && values.includes(o.value)) : []
  const emptyOption = options.find((o) => o.value === '')
  const isChosen = (o: SelectOption) => (multiple ? (o.value === '' ? chosen.length === 0 : values.includes(o.value)) : o.value === value)
  /** Text in the field */
  const shown = multiple
    ? chosen.length
      ? `${chosen[0].label}${chosen.length > 1 ? ` +${chosen.length - 1}` : ''}`
      : emptyOption?.label
    : selected?.label
  const hasValue = multiple ? chosen.length > 0 || !!emptyOption : !!selected

  const filtered = useMemo(() => {
    const q = plain(query.trim())
    return q ? options.filter((o) => plain(`${o.label} ${o.hint ?? ''} ${o.group ?? ''}`).includes(q)) : options
  }, [options, query])

  const place_ = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(Math.max(r.width, 320), window.innerWidth - 16)
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
    const below = window.innerHeight - r.bottom
    const up = below < Math.min(PANEL_MAX_H, 220) && r.top > below
    setPlace({ top: up ? r.top - 6 : r.bottom + 6, left, width, up })
  }, [])

  const openPanel = () => {
    if (disabled) return
    const isPhone = window.matchMedia(PHONE).matches
    setPhone(isPhone)
    setQuery('')
    setActive(isPhone ? -1 : options.findIndex((o) => o.value === value))
    if (!isPhone) place_()
    setOpen(true)
  }

  const close = useCallback((focusTrigger = true) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  const choose = (option: SelectOption) => {
    if (multiple) {
      // Tick / untick; "" clears everything; the list stays open
      const next = option.value === '' ? [] : values.includes(option.value) ? values.filter((v) => v !== option.value) : [...values, option.value]
      onChangeValues?.(next)
      return
    }
    onChange?.(option.value)
    close()
  }

  // Outside click, resize, scroll of the page (desktop popover follows the field)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    const onMove = () => (phone ? undefined : place_())
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    let overflow = ''
    if (phone) {
      overflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
      if (phone) document.body.style.overflow = overflow
    }
  }, [open, phone, close, place_])

  // Focus: search on desktop (on a phone the keyboard would cover the list), else the list itself
  useLayoutEffect(() => {
    if (!open) return
    if (withSearch && !phone) searchRef.current?.focus()
    else listRef.current?.focus()
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' })
  }, [open, withSearch, phone])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(filtered.length - 1, Math.max(-1, i) + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      setActive(e.key === 'Home' ? 0 : filtered.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = filtered[active]
      if (option) choose(option)
    } else if (!withSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Type to jump to the first option starting with these letters
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + plain(e.key), at: now }
      const i = filtered.findIndex((o) => plain(o.label).startsWith(typed.current.text))
      if (i >= 0) setActive(i)
    }
  }

  // Group headers: shown before the first option of each group
  let lastGroup: string | undefined
  const rows = filtered.map((option, index) => {
    const header = option.group && option.group !== lastGroup ? option.group : null
    lastGroup = option.group
    const isSelected = isChosen(option)
    return (
      <div key={`${option.group ?? ''}|${option.value}`}>
        {header ? (
          <p className="sticky top-0 z-10 bg-[var(--card)] px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {header}
          </p>
        ) : null}
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          data-index={index}
          tabIndex={-1}
          onMouseMove={() => (phone ? undefined : setActive(index))}
          onClick={() => choose(option)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 text-left transition-colors ${phone ? 'min-h-12 py-2.5 text-[15px]' : 'min-h-9 py-1.5 text-sm'} ${
            index === active ? 'bg-[var(--muted)]' : ''
          } ${isSelected && !multiple ? 'font-semibold text-[var(--primary)]' : 'text-[var(--foreground)]'}`}
        >
          {multiple ? (
            <span
              className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                isSelected ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-[var(--border)] bg-[var(--background)]'
              } ${option.value === '' ? 'rounded-full' : ''}`}
            >
              {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
          {option.hint ? <span className="shrink-0 text-xs font-medium text-[var(--muted-foreground)]">{option.hint}</span> : null}
          {multiple ? null : <Check className={`size-4 shrink-0 ${isSelected ? 'text-[var(--primary)]' : 'invisible'}`} />}
        </button>
      </div>
    )
  })

  const list = (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={title}
      aria-multiselectable={multiple || undefined}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 outline-none"
    >
      {rows.length ? rows : <p className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">Nic nie znaleziono</p>}
    </div>
  )

  const search = withSearch ? (
    <div className="relative shrink-0 border-b border-[var(--border)]">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <input
        ref={searchRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Szukaj…"
        aria-controls={listId}
        // 16px on phones: iOS does not zoom into the field
        className={`w-full bg-transparent pl-10 pr-3 outline-none placeholder:text-[var(--muted-foreground)] ${phone ? 'h-12 text-base' : 'h-10 text-sm'}`}
      />
    </div>
  ) : null

  return (
    <>
      <div className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            openPanel()
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${title}: ${shown ?? placeholder}`}
        title={multiple && chosen.length > 1 ? chosen.map((o) => o.label).join(', ') : undefined}
        className={`flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border bg-[var(--background)] px-3 text-left text-base outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-2.5 sm:text-sm ${
          invalid ? 'border-[var(--destructive)]' : open ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[color-mix(in_oklch,var(--foreground)_22%,transparent)]'
        } ${className}`}
      >
        {icon ? <span className="shrink-0 text-[var(--muted-foreground)]">{icon}</span> : null}
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-[var(--muted-foreground)]'}`}>
          {/* With a floating label the empty field stays empty: the label is the placeholder until it floats */}
          {shown ?? (label && !open && !focused ? ' ' : placeholder)}
        </span>
        {hintInTrigger && selected?.hint ? <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{selected.hint}</span> : null}
        <ChevronDown className={`size-4 shrink-0 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {label ? <FloatLabel label={label} floated={hasValue || open || focused} focused={open || focused} invalid={invalid} disabled={disabled} withIcon /> : null}
      </div>

      {open
        ? createPortal(
            phone ? (
              <div className="fixed inset-0 z-[70] flex items-end" role="presentation">
                <div className="dialog-backdrop absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => close(false)} />
                <div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={title}
                  className="sheet-panel relative flex max-h-[82dvh] w-full flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] shadow-2xl"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  <div className="flex shrink-0 flex-col items-center pt-2">
                    <span className="h-1 w-10 rounded-full bg-[var(--border)]" />
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-2">
                    <p className="text-base font-semibold">{title}</p>
                    <button
                      type="button"
                      onClick={() => close()}
                      aria-label="Zamknij"
                      className="flex size-9 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {search}
                  {list}
                  {multiple ? (
                    <div className="shrink-0 border-t border-[var(--border)] p-3">
                      <button
                        type="button"
                        onClick={() => close()}
                        className="h-12 w-full rounded-xl bg-[var(--primary)] text-base font-semibold text-[var(--primary-foreground)]"
                      >
                        Gotowe{chosen.length ? ` · ${chosen.length}` : ''}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                className="popover-panel fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
                style={{
                  left: place?.left,
                  width: place?.width,
                  maxHeight: PANEL_MAX_H,
                  ...(place?.up ? { bottom: window.innerHeight - (place?.top ?? 0) } : { top: place?.top }),
                }}
              >
                {search}
                {list}
              </div>
            ),
            document.body,
          )
        : null}
    </>
  )
}
