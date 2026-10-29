import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, MapPin } from 'lucide-react'
import { resolveLocation } from '@/features/projects/api'
import type { ResolvedLocation } from '@/features/projects/types'

export type LocationValue = {
  pinUrl?: string
  latitude?: number
  longitude?: number
}

type LocationFieldProps = {
  value: LocationValue
  onChange: (value: LocationValue) => void
  /** Called with the detected place so the form can fill empty city/country */
  onPlaceResolved?: (place: NonNullable<ResolvedLocation['place']>) => void
  required?: boolean
  /** Field caption; defaults to the project pin label */
  label?: string
  /** Row layout (list editors): no caption, smaller input, one-line result */
  compact?: boolean
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; place: ResolvedLocation['place'] }
  | { kind: 'error'; message: string }

const inputCls =
  'h-10 w-full rounded-xl border bg-[var(--background)] pl-9 pr-9 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:ring-2 hover:border-zinc-400/60 dark:hover:border-zinc-600/60'

function coordsText(lat?: number, lng?: number): string {
  return lat != null && lng != null ? `${lat}, ${lng}` : ''
}

/**
 * Project location: paste a Google Maps link (also short maps.app.goo.gl links) or type
 * "lat, lng". The backend extracts the coordinates and names the place.
 */
export function LocationField({
  value,
  onChange,
  onPlaceResolved,
  required = false,
  label = 'Pinezka / współrzędne',
  compact = false,
}: LocationFieldProps) {
  const [text, setText] = useState(() => value.pinUrl || coordsText(value.latitude, value.longitude))
  const [status, setStatus] = useState<Status>(() =>
    value.latitude != null && value.longitude != null ? { kind: 'loading' } : { kind: 'idle' },
  )
  const timer = useRef<number | undefined>(undefined)
  const lastRequest = useRef(0)

  const hasCoords = value.latitude != null && value.longitude != null

  const resolve = async (input: string, fillPlace: boolean) => {
    const requestId = ++lastRequest.current
    setStatus({ kind: 'loading' })
    try {
      const result = await resolveLocation(input)
      if (requestId !== lastRequest.current) return
      onChange({ pinUrl: result.pinUrl, latitude: result.latitude, longitude: result.longitude })
      setStatus({ kind: 'ok', place: result.place })
      if (fillPlace && result.place) onPlaceResolved?.(result.place)
    } catch (error) {
      if (requestId !== lastRequest.current) return
      onChange({ pinUrl: input, latitude: undefined, longitude: undefined })
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Nie udało się odczytać lokalizacji.' })
    }
  }

  // Existing project: show the place for the saved coordinates
  useEffect(() => {
    if (value.latitude == null || value.longitude == null) return
    let cancelled = false
    resolveLocation(coordsText(value.latitude, value.longitude))
      .then((result) => { if (!cancelled) setStatus({ kind: 'ok', place: result.place }) })
      .catch(() => { if (!cancelled) setStatus({ kind: 'ok', place: null }) })
    return () => { cancelled = true }
    // Only on mount — later changes are resolved by the input handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleChange = (next: string) => {
    setText(next)
    window.clearTimeout(timer.current)
    if (!next.trim()) {
      lastRequest.current++
      onChange({ pinUrl: undefined, latitude: undefined, longitude: undefined })
      setStatus({ kind: 'idle' })
      return
    }
    // Resolve shortly after the user stops typing / right after a paste
    timer.current = window.setTimeout(() => void resolve(next.trim(), true), 600)
  }

  const borderCls = status.kind === 'error'
    ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/15'
    : status.kind === 'ok'
      ? 'border-emerald-500/50 focus:border-[var(--sidebar-primary)] focus:ring-[var(--sidebar-primary)]/15'
      : 'border-[var(--border)] focus:border-[var(--sidebar-primary)] focus:ring-[var(--sidebar-primary)]/15'

  const mapsHref = hasCoords ? `https://www.google.com/maps?q=${value.latitude},${value.longitude}` : null

  if (compact) {
    return (
      <div className="min-w-0">
        <div className="relative">
          <MapPin size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => {
              if (text.trim() && !hasCoords && status.kind !== 'loading') {
                window.clearTimeout(timer.current)
                void resolve(text.trim(), true)
              }
            }}
            placeholder="Link Google Maps lub 54.352, 18.646"
            aria-invalid={status.kind === 'error'}
            className={`h-9 w-full rounded-lg border bg-[var(--background)] pl-8 pr-8 text-xs outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 focus:ring-2 ${borderCls}`}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            {status.kind === 'loading' ? (
              <Loader2 size={13} className="animate-spin text-[var(--muted-foreground)]" />
            ) : status.kind === 'ok' ? (
              <CheckCircle2 size={13} className="text-emerald-500" />
            ) : status.kind === 'error' ? (
              <AlertCircle size={13} className="text-rose-500" />
            ) : null}
          </span>
        </div>
        {status.kind === 'ok' && hasCoords ? (
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] min-w-0">
            <span className="truncate" title={status.place?.label ?? undefined}>{status.place?.label || 'Lokalizacja zapisana'}</span>
            {mapsHref ? (
              <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-[var(--sidebar-primary)] hover:underline">
                Mapa <ExternalLink size={10} />
              </a>
            ) : null}
          </p>
        ) : status.kind === 'error' ? (
          <p className="mt-1 text-[10px] font-medium text-rose-500">{status.message}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="block">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <div className="relative">
        <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => {
            if (text.trim() && !hasCoords && status.kind !== 'loading') {
              window.clearTimeout(timer.current)
              void resolve(text.trim(), true)
            }
          }}
          placeholder="Wklej link Google Maps lub wpisz np. 54.352, 18.646"
          aria-invalid={status.kind === 'error'}
          className={`${inputCls} ${borderCls}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {status.kind === 'loading' ? (
            <Loader2 size={15} className="animate-spin text-[var(--muted-foreground)]" />
          ) : status.kind === 'ok' ? (
            <CheckCircle2 size={15} className="text-emerald-500" />
          ) : status.kind === 'error' ? (
            <AlertCircle size={15} className="text-rose-500" />
          ) : null}
        </span>
      </div>

      {/* Result under the input */}
      {status.kind === 'ok' && hasCoords ? (
        <div className="mt-1.5 flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--foreground)]">
              {status.place?.label || 'Lokalizacja zapisana'}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
              {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
            </p>
          </div>
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--sidebar-primary)] hover:underline"
            >
              Mapa <ExternalLink size={11} />
            </a>
          ) : null}
        </div>
      ) : status.kind === 'loading' && text ? (
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">Odczytywanie lokalizacji…</p>
      ) : status.kind === 'error' ? (
        <p className="mt-1.5 text-[11px] font-medium text-rose-500">{status.message}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
          W Google Maps kliknij miejsce budowy → „Udostępnij” → „Kopiuj link” i wklej tutaj.
        </p>
      )}
    </div>
  )
}
