import { useEffect, useState } from 'react'
import { Plus, Trash2, X, Loader2, Calendar, Milestone, Wrench, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { saveMilestones } from '@/features/projects/api'
import type { ApiMilestone, CreateMilestonePayload } from '@/features/projects/types'
import { formatAmount } from '@/lib/format'

type MilestoneFormDrawerProps = {
  isOpen: boolean
  onClose: () => void
  milestones: ApiMilestone[]
  editingMilestoneId: string | null
  setEditingMilestoneId: (id: string | null) => void
  milestoneForm: CreateMilestonePayload
  milestoneError: string
  setMilestoneError: (err: string) => void
  createMilestoneMutation: UseMutationResult<ApiMilestone, Error, CreateMilestonePayload, unknown>
  createMilestonesBatchMutation: UseMutationResult<void, Error, CreateMilestonePayload[], unknown>
  updateMilestoneMutation: UseMutationResult<ApiMilestone, Error, { id: string; payload: Partial<CreateMilestonePayload> }, unknown>
  updateMilestonesBatchMutation: UseMutationResult<void, Error, { id: string; payload: Partial<CreateMilestonePayload> }[], unknown>
  deleteMilestoneMutation: UseMutationResult<void, Error, string, unknown>
  contractNetValue?: number
  isBulkEdit?: boolean
  /** Project whose milestones are saved (all at once) */
  projectId?: string
}

type MilestoneType = 'KM' | 'roboty_dodatkowe'

type FormRow = {
  id?: string
  type: MilestoneType
  milestoneNo: string
  description: string
  percentage: number
  invoicingPercentage?: number | null
  netAmount: number
  isNew?: boolean
  /** Stable React key for rows that have no id yet */
  uid?: string
}

/** KM rows first, then RD; each in natural number order (KM 2 before KM 10) */
function sortRows(list: FormRow[]): FormRow[] {
  return [...list].sort(
    (a, b) =>
      Number(a.type === 'roboty_dodatkowe') - Number(b.type === 'roboty_dodatkowe') ||
      a.milestoneNo.localeCompare(b.milestoneNo, 'pl', { numeric: true }),
  )
}

/** Next free number for a section, e.g. "KM 8" after KM 1–7 */
function nextNumber(list: FormRow[], type: MilestoneType, prefix: 'KM' | 'RD'): string {
  const max = list
    .filter((r) => r.type === type)
    .reduce((m, r) => Math.max(m, Math.floor(Number(r.milestoneNo.replace(/^(KM|RD)\s*/i, '')) || 0)), 0)
  return `${prefix} ${max + 1}`
}

export function MilestoneFormDrawer({
  isOpen,
  onClose,
  milestones,
  setEditingMilestoneId,
  milestoneError,
  setMilestoneError,
  createMilestoneMutation,
  createMilestonesBatchMutation,
  updateMilestoneMutation,
  updateMilestonesBatchMutation,
  deleteMilestoneMutation,
  contractNetValue = 0,
  projectId,
}: MilestoneFormDrawerProps) {
  const queryClient = useQueryClient()
  // The whole list is saved in one request: one transaction and one batch to the sheet
  const saveAll = useMutation({
    mutationFn: (items: Parameters<typeof saveMilestones>[1]) => saveMilestones(projectId!, items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setMilestoneError('')
    },
  })
  const [rows, setRows] = useState<FormRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [rowToDelete, setRowToDelete] = useState<number | null>(null)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setRows(sortRows(
        milestones.map((m) => ({
          id: m.id,
          type: m.type as MilestoneType,
          milestoneNo: m.milestoneNo,
          description: m.description,
          percentage: m.percentage || 0,
          invoicingPercentage: m.invoicingPercentage,
          netAmount: m.netAmount || 0,
          isNew: false,
        })),
      ))
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  const handleClose = () => {
    setMilestoneError('')
    setEditingMilestoneId(null)
    onClose()
  }

  const handleUpdateRow = <K extends keyof FormRow>(index: number, key: K, value: FormRow[K]) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  const confirmDeleteRow = () => {
    if (rowToDelete === null) return
    // A removed row is just not sent on save; the server soft-deletes it
    setRows((prev) => prev.filter((_, i) => i !== rowToDelete))
    setRowToDelete(null)
  }

  const handleAddKM = () => {
    setRows((prev) => [
      ...prev,
      {
        type: 'KM',
        milestoneNo: nextNumber(prev, 'KM', 'KM'),
        uid: crypto.randomUUID(),
        description: '',
        percentage: 0,
        invoicingPercentage: 100,
        netAmount: 0,
        isNew: true,
      },
    ])
  }

  const handleAddRD = () => {
    setRows((prev) => [
      ...prev,
      {
        type: 'roboty_dodatkowe',
        milestoneNo: nextNumber(prev, 'roboty_dodatkowe', 'RD'),
        uid: crypto.randomUUID(),
        description: '',
        percentage: 0,
        netAmount: 0,
        isNew: true,
      },
    ])
  }

  const kmNetAmount = (pct: number) => (contractNetValue > 0 ? Math.round((contractNetValue * pct) / 100 * 100) / 100 : 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMilestoneError('')

    // Validate
    let kmPctSum = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const numberPart = row.milestoneNo.replace(/^(KM|RD)\s*/i, '').trim()
      if (!numberPart) return setMilestoneError(`Wiersz ${i + 1}: Numer jest wymagany.`)
      if (!row.description.trim()) return setMilestoneError(`Wiersz ${i + 1}: Opis jest wymagany.`)

      if (row.type === 'KM') {
        if (row.percentage <= 0 || row.percentage > 100) {
          return setMilestoneError(`Wiersz ${row.milestoneNo}: Udział % musi być z przedziału 0.01% - 100%.`)
        }
        kmPctSum += row.percentage
      } else {
        if (row.netAmount <= 0) {
          return setMilestoneError(`Wiersz ${row.milestoneNo}: Kwota netto musi być większa od 0.`)
        }
      }
    }

    if (kmPctSum > 0 && Math.abs(kmPctSum - 100) > 0.01) {
      return setMilestoneError(
        kmPctSum > 100
          ? `Suma procentów wszystkich KM (${kmPctSum.toFixed(2)}%) przekracza 100%.`
          : `Suma procentów wszystkich KM musi wynosić dokładnie 100%. Brakuje ${(100 - kmPctSum).toFixed(2)}%.`
      )
    }

    setIsSaving(true)
    try {
      // One request for the whole list: removed rows are simply not sent
      await saveAll.mutateAsync(
        rows.map((row) => ({
          ...(row.id && !row.isNew ? { id: row.id } : {}),
          milestoneNo: row.milestoneNo.trim(),
          description: row.description.trim(),
          type: row.type,
          ...(row.type === 'KM'
            ? { percentage: Number(row.percentage), invoicingPercentage: row.invoicingPercentage != null ? Number(row.invoicingPercentage) : null }
            : { netAmount: Number(row.netAmount) }),
        })),
      )

      handleClose()
    } catch (err: unknown) {
      setMilestoneError(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setIsSaving(false)
    }
  }

  const isPending = createMilestoneMutation.isPending || createMilestonesBatchMutation.isPending || updateMilestoneMutation.isPending || updateMilestonesBatchMutation.isPending || deleteMilestoneMutation.isPending || saveAll.isPending || isSaving

  const inputCls =
    'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 disabled:opacity-50 disabled:cursor-not-allowed'
  const inputLockedCls =
    'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 text-xs text-[var(--muted-foreground)] cursor-not-allowed select-none flex items-center whitespace-nowrap overflow-hidden'

  const currentKMPct = rows.filter((r) => r.type === 'KM').reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out" onClick={handleClose} />}

      <aside
        className={[
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out w-full max-w-[700px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <Calendar size={18} className="text-[var(--sidebar-primary)]" />
              Zarządzaj etapami rozliczeniowymi
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Dodawaj i edytuj Kamienie Milowe oraz Roboty dodatkowe.</p>
          </div>
          <Button type="button" variant="outline" size="icon-sm" onClick={handleClose} className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10">
            <X size={15} />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-5 space-y-5">
          {milestoneError && <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">{milestoneError}</div>}

          {rows.some(r => r.type === 'KM') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">Suma % KM:</span>
                <span className={`font-extrabold ${Math.abs(currentKMPct - 100) <= 0.01 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentKMPct.toFixed(2)}% / 100%
                </span>
              </div>
              <div className="relative h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full transition-all duration-300 ${Math.abs(currentKMPct - 100) <= 0.01 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(currentKMPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kamienie Milowe (KM) */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Milestone size={14} className="text-[var(--sidebar-primary)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--sidebar-primary)]">Kamienie Milowe (KM)</span>
              </div>

              {rows.filter((r) => r.type === 'KM').length === 0 && <p className="text-xs text-[var(--muted-foreground)] italic mb-4">Brak kamieni milowych.</p>}

              {(() => {
                const firstKmIndex = rows.findIndex((r) => r.type === 'KM')
                return rows.map((row, index) => {
                  if (row.type !== 'KM') return null
                  const computedNet = kmNetAmount(row.percentage)
                  const isFirstKm = index === firstKmIndex
                  return (
                    <div key={row.id || row.uid || `new-${index}`} className="relative py-2 border-b border-[var(--border)] last:border-0 group">
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        <div className="col-span-2 space-y-1">
                          {isFirstKm && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Nr</label>}
                          <div className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--sidebar-primary)] focus-within:ring-2 focus-within:ring-[var(--sidebar-primary)]/15 transition duration-150 ease-in-out overflow-hidden">
                            <span className="flex shrink-0 items-center justify-center bg-[var(--sidebar-primary)]/10 px-2.5 text-[11px] font-extrabold text-[var(--sidebar-primary)] border-r border-[var(--border)] select-none">
                              KM
                            </span>
                            <input
                              value={row.milestoneNo.replace(/^KM\s*/i, '')}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '')
                                handleUpdateRow(index, 'milestoneNo', `KM ${val}`)
                              }}
                              onBlur={() => setRows((prev) => sortRows(prev))}
                              placeholder="1"
                              required
                              className="flex-1 w-full min-w-0 bg-transparent px-2.5 text-xs outline-none placeholder:text-zinc-500/70"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          {isFirstKm && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Udział %</label>}
                          <input type="number" min="0.01" max="100" step="0.01" value={row.percentage || ''} onChange={(e) => handleUpdateRow(index, 'percentage', e.target.value ? Number(e.target.value) : 0)} placeholder="10.0" required className={inputCls} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          {isFirstKm && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Kwota (auto)</label>}
                          <div className={inputLockedCls}>{computedNet > 0 ? formatAmount(computedNet) : '—'}</div>
                        </div>
                        <div className="col-span-3 space-y-1">
                          {isFirstKm && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Opis etapu</label>}
                          <input value={row.description} onChange={(e) => handleUpdateRow(index, 'description', e.target.value)} placeholder="Opis..." required className={inputCls} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          {isFirstKm && <label className="block whitespace-nowrap text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">% fakturowania</label>}
                          <input type="number" min="0" max="100" step="0.01" value={row.invoicingPercentage ?? ''} onChange={(e) => handleUpdateRow(index, 'invoicingPercentage', e.target.value ? Number(e.target.value) : null)} placeholder="np. 50" className={inputCls} />
                        </div>
                        <div className="col-span-1 pb-1 flex justify-end">
                          {index !== firstKmIndex && (
                            <button type="button" onClick={() => setRowToDelete(index)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Usuń wiersz">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            {/* Roboty dodatkowe (RD) */}
            <div className="flex flex-col mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Wrench size={14} className="text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Roboty dodatkowe (RD)</span>
              </div>

              {rows.filter((r) => r.type === 'roboty_dodatkowe').length === 0 && <p className="text-xs text-[var(--muted-foreground)] italic mb-4">Brak robót dodatkowych.</p>}

              {rows.map((row, index) => {
                if (row.type !== 'roboty_dodatkowe') return null
                const isFirstRd = index === rows.findIndex((r) => r.type === 'roboty_dodatkowe')
                return (
                  <div key={row.id || row.uid || `new-${index}`} className="relative py-2 border-b border-[var(--border)] last:border-0 group">
                    <div className="grid grid-cols-12 gap-2.5 items-end">
                      <div className="col-span-2 space-y-1">
                        {isFirstRd && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Nr</label>}
                        <div className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/15 transition duration-150 ease-in-out overflow-hidden">
                          <span className="flex shrink-0 items-center justify-center bg-amber-500/10 px-2.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400 border-r border-[var(--border)] select-none">
                            RD
                          </span>
                          <input
                            value={row.milestoneNo.replace(/^RD\s*/i, '')}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '')
                              handleUpdateRow(index, 'milestoneNo', `RD ${val}`)
                            }}
                            onBlur={() => setRows((prev) => sortRows(prev))}
                            placeholder="1"
                            required
                            className="flex-1 w-full min-w-0 bg-transparent px-2.5 text-xs outline-none placeholder:text-zinc-500/70"
                          />
                        </div>
                      </div>
                      <div className="col-span-3 space-y-1">
                        {isFirstRd && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Kwota netto</label>}
                        <input type="number" min="0.01" step="0.01" value={row.netAmount || ''} onChange={(e) => handleUpdateRow(index, 'netAmount', e.target.value ? Number(e.target.value) : 0)} placeholder="np. 15000" required className={inputCls} />
                      </div>
                      <div className="col-span-6 space-y-1">
                        {isFirstRd && <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Opis prac</label>}
                        <input value={row.description} onChange={(e) => handleUpdateRow(index, 'description', e.target.value)} placeholder="Opis robót..." required className={inputCls} />
                      </div>
                      <div className="col-span-1 pb-1 flex justify-end">
                        <button type="button" onClick={() => setRowToDelete(index)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Usuń wiersz">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-[var(--border)] mt-4 space-y-4">
              <div className="flex gap-3">
                <Button type="button" onClick={handleAddKM} variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold border-dashed border-[var(--sidebar-primary)]/40 hover:border-[var(--sidebar-primary)] text-[var(--sidebar-primary)] bg-[var(--sidebar-primary)]/[0.02] hover:bg-[var(--sidebar-primary)]/10">
                  <Plus size={14} className="mr-1.5" />
                  Dodaj kolejny wiersz (KM)
                </Button>
                <Button type="button" onClick={handleAddRD} variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold border-dashed border-amber-500/40 hover:border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/[0.02] hover:bg-amber-500/10">
                  <Plus size={14} className="mr-1.5" />
                  Dodaj kolejny wiersz (RD)
                </Button>
              </div>
            </div>
          </form>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl text-xs h-9">
            Anuluj
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || (currentKMPct > 0 && Math.abs(currentKMPct - 100) > 0.01)}
            className="rounded-xl text-xs h-9 text-white bg-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
          >
            {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            Zapisz wszystkie zmiany
          </Button>
        </footer>
      </aside>

      {/* Delete Confirmation Modal */}
      {rowToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setRowToDelete(null)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded-md hover:bg-[var(--muted)]/50"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Potwierdź usunięcie</h3>
              <p className="text-[var(--muted-foreground)] text-sm">
                Czy na pewno chcesz usunąć wybrany etap <span className="font-bold text-[var(--foreground)]">"{rows[rowToDelete]?.milestoneNo}"</span>?
                <br /> {rows[rowToDelete]?.id && !rows[rowToDelete]?.isNew ? 'Ta akcja usunie etap po zapisaniu zmian.' : 'Usuniesz nowo dodany wiersz.'}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setRowToDelete(null)}
                className="flex-1 rounded-xl font-semibold bg-transparent"
              >
                Anuluj
              </Button>
              <Button
                onClick={confirmDeleteRow}
                className="flex-1 rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-semibold shadow-lg shadow-rose-500/20"
              >
                Tak, usuń
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
