import type { DayForm, RowKind } from './api'

/** One line of a worker's card: project + work type + hours */
export type FormRow = {
  id: string
  projectId: string
  /** "wt:<id>" — work type of the project, "svc:<name>" — Urlop, Chory, Wolne… */
  workType: string
  hours: string
  /** Surcharges («Warunki») of the row, several at once (stored in work_hour_surcharges, many-to-many) */
  surchargeIds: string[]
  note: string
}

export type WorkerEntry = { key: string; rating: number; rows: FormRow[] }
/** The foreman's own day: like a worker's row (project work type + hours) */
export type ForemanEntry = { projectId: string; workType: string; hours: string; note: string }
export type FormState = { foreman: ForemanEntry; workers: WorkerEntry[] }

export type Crew = DayForm['crew'][number]

let seq = 0
export const rowId = () => `r${Date.now().toString(36)}${(++seq).toString(36)}`

export const emptyRow = (): FormRow => ({ id: rowId(), projectId: '', workType: '', hours: '', surchargeIds: [], note: '' })
export const emptyForeman = (): ForemanEntry => ({ projectId: '', workType: '', hours: '', note: '' })

export const serviceValue = (name: string) => `svc:${name}`
export const isServiceValue = (value: string) => value.startsWith('svc:')

export const canRate = (w: Crew) => w.company.toLowerCase().includes('ispik')

export type CheckIn = Crew['checkIns'][number]

/** Worked that day: checked in (TMA) and not absent. Only these people get a card. */
export const isWorking = (w: Crew) => !w.status && w.checkIns.length > 0

/**
 * Projects a worker worked on that day, in the order of his check-ins (TMA): one block of the card each.
 * Two visits of the same project make one block. projectId '' = a project outside the foreman's list.
 */
export type WorkBlock = { projectId: string; checkIns: CheckIn[] }

export function workBlocks(worker: Pick<Crew, 'checkIns'>, projects: DayForm['projects']): WorkBlock[] {
  const blocks: WorkBlock[] = []
  for (const c of worker.checkIns) {
    const projectId = projects.some((p) => p.id === c.projectId) ? c.projectId : ''
    const block = blocks.find((b) => b.projectId === projectId)
    if (block) block.checkIns.push(c)
    else blocks.push({ projectId, checkIns: [c] })
  }
  return blocks
}

/**
 * Hours between check-in and close (TMA) of all visits of a block, to 0.5 h (no upper limit: the foreman knows the day).
 * Nothing while a visit is open or when TMA closed it by itself (the person forgot to close it).
 */
export function suggestedHours(checkIns: CheckIn[]): string {
  let hours = 0
  for (const c of checkIns) {
    if (!c.closedAt || c.status === 'auto_closed') return ''
    const h = (Date.parse(c.closedAt) - Date.parse(c.at)) / 3_600_000
    if (!Number.isFinite(h) || h <= 0) return ''
    hours += h
  }
  return hours > 0 ? String(Math.round(hours * 2) / 2) : ''
}

/** Work type chosen in TMA on that project, when it is one of the project's work types */
function checkInWorkType(block: WorkBlock, projects: DayForm['projects']): string {
  const project = projects.find((p) => p.id === block.projectId)
  const id = block.checkIns.map((c) => c.workTypeId).find((w) => !!w && project?.workTypes.some((x) => x.id === w))
  return id ? `wt:${id}` : ''
}

const checkInNote = (block: WorkBlock) => block.checkIns.map((c) => c.note?.trim()).filter(Boolean).join(' · ')

/** First line of a block, all from the TMA check-in: project, work type, hours of the visit and the worker's note */
export const startRow = (block: WorkBlock, projects: DayForm['projects']): FormRow => ({
  ...emptyRow(),
  projectId: block.projectId,
  workType: checkInWorkType(block, projects),
  hours: suggestedHours(block.checkIns),
  note: checkInNote(block),
})

/** Fresh card of a worker: one line per project he checked in on */
export const startRows = (worker: Pick<Crew, 'checkIns'>, projects: DayForm['projects']) =>
  workBlocks(worker, projects).map((b) => startRow(b, projects))

/** Another work type on the same project: a clean line (no work type, hours or note copied) */
export const nextRow = (projectId: string): FormRow => ({ ...emptyRow(), projectId })

/** Project most of the crew works on: the foreman's card starts with it */
export function mainProject(form: DayForm): string {
  const counts = new Map<string, number>()
  for (const w of form.crew) if (w.projectId) counts.set(w.projectId, (counts.get(w.projectId) ?? 0) + 1)
  const best = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (best && form.projects.some((p) => p.id === best)) return best
  const own = form.projects.filter((p) => !p.isService)
  return own.length === 1 ? own[0].id : ''
}

