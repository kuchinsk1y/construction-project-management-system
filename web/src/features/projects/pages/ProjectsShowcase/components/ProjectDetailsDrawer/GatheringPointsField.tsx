import { Flag, Plus, Trash2 } from 'lucide-react'
import type { GatheringPointDraft } from '@/features/projects/types'
import { LocationField } from './LocationField'

type GatheringPointsFieldProps = {
  value: GatheringPointDraft[]
  onChange: (points: GatheringPointDraft[]) => void
}

const newGatheringPointKey = () => `gp-${Math.random().toString(36).slice(2, 10)}`

// Same field look as the rows of the milestones form
const inputCls =
  'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)]'
const labelCls = 'text-[10px] font-semibold text-zinc-700 dark:text-zinc-300'

/** Editor for the named gathering points on the construction site (form section at the bottom of the project form) */
export function GatheringPointsField({ value, onChange }: GatheringPointsFieldProps) {
  const update = (key: string, patch: Partial<GatheringPointDraft>) =>
    onChange(value.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  const remove = (key: string) => onChange(value.filter((p) => p.key !== key))
  const add = () => onChange([...value, { key: newGatheringPointKey(), name: '' }])

  return (
    <div className="space-y-3">
      <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
        <Flag size={13} className="text-[var(--sidebar-primary)]" />
        <span>Punkty zbiórki</span>
        {value.length ? (
          <span className="ml-1 rounded-full bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] px-1.5 text-[10px] font-bold text-[var(--sidebar-primary)]">
            {value.length}
          </span>
        ) : null}
      </p>

      {value.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          Miejsca na budowie, w których zbierają się brygady. Możesz dodać kilka punktów.
        </p>
      ) : null}

      {value.length ? (
        <div>
          {/* Column captions once, above the first row */}
          <div className="grid grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,3fr)_2rem] gap-2.5 pb-1">
            <span className={labelCls}>Nr</span>
            <span className={labelCls}>
              Nazwa punktu <span className="text-rose-500">*</span>
            </span>
            <span className={labelCls}>
              Lokalizacja (link Google Maps lub współrzędne) <span className="text-rose-500">*</span>
            </span>
            <span />
          </div>
          {value.map((point, index) => (
            <div
              key={point.key}
              className="grid grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,3fr)_2rem] items-start gap-2.5 border-b border-[var(--border)] py-2 last:border-0"
            >
              <span className="mt-1.5 flex size-6 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] text-[11px] font-bold text-[var(--sidebar-primary)]">
                {index + 1}
              </span>
              <input
                value={point.name}
                maxLength={150}
                onChange={(e) => update(point.key, { name: e.target.value })}
                placeholder="np. Brama główna"
                className={inputCls}
              />
              <LocationField
                compact
                required
                value={{ pinUrl: point.pinUrl, latitude: point.latitude, longitude: point.longitude }}
                onChange={(loc) => update(point.key, { pinUrl: loc.pinUrl, latitude: loc.latitude, longitude: loc.longitude })}
              />
              <button
                type="button"
                onClick={() => remove(point.key)}
                className="mt-0.5 flex size-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-500/10"
                title="Usuń punkt"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={add}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:border-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary)] dark:border-zinc-600"
      >
        <Plus size={14} />
        Dodaj punkt zbiórki
      </button>
    </div>
  )
}
