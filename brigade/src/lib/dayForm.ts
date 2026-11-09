import type { DayForm, RowKind } from './api'

export const MAX_DAY_HOURS = 16

/** One line of a worker's card: project + work type + hours */
export type FormRow = {
  id: string
  projectId: string
  /** "wt:<id>" — work type of the project, "svc:<name>" — Urlop, Chory, Wolne… */
  workType: string
  hours: string
  surchargeId: string
  note: string
}

export type WorkerEntry = { key: string; rating: number; rows: FormRow[] }
export type ForemanEntry = { projectId: string; kind: string; hours: string; note: string }
export type FormState = { foreman: ForemanEntry; workers: WorkerEntry[] }

export type Crew = DayForm['crew'][number]

let seq = 0
export const rowId = () => `r${Date.now().toString(36)}${(++seq).toString(36)}`

export const emptyRow = (): FormRow => ({ id: rowId(), projectId: '', workType: '', hours: '', surchargeId: '', note: '' })
export const emptyForeman = (): ForemanEntry => ({ projectId: '', kind: 'Praca', hours: '', note: '' })

export const serviceValue = (name: string) => `svc:${name}`
export const isServiceValue = (value: string) => value.startsWith('svc:')

/** Row for a person on vacation / dismissed on the date */
function statusRows(status: Crew['status']): FormRow[] | null {
  if (status === 'vacation') return [{ ...emptyRow(), workType: serviceValue('Urlop') }]
  if (status === 'dismissed') return [{ ...emptyRow(), workType: serviceValue('Zwolniony') }]
  return null
}

export const canRate = (w: Crew) => w.company.toLowerCase().includes('ispik')

/** Fresh form for the crew, or the saved draft fitted to today's crew (new people added, gone people dropped) */
export function initialState(form: DayForm, draft: FormState | null): FormState {
  const fromDraft = new Map(draft?.workers.map((w) => [w.key, w]))
  return {
    foreman: draft?.foreman ?? emptyForeman(),
    workers: form.crew.map((w) => {
      const forced = statusRows(w.status)
      const saved = fromDraft.get(w.key)
      return {
        key: w.key,
        rating: saved?.rating ?? 0,
        rows: forced ?? (saved?.rows.length ? saved.rows : [emptyRow()]),
      }
    }),
  }
}

export const toNumber = (value: string) => {
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
export const sumHours = (rows: FormRow[]) => rows.reduce((s, r) => s + (isServiceValue(r.workType) ? 0 : toNumber(r.hours)), 0)

/** Hours typed into a row: not negative, step 0.5, and the card stays within 16 h */
export function clampHours(raw: string, rows: FormRow[], rowIdToSkip: string): string {
  if (raw.trim() === '') return ''
  const value = toNumber(raw)
  const others = rows.filter((r) => r.id !== rowIdToSkip).reduce((s, r) => s + (isServiceValue(r.workType) ? 0 : toNumber(r.hours)), 0)
  const max = Math.max(0, MAX_DAY_HOURS - others)
  const rounded = Math.round(Math.min(Math.max(value, 0), max) * 2) / 2
  return String(rounded)
}

export function kindOfValue(value: string, serviceKinds: Array<{ name: string; kind: RowKind }>): RowKind | null {
  if (!isServiceValue(value)) return null
  return serviceKinds.find((k) => serviceValue(k.name) === value)?.kind ?? null
}

export type Problems = {
  /** card key ("foreman" or worker key) → messages */
  cards: Map<string, string[]>
  /** "<card key>|<row id>|<field>" */
  fields: Set<string>
  count: number
}

/** Same checks as ST_BR before saving */
export function validate(form: DayForm, state: FormState): Problems {
  const cards = new Map<string, string[]>()
  const fields = new Set<string>()
  const add = (card: string, message: string, field?: string) => {
    const list = cards.get(card) ?? []
    if (!list.includes(message)) list.push(message)
    cards.set(card, list)
    if (field) fields.add(`${card}|${field}`)
  }

  const f = state.foreman
  if (f.kind === 'Praca') {
    if (!f.projectId) add('foreman', 'Wybierz obiekt', 'project')
    if (toNumber(f.hours) <= 0) add('foreman', 'Godziny muszą być większe niż 0', 'hours')
  }

  const crew = new Map(form.crew.map((w) => [w.key, w]))
  for (const entry of state.workers) {
    const worker = crew.get(entry.key)
    if (!worker) continue
    // People on vacation or dismissed that day are not rated
    if (form.isFriday && canRate(worker) && !worker.status && !entry.rating) add(entry.key, 'Brak oceny (piątek)', 'rating')
    for (const row of entry.rows) {
      const service = isServiceValue(row.workType)
      if (!row.workType) add(entry.key, 'Wybierz rodzaj', `${row.id}|workType`)
      if (!service && !row.projectId) add(entry.key, 'Wybierz obiekt', `${row.id}|project`)
      if (!service && row.workType && toNumber(row.hours) <= 0) add(entry.key, 'Godziny muszą być większe niż 0', `${row.id}|hours`)
    }
    if (sumHours(entry.rows) > MAX_DAY_HOURS) add(entry.key, `Suma godzin ponad ${MAX_DAY_HOURS}`)
  }

  let count = 0
  for (const list of cards.values()) count += list.length
  return { cards, fields, count }
}

// --- draft in the browser (per foreman and date) ---

const draftKey = (userId: number, date: string) => `brigade_day_draft:${userId}:${date}`

export function readDraft(userId: number, date: string): FormState | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, date))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FormState
    return parsed && Array.isArray(parsed.workers) && parsed.foreman ? parsed : null
  } catch {
    return null
  }
}

export function writeDraft(userId: number, date: string, state: FormState | null) {
  try {
    if (state) localStorage.setItem(draftKey(userId, date), JSON.stringify(state))
    else localStorage.removeItem(draftKey(userId, date))
  } catch {
    /* storage unavailable: the form still works */
  }
}
