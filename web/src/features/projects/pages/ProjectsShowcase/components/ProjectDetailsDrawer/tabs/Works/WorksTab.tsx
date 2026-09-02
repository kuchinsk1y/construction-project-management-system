import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Plus, Edit2, Layers, Check, X, ChevronDown, AlertTriangle, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchProjectDepartments,
  fetchForemenAssignments,
  fetchWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
} from '@/features/projects/api'
import type { ApiMilestone, CreateWorkTypePayload, ApiWorkType } from '@/features/projects/types'

// ─── Constants ──────────────────────────────────────────────────────────────

const UNIT_OPTIONS = ['szt.', '%', 'm', 'm²', 'm³', 'kg', 't', 'kpl', 'godz.', 'ryczałt']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLocal(value: string | undefined | null, fallback = '-'): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Combobox: preset options + free text input */
function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Wybierz lub wpisz...',
  disabled = false,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const isCustom = value && !options.includes(value)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 })

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({ left: rect.left, top: rect.bottom + 2, width: rect.width })
    }
  }, [open])

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      <div
        className={`flex items-center gap-1 w-full bg-[var(--background)] border rounded-md px-2 py-1 text-[11px] outline-none transition ${disabled
          ? 'border-[var(--border)] opacity-40 cursor-not-allowed'
          : 'border-[var(--sidebar-primary)] shadow-[0_0_0_2px_color-mix(in_oklch,var(--sidebar-primary),transparent_82%)] cursor-pointer'
          }`}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className="flex-1 truncate text-left">
          {value || <span className="text-[var(--muted-foreground)]">{placeholder}</span>}
        </span>
        <ChevronDown size={12} className={`shrink-0 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div 
            className="fixed z-[9999] rounded-md border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden"
            style={{ left: coords.left, top: coords.top, width: coords.width }}
          >
            <input
              autoFocus
              className="w-full px-2 py-1.5 text-[11px] border-b border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] outline-none"
              placeholder="Wpisz własną..."
              value={isCustom ? value : ''}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setOpen(false) }}
            />
            <div className="max-h-40 overflow-y-auto custom-scrollbar">
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={`w-full text-left px-2 py-1.5 text-[11px] hover:bg-[var(--sidebar-primary)]/10 transition-colors ${value === opt ? 'font-bold text-[var(--sidebar-primary)]' : 'text-[var(--foreground)]'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/** Percentage progress bar for a milestone */
function PercentBar({ total, count }: { total: number; count: number }) {
  const isOk = Math.abs(total - 100) < 0.01
  const isOver = total > 100
  const color = isOk ? 'bg-emerald-500' : isOver ? 'bg-rose-500' : 'bg-amber-500'
  const textColor = isOk ? 'text-emerald-600 dark:text-emerald-400' : isOver ? 'text-rose-500' : 'text-amber-600 dark:text-amber-400'
  const pct = Math.min(total, 100)

  if (count === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-1">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums w-9 text-right ${textColor}`}>
        {total.toFixed(0)}%
      </span>
      {isOk && <Check size={10} className="text-emerald-500 shrink-0" />}
      {!isOk && <AlertTriangle size={10} className={`shrink-0 ${textColor}`} />}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WorksTabProps = {
  projectId: string
  milestones: ApiMilestone[]
  formatBudget: (val: number, currency?: string) => string
  canEditProject: boolean
}

type EditRow = {
  id: string           // work type id (or 'new-{uuid}' for new rows)
  milestoneId: string
  departmentId: string
  name: string
  unit: string
  percentage: string
  plannedStart: string
  plannedEnd: string
  totalQuantity: string
  isNew: boolean
  markedForDelete?: boolean
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorksTab({ projectId, milestones, canEditProject }: WorksTabProps) {
  const queryClient = useQueryClient()

  const [isEditMode, setIsEditMode] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: projectDepts = [] } = useQuery({
    queryKey: ['project-departments', projectId],
    queryFn: () => fetchProjectDepartments(projectId),
    enabled: !!projectId,
  })

  const { data: foremenAssignments = [] } = useQuery({
    queryKey: ['foremen-assignments', projectId],
    queryFn: () => fetchForemenAssignments(projectId),
    enabled: !!projectId,
  })

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types', projectId],
    queryFn: () => fetchWorkTypes(projectId),
    enabled: !!projectId,
  })

  // ── Derived data ─────────────────────────────────────────────────────────

  // Dept options for select: only project departments with foreman name
  const deptOptions = useMemo(() =>
    projectDepts.map(d => {
      const foreman = foremenAssignments.find(f => f.departmentId === d.departmentId)
      return {
        id: d.departmentId,
        name: d.departmentName,
        label: foreman ? `${d.departmentName} (${foreman.foremanName})` : d.departmentName,
      }
    }),
    [projectDepts, foremenAssignments]
  )

  // Work names per dept from existing work types (for combo-box suggestions)
  const workNamesByDept = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const wt of workTypes) {
      const existing = map.get(wt.departmentId) ?? []
      if (!existing.includes(wt.name)) {
        map.set(wt.departmentId, [...existing, wt.name])
      }
    }
    return map
  }, [workTypes])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (p: { milestoneId: string; payload: CreateWorkTypePayload }) =>
      createWorkType(projectId, { ...p.payload, milestoneId: p.milestoneId }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; payload: Partial<CreateWorkTypePayload> }) =>
      updateWorkType(p.id, p.payload),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteWorkType(id),
  })

  // ── Edit mode helpers ─────────────────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    // Populate edit rows from existing work types
    const rows: EditRow[] = workTypes.map(wt => ({
      id: wt.id,
      milestoneId: wt.milestoneId ?? '',
      departmentId: String(wt.departmentId),
      name: wt.name,
      unit: wt.unit ?? '',
      percentage: wt.percentage !== null ? String(wt.percentage) : '100',
      plannedStart: wt.plannedStart ?? '',
      plannedEnd: wt.plannedEnd ?? '',
      totalQuantity: wt.totalQuantity ? String(wt.totalQuantity) : '',
      isNew: false,
    }))
    setEditRows(rows)
    setSaveError('')
    setIsEditMode(true)
  }, [workTypes])

  // Validation: every milestone must sum to 100 (or have 0 rows)
  const milestonePercentSums = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of editRows) {
      if (row.markedForDelete) continue
      const milId = row.milestoneId
      const pct = parseFloat(row.percentage) || 0
      map.set(milId, (map.get(milId) ?? 0) + pct)
    }
    return map
  }, [editRows])

  const invalidMilestones = useMemo(() => {
    const invalid: string[] = []
    for (const milestone of milestones) {
      const rows = editRows.filter(r => r.milestoneId === milestone.id && !r.markedForDelete)
      if (rows.length === 0) continue
      const sum = milestonePercentSums.get(milestone.id) ?? 0
      if (Math.abs(sum - 100) > 0.01) {
        invalid.push(milestone.id)
      }
    }
    return invalid
  }, [milestones, editRows, milestonePercentSums])

  const canClose = invalidMilestones.length === 0

  const handleSaveAndClose = async () => {
    if (!canClose) {
      setSaveError('Nie można zapisać — suma procentów musi wynosić 100% dla każdego etapu.')
      return
    }
    setIsSaving(true)
    setSaveError('')
    try {
      const promises: Promise<unknown>[] = []

      for (const row of editRows) {
        if (row.markedForDelete && !row.isNew) {
          promises.push(deleteMut.mutateAsync(row.id))
          continue
        }
        if (row.markedForDelete && row.isNew) continue

        const payload: Partial<CreateWorkTypePayload> = {
          departmentId: Number(row.departmentId),
          name: row.name.trim(),
          unit: row.unit || undefined,
          percentage: parseFloat(row.percentage) || 0,
          totalQuantity: row.totalQuantity ? Number(row.totalQuantity) : undefined,
          plannedStart: row.plannedStart || undefined,
          plannedEnd: row.plannedEnd || undefined,
        }

        if (row.isNew) {
          promises.push(createMut.mutateAsync({ milestoneId: row.milestoneId, payload: payload as CreateWorkTypePayload }))
        } else {
          promises.push(updateMut.mutateAsync({ id: row.id, payload }))
        }
      }

      await Promise.all(promises)
      await queryClient.invalidateQueries({ queryKey: ['work-types', projectId] })
      setIsEditMode(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Błąd zapisu')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setSaveError('')
  }

  // Update a single field in an edit row
  const updateEditRow = useCallback((id: string, field: keyof EditRow, value: string | boolean) => {
    setEditRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  // Add a new sub-row for a milestone
  const addSubRow = useCallback((milestoneId: string) => {
    const newRow: EditRow = {
      id: `new-${crypto.randomUUID()}`,
      milestoneId,
      departmentId: '',
      name: '',
      unit: '',
      percentage: '0',
      plannedStart: '',
      plannedEnd: '',
      totalQuantity: '',
      isNew: true,
    }
    setEditRows(rows => {
      // Insert after last row of that milestone
      const lastIdx = rows.map((r, i) => r.milestoneId === milestoneId ? i : -1).filter(i => i >= 0).pop() ?? -1
      const next = [...rows]
      next.splice(lastIdx + 1, 0, newRow)
      return next
    })
  }, [])

  // ── Table structure ───────────────────────────────────────────────────────

  // Group: for each milestone, collect rows (read or edit)
  type MilestoneGroup = {
    milestone: ApiMilestone
    rows: Array<{ wt: ApiWorkType } | { editRow: EditRow }>
    percentSum: number
    isInvalid: boolean
  }

  const milestoneGroups: MilestoneGroup[] = useMemo(() => {
    if (isEditMode) {
      return milestones.map(milestone => {
        const rows = editRows
          .filter(r => r.milestoneId === milestone.id)
          .map(r => ({ editRow: r }))
        const sum = milestonePercentSums.get(milestone.id) ?? 0
        const isInvalid = rows.filter(r => !('editRow' in r && r.editRow.markedForDelete)).length > 0
          && Math.abs(sum - 100) > 0.01
        return { milestone, rows, percentSum: sum, isInvalid }
      })
    } else {
      return milestones.map(milestone => {
        const mWts = workTypes.filter(wt => wt.milestoneId === milestone.id)
        const sum = mWts.reduce((acc, wt) => acc + (wt.percentage ?? 100), 0)
        return {
          milestone,
          rows: mWts.map(wt => ({ wt })),
          percentSum: sum,
          isInvalid: false,
        }
      })
    }
  }, [isEditMode, milestones, editRows, workTypes, milestonePercentSums])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-3 animate-tab-content">
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 md:p-4 shadow-sm space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <div className="p-1.5 rounded-md bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
              <Layers size={16} />
            </div>
            <span>Rodzaje robót / zakres prac</span>
          </div>

          {canEditProject && (
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  {/* Save button — disabled if any milestone % ≠ 100 */}
                  <Button
                    onClick={handleSaveAndClose}
                    disabled={isSaving || !canClose}
                    title={!canClose ? 'Suma % musi wynosić 100% dla każdego etapu' : undefined}
                    className={`text-[11px] h-8 px-4 rounded-xl flex items-center gap-1.5 font-bold shadow-sm transition ${canClose
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_14px_color-mix(in_oklch,#10b981,transparent_55%)]'
                      : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                      }`}
                  >
                    {isSaving
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Check size={13} />
                    }
                    <span>Zapisz</span>
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="text-[11px] h-8 px-4 rounded-xl flex items-center gap-1.5 font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                  >
                    <X size={13} />
                    <span>Anuluj</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={enterEditMode}
                  className="text-[11px] h-8 px-4 rounded-xl flex items-center gap-1.5 font-bold shadow-sm bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
                >
                  <Edit2 size={13} />
                  <span>Dodaj / Edytuj</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error banner */}
        {saveError && (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-500 flex items-center gap-2">
            <AlertTriangle size={13} />
            {saveError}
          </div>
        )}

        {/* Global invalid warning when in edit mode */}
        {isEditMode && invalidMilestones.length > 0 && !saveError && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertTriangle size={13} />
            {invalidMilestones.length === 1
              ? 'Jeden etap wymaga uzupełnienia do 100%'
              : `${invalidMilestones.length} etapów wymaga uzupełnienia do 100%`}
            {' '}— nie można zapisać.
          </div>
        )}

        {/* Table */}
        <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
          <div className="max-h-[600px] overflow-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 border-b-[3px] border-zinc-300 dark:border-zinc-700 bg-[var(--background)]/95 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2 text-center border-r border-[var(--border)] whitespace-nowrap w-14">Typ</th>
                  <th className="px-3 py-2 border-r border-[var(--border)] w-[160px]">Etap</th>
                  <th className="px-2 py-2 border-r border-[var(--border)] min-w-[160px]">Rodzaj robot</th>
                  <th className="px-2 py-2 text-center border-r border-[var(--border)] w-24">
                    <div className="flex items-center justify-center gap-1">
                      <span>%</span>
                    </div>
                  </th>
                  <th className="px-2 py-2 border-r border-[var(--border)] whitespace-nowrap w-28">Start</th>
                  <th className="px-2 py-2 border-r border-[var(--border)] whitespace-nowrap w-28">Koniec</th>
                  <th className="px-2 py-2 text-center border-r border-[var(--border)] w-20">Jm.</th>
                  <th className="px-2 py-2 text-right border-r border-[var(--border)] whitespace-nowrap w-20">Ilość</th>
                  <th className="px-3 py-2 min-w-[140px]">Dział</th>
                </tr>
              </thead>
              {workTypesLoading ? (
                <tbody className="font-medium">
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-[var(--muted-foreground)]">
                      <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                      Wczytywanie robót...
                    </td>
                  </tr>
                </tbody>
              ) : milestoneGroups.length === 0 ? (
                <tbody className="font-medium">
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-[var(--muted-foreground)] italic text-[11px]">
                      Brak etapów. Przejdź do zakładki „Kamienie Milowe", aby stworzyć strukturę projektu.
                    </td>
                  </tr>
                </tbody>
              ) : (
                milestoneGroups.map(group => {
                  const { milestone, rows, percentSum, isInvalid } = group
                  const visibleRows = isEditMode
                    ? rows.filter(r => !('editRow' in r && r.editRow.markedForDelete))
                    : rows
                  const rowSpan = Math.max(1, visibleRows.length) + (isEditMode ? 1 : 0) // +1 for progress bar row only in edit mode

                  return (
                    <tbody key={milestone.id} className="font-medium border-b-[3px] border-zinc-200 dark:border-zinc-800 last:border-b-0">
                      <MilestoneRows
                        key={milestone.id}
                        milestone={milestone}
                        rows={visibleRows}
                        allEditRows={editRows}
                        rowSpan={rowSpan}
                        percentSum={percentSum}
                        isInvalid={isInvalid}
                        isEditMode={isEditMode}
                        deptOptions={deptOptions}
                        workNamesByDept={workNamesByDept}
                        updateEditRow={updateEditRow}
                        addSubRow={addSubRow}
                        canEdit={canEditProject}
                      />
                    </tbody>
                  )
                })
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MilestoneRows ────────────────────────────────────────────────────────────

type DeptOption = { id: number; name: string; label: string }

type MilestoneRowsProps = {
  milestone: ApiMilestone
  rows: Array<{ wt: ApiWorkType } | { editRow: EditRow }>
  allEditRows: EditRow[]
  rowSpan: number
  percentSum: number
  isInvalid: boolean
  isEditMode: boolean
  deptOptions: DeptOption[]
  workNamesByDept: Map<number, string[]>
  updateEditRow: (id: string, field: keyof EditRow, value: string | boolean) => void
  addSubRow: (milestoneId: string) => void
  canEdit: boolean
}

function MilestoneRows({
  milestone,
  rows,
  rowSpan,
  percentSum,
  isInvalid,
  isEditMode,
  deptOptions,
  workNamesByDept,
  updateEditRow,
  addSubRow,
  canEdit,
}: MilestoneRowsProps) {
  const isKM = milestone.type === 'KM'

  const milestoneCell = (span: number) => (
    <td
      rowSpan={span}
      className="px-2 py-2 text-center border-r border-[var(--border)] align-top pt-2.5 font-bold"
    >
      {isKM ? (
        <span className="inline-block rounded-md px-1.5 py-0.5 text-[11px] shadow-2xs font-extrabold bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
          {milestone.milestoneNo}
        </span>
      ) : (
        <span className="inline-block rounded-md px-1.5 py-0.5 text-[11px] shadow-2xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
          {milestone.milestoneNo}
        </span>
      )}
    </td>
  )

  const descriptionCell = (span: number) => (
    <td
      rowSpan={span}
      className="px-3 py-2 text-[var(--foreground)] font-normal leading-relaxed border-r border-[var(--border)] text-[11px] align-top pt-2.5 max-w-[160px]"
    >
      {milestone.description}
    </td>
  )

  if (rows.length === 0) {
    // No rows for this milestone
    return (
      <>
        <tr className="bg-[var(--muted)]/10 align-middle border-b border-[var(--border)] last:border-b-0">
          {milestoneCell(isEditMode ? 2 : 1)}
          {descriptionCell(isEditMode ? 2 : 1)}
          <td colSpan={7} className="px-3 py-2 text-[var(--muted-foreground)] italic text-[10px] border-r border-[var(--border)]">
            {isEditMode ? (
              <span className="opacity-60">Brak robót — dodaj klikając +</span>
            ) : 'Brak robót'}
          </td>
        </tr>
        {isEditMode && canEdit && (
          <tr className="bg-[var(--sidebar-primary)]/3 border-b border-[var(--border)] last:border-b-0">
            <td colSpan={7} className="px-2 py-1.5">
              <AddRowButton milestoneId={milestone.id} addSubRow={addSubRow} />
            </td>
          </tr>
        )}
      </>
    )
  }

  return (
    <>
      {rows.map((row, idx) => {
        const isFirst = idx === 0
        const isLast = idx === rows.length - 1

        if ('wt' in row) {
          // Read-only row
          const { wt } = row
          const pct = wt.percentage !== null ? wt.percentage : 100
          return (
            <tr
              key={wt.id}
              className="group hover:bg-[var(--muted)]/20 transition-colors align-middle border-b border-[var(--border)] last:border-b-0"
            >
              {isFirst && milestoneCell(rowSpan)}
              {isFirst && descriptionCell(rowSpan)}
              <td className="px-3 py-2 font-bold text-[var(--sidebar-primary)] border-r border-[var(--border)] whitespace-nowrap">
                {wt.name}
              </td>
              <td className="px-2 py-2 text-center border-r border-[var(--border)]">
                <span className="inline-block rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-bold border border-[var(--border)] tabular-nums">
                  {pct}%
                </span>
              </td>
              <td className="px-2 py-2 border-r border-[var(--border)] whitespace-nowrap text-[11px]">{formatDateLocal(wt.plannedStart)}</td>
              <td className="px-2 py-2 border-r border-[var(--border)] whitespace-nowrap text-[11px]">{formatDateLocal(wt.plannedEnd)}</td>
              <td className="px-2 py-2 text-center border-r border-[var(--border)] text-[var(--muted-foreground)] text-[11px]">{wt.unit || '-'}</td>
              <td className="px-2 py-2 text-right border-r border-[var(--border)] font-bold text-[11px]">
                {wt.totalQuantity ? Number(wt.totalQuantity).toFixed(2) : '-'}
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center rounded-md bg-[var(--sidebar-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--sidebar-primary)] whitespace-nowrap">
                  {deptOptions.find(d => d.id === wt.departmentId)?.label || wt.departmentName}
                </span>
              </td>
              {isLast && (
                <></>
              )}
            </tr>
          )
        } else {
          // Edit row
          const { editRow } = row
          const deptId = editRow.departmentId ? Number(editRow.departmentId) : null
          const workSuggestions = deptId ? (workNamesByDept.get(deptId) ?? []) : []
          const isRowInvalid = isInvalid

          return (
            <tr
              key={editRow.id}
              className={`align-middle transition-colors border-b border-[var(--border)] last:border-b-0 ${isRowInvalid ? 'bg-amber-500/5' : 'bg-[var(--sidebar-primary)]/5'
                }`}
            >
              {isFirst && milestoneCell(rowSpan)}
              {isFirst && descriptionCell(rowSpan)}

              {/* Rodzaj roboty */}
              <td className="px-1.5 py-1 border-r border-[var(--border)] relative">
                <input
                  type="text"
                  list={`suggestions-${editRow.id}`}
                  className={`w-full bg-[var(--background)] border rounded-md px-2 py-1 text-[11px] outline-none transition ${!editRow.departmentId
                    ? 'border-[var(--border)] opacity-40 cursor-not-allowed'
                    : 'border-[var(--sidebar-primary)] shadow-[0_0_0_2px_color-mix(in_oklch,var(--sidebar-primary),transparent_82%)]'
                    }`}
                  placeholder="Rodzaj roboty..."
                  value={editRow.name}
                  onChange={e => updateEditRow(editRow.id, 'name', e.target.value)}
                  disabled={!editRow.departmentId}
                />
                {workSuggestions.length > 0 && (
                  <datalist id={`suggestions-${editRow.id}`}>
                    {workSuggestions.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                )}
              </td>

              {/* % */}
              <td className="px-1.5 py-1 border-r border-[var(--border)]">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className={`w-full text-center bg-[var(--background)] border rounded-md px-1 py-1 text-[11px] outline-none tabular-nums font-bold transition ${isRowInvalid
                    ? 'border-amber-400 focus:border-amber-500'
                    : 'border-[var(--sidebar-primary)] shadow-[0_0_0_1px_color-mix(in_oklch,var(--sidebar-primary),transparent_85%)]'
                    }`}
                  placeholder="%"
                  value={editRow.percentage}
                  onChange={e => updateEditRow(editRow.id, 'percentage', e.target.value)}
                />
              </td>

              {/* Start */}
              <td className="px-1.5 py-1 border-r border-[var(--border)]">
                <input
                  type="date"
                  className="w-full bg-[var(--background)] border border-[var(--border)] focus:border-[var(--sidebar-primary)] rounded-md px-1 py-1 text-[11px] outline-none"
                  value={editRow.plannedStart}
                  onChange={e => updateEditRow(editRow.id, 'plannedStart', e.target.value)}
                />
              </td>

              {/* Koniec */}
              <td className="px-1.5 py-1 border-r border-[var(--border)]">
                <input
                  type="date"
                  className="w-full bg-[var(--background)] border border-[var(--border)] focus:border-[var(--sidebar-primary)] rounded-md px-1 py-1 text-[11px] outline-none"
                  value={editRow.plannedEnd}
                  onChange={e => updateEditRow(editRow.id, 'plannedEnd', e.target.value)}
                />
              </td>

              {/* Jm — combo */}
              <td className="px-1.5 py-1 border-r border-[var(--border)]">
                <ComboBox
                  value={editRow.unit}
                  onChange={v => updateEditRow(editRow.id, 'unit', v)}
                  options={UNIT_OPTIONS}
                  placeholder="Jm..."
                  className="min-w-[70px]"
                />
              </td>

              {/* Ilość */}
              <td className="px-1.5 py-1 border-r border-[var(--border)]">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full text-right bg-[var(--background)] border border-[var(--border)] focus:border-[var(--sidebar-primary)] rounded-md px-1 py-1 text-[11px] outline-none"
                  placeholder="0"
                  value={editRow.totalQuantity}
                  onChange={e => updateEditRow(editRow.id, 'totalQuantity', e.target.value)}
                />
              </td>

              {/* Dział */}
              <td className="px-1.5 py-1">
                <div className="flex items-center gap-1">
                  <select
                    className="flex-1 bg-[var(--background)] border border-[var(--sidebar-primary)] rounded-md px-1.5 py-1 text-[11px] outline-none cursor-pointer shadow-[0_0_0_1px_color-mix(in_oklch,var(--sidebar-primary),transparent_85%)]"
                    value={editRow.departmentId}
                    onChange={e => {
                      updateEditRow(editRow.id, 'departmentId', e.target.value)
                      // Reset name if dept changed
                      if (e.target.value !== editRow.departmentId) {
                        updateEditRow(editRow.id, 'name', '')
                      }
                    }}
                  >
                    <option value="">Wybierz dział...</option>
                    {deptOptions.map(d => (
                      <option key={d.id} value={String(d.id)}>{d.label}</option>
                    ))}
                  </select>
                  {/* Delete this sub-row */}
                  <button
                    type="button"
                    onClick={() => updateEditRow(editRow.id, 'markedForDelete', true)}
                    className="p-1 rounded-md text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
                    title="Usuń tę robotę"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </td>
            </tr>
          )
        }
      })}

      {/* Progress / add-row bar — always last row for this milestone group, BUT only in Edit Mode */}
      {isEditMode && (
        <tr className="bg-[var(--sidebar-primary)]/3 border-t border-[var(--border)]/40">
          {/* Colspan 7 = all work columns (milestone + description are already rowSpan'd from first row) */}
          <td colSpan={7} className="px-2 py-1.5">
            <div className="flex items-center gap-3">
              {canEdit && (
                <AddRowButton milestoneId={milestone.id} addSubRow={addSubRow} />
              )}
              <div className="flex-1">
                <PercentBar total={percentSum} count={rows.length} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function AddRowButton({ milestoneId, addSubRow }: { milestoneId: string; addSubRow: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => addSubRow(milestoneId)}
      className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-[var(--sidebar-primary)] bg-[var(--sidebar-primary)]/10 hover:bg-[var(--sidebar-primary)]/20 transition-colors border border-[var(--sidebar-primary)]/20"
    >
      <Plus size={11} />
      Dodaj robotę
    </button>
  )
}
