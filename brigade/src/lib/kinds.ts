import type { RowKind } from './api'

/** Each kind of row has its own colour by meaning */
export const KINDS: Record<RowKind, { label: string; badge: string; dot: string }> = {
  work: { label: 'Praca', badge: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300', dot: 'bg-emerald-500' },
  extra: { label: 'Dodatkowe', badge: 'bg-amber-500/12 text-amber-700 ring-amber-500/30 dark:text-amber-300', dot: 'bg-amber-500' },
  day_off: { label: 'Wolne', badge: 'bg-slate-500/10 text-slate-600 ring-slate-500/25 dark:text-slate-300', dot: 'bg-slate-400' },
  vacation: { label: 'Urlop', badge: 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300', dot: 'bg-sky-500' },
  sick: { label: 'Chory', badge: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300', dot: 'bg-violet-500' },
  dismissed: { label: 'Zwolniony', badge: 'bg-zinc-500/15 text-zinc-700 ring-zinc-500/30 dark:text-zinc-300', dot: 'bg-zinc-600' },
  absence: { label: 'Absencja', badge: 'bg-orange-500/12 text-orange-700 ring-orange-500/30 dark:text-orange-300', dot: 'bg-orange-500' },
  penalty: { label: 'Kara', badge: 'bg-rose-500/12 text-rose-700 ring-rose-500/30 dark:text-rose-300', dot: 'bg-rose-500' },
}
export const KIND_ORDER = Object.keys(KINDS) as RowKind[]

/** Letters of the hours report for days without working hours */
export type DayMark = 'U' | 'C' | 'W' | 'Z' | 'A' | 'K'
export const MARK_KIND: Record<DayMark, RowKind> = { U: 'vacation', C: 'sick', W: 'day_off', Z: 'dismissed', A: 'absence', K: 'penalty' }
