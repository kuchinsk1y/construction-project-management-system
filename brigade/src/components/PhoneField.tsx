import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { buildCountries, matchesCountry, type Country } from '@/lib/countries'

type PhoneFieldProps = {
  country: Country
  onCountryChange: (country: Country) => void
  number: string
  onNumberChange: (value: string) => void
  invalid?: boolean
  autoFocus?: boolean
}

export const COUNTRIES = buildCountries()

/** Country code badge: flag emoji are not drawn on Windows, so a neutral badge looks the same everywhere */
function CountryBadge({ iso }: { iso: string }) {
  return (
    <span className="inline-flex h-5 min-w-[26px] items-center justify-center rounded-md bg-[var(--muted)] px-1 text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
      {iso}
    </span>
  )
}

/** Country (with search) + national number. The full number is "+" + calling code + digits. */
export function PhoneField({ country, onCountryChange, number, onNumberChange, invalid, autoFocus }: PhoneFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const numberRef = useRef<HTMLInputElement>(null)

  const list = useMemo(() => COUNTRIES.filter((c) => matchesCountry(c, query)), [query])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (c: Country) => {
    onCountryChange(c)
    setOpen(false)
    setQuery('')
    numberRef.current?.focus()
  }

  return (
    <div ref={boxRef} className="relative">
      <div
        className={`flex h-14 items-stretch overflow-hidden rounded-2xl border bg-[var(--card)] transition focus-within:ring-4 ${
          invalid
            ? 'border-[var(--destructive)] focus-within:ring-[color-mix(in_oklch,var(--destructive)_15%,transparent)]'
            : 'border-[var(--border)] focus-within:border-[var(--primary)] focus-within:ring-[color-mix(in_oklch,var(--primary)_15%,transparent)]'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-2 border-r border-[var(--border)] pl-4 pr-3 transition hover:bg-[var(--muted)]"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <CountryBadge iso={country.iso} />
          <span className="text-[15px] font-semibold tabular-nums">+{country.dial}</span>
          <ChevronDown className={`size-4 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <input
          ref={numberRef}
          value={number}
          onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s-]/g, ''))}
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          placeholder="123 456 789"
          className="min-w-0 flex-1 bg-transparent px-4 text-[17px] font-medium tracking-wide outline-none placeholder:text-[var(--muted-foreground)]/60"
          aria-label="Numer telefonu"
        />
      </div>

      {open ? (
        <div className="rise-in absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <div className="relative border-b border-[var(--border)]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj kraju lub kodu, np. Polska, +48"
              className="h-12 w-full bg-transparent pl-11 pr-4 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <ul role="listbox" className="scrollbar-thin max-h-72 overflow-y-auto py-1.5">
            {list.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">Nie znaleziono kraju</li>
            ) : (
              list.map((c, i) => (
                <li key={c.iso}>
                  {i === 5 && !query ? <div className="mx-4 my-1.5 border-t border-[var(--border)]" /> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.iso === country.iso}
                    onClick={() => pick(c)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--muted)]"
                  >
                    <CountryBadge iso={c.iso} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-[var(--muted-foreground)]">+{c.dial}</span>
                    {c.iso === country.iso ? <Check className="size-4 text-[var(--primary)]" /> : <span className="size-4" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
