import { Flag, Plus, Trash2 } from 'lucide-react'
import type { GatheringPointDraft } from '@/features/projects/types'
import { LocationField } from './LocationField'

type GatheringPointsFieldProps = {
  value: GatheringPointDraft[]
  onChange: (points: GatheringPointDraft[]) => void
}

const newGatheringPointKey = () => `gp-${Math.random().toString(36).slice(2, 10)}`

const inputCls =
  'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60'

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

      {value.map((point, index) => (
        <div key={point.key} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-3">
          <div className="flex items-end gap-2">
            <span className="mb-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] text-[11px] font-bold text-[var(--sidebar-primary)]">
              {index + 1}
            </span>
            <label className="block flex-1 min-w-0">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Nazwa punktu <span className="text-rose-500">*</span>
              </span>
              <input
                value={point.name}
                maxLength={150}
                onChange={(e) => update(point.key, { name: e.target.value })}
                placeholder="np. Brama główna, Zaplecze, Parking"
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => remove(point.key)}
              className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              title="Usuń punkt"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <LocationField
            label="Lokalizacja punktu"
            required
            value={{ pinUrl: point.pinUrl, latitude: point.latitude, longitude: point.longitude }}
            onChange={(loc) => update(point.key, { pinUrl: loc.pinUrl, latitude: loc.latitude, longitude: loc.longitude })}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:border-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary)] dark:border-zinc-600"
      >
        <Plus size={14} />
        Dodaj punkt zbiórki
      </button>
    </div>
  )
}