/** Rows of a saved draft fitted to today's check-ins: each block keeps what the foreman typed, new blocks start from TMA */
function rowsFromDraft(saved: FormRow[], blocks: WorkBlock[], projects: DayForm['projects']): FormRow[] {
  const fixed = saved.map((old) => {
    const legacy = old as FormRow & { surchargeId?: string }
    const r: FormRow = { ...old, surchargeIds: Array.isArray(old.surchargeIds) ? old.surchargeIds : legacy.surchargeId ? [legacy.surchargeId] : [] }
    // One project that day: older drafts may hold another project — the row moves to it (another project, other work types)
    if (blocks.length === 1 && r.projectId !== blocks[0].projectId) return { ...r, projectId: blocks[0].projectId, workType: '' }
    return r
  })
  return blocks.flatMap((block) => {
    const rows = fixed.filter((r) => r.projectId === block.projectId)
    if (!rows.length) return [startRow(block, projects)]
    if (rows.length !== 1) return rows
    // A draft from before TMA had the data gets it now; what the foreman typed stays
    const [row] = rows
    return [
      {
        ...row,
        hours: row.hours || suggestedHours(block.checkIns),
        workType: row.workType || checkInWorkType(block, projects),
        note: row.note || checkInNote(block),
      },
    ]
  })
}

/** Fresh form for the crew (projects from TMA), or the saved draft fitted to today's crew */
export function initialState(form: DayForm, draft: FormState | null): FormState {
  const fromDraft = new Map(draft?.workers.map((w) => [w.key, w]))
  const main = mainProject(form)
  // Older drafts kept a "kind" (Praca / Wolne…) instead of a work type: only the fields below are taken
  const saved = draft?.foreman as Partial<ForemanEntry> | undefined
  const foreman: ForemanEntry = {
    projectId: saved?.projectId || main,
    workType: typeof saved?.workType === 'string' ? saved.workType : '',
    hours: saved?.hours ?? '',
    note: saved?.note ?? '',
  }
  return {
    foreman,
    workers: form.crew.filter(isWorking).map((w) => {
      const saved = fromDraft.get(w.key)
      const blocks = workBlocks(w, form.projects)
      return {
        key: w.key,
        rating: saved?.rating ?? 0,
        rows: saved?.rows.length ? rowsFromDraft(saved.rows, blocks, form.projects) : blocks.map((b) => startRow(b, form.projects)),
      }
    }),
  }
}

export const toNumber = (value: string) => {
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
export const sumHours = (rows: FormRow[]) => rows.reduce((s, r) => s + (isServiceValue(r.workType) ? 0 : toNumber(r.hours)), 0)

/** Hours typed into a row: not negative, step 0.5. No daily limit — the foreman writes what was worked. */
export function clampHours(raw: string): string {
  if (raw.trim() === '') return ''
  return String(Math.round(Math.max(toNumber(raw), 0) * 2) / 2)
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
  if (!f.projectId) add('foreman', 'Wybierz obiekt', 'project')
  if (!f.workType) add('foreman', 'Wybierz rodzaj', 'workType')
  if (toNumber(f.hours) <= 0) add('foreman', 'Godziny muszą być większe niż 0', 'hours')

  const crew = new Map(form.crew.map((w) => [w.key, w]))
  for (const entry of state.workers) {
    const worker = crew.get(entry.key)
    if (!worker) continue
    // People on vacation or dismissed that day are not rated
    if (form.isFriday && canRate(worker) && !worker.status && !entry.rating) add(entry.key, 'Brak oceny (piątek)', 'rating')
    for (const row of entry.rows) {
      const service = isServiceValue(row.workType)
      if (!row.workType) add(entry.key, 'Wybierz rodzaj', `${row.id}|workType`)
      if (!service && !row.projectId) add(entry.key, 'Brak odbicia na obiekcie — wpisz nieobecność', `${row.id}|project`)
      if (!service && row.workType && toNumber(row.hours) <= 0) add(entry.key, 'Godziny muszą być większe niż 0', `${row.id}|hours`)
    }
  }

  let count = 0
  for (const list of cards.values()) count += list.length
  return { cards, fields, count }
}

// --- draft in the browser (per foreman and date) ---

const draftKey = (userId: string, date: string) => `brigade_day_draft:${userId}:${date}`

export function readDraft(userId: string, date: string): FormState | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, date))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FormState
    return parsed && Array.isArray(parsed.workers) && parsed.foreman ? parsed : null
  } catch {
    return null
  }
}

export function writeDraft(userId: string, date: string, state: FormState | null) {
  try {
    if (state) localStorage.setItem(draftKey(userId, date), JSON.stringify(state))
    else localStorage.removeItem(draftKey(userId, date))
  } catch {
    /* storage unavailable: the form still works */
  }
}
