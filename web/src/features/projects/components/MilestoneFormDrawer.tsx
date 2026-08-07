import { useState } from 'react'
import { Plus, Trash2, X, Loader2, Calendar, Milestone, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ApiMilestone, CreateMilestonePayload } from '@/features/projects/types'

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
  contractNetValue?: number
  isBulkEdit?: boolean
}

type MilestoneType = 'KM' | 'roboty_dodatkowe'

type FormRow = {
  id?: string
  type: MilestoneType
  milestoneNo: string
  description: string
  percentage: number
  netAmount: number
  isNew?: boolean
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
  contractNetValue = 0,
}: MilestoneFormDrawerProps) {
  const [rows, setRows] = useState<FormRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setRows(
        milestones.map((m) => ({
          id: m.id,
          type: m.type as MilestoneType,
          milestoneNo: m.milestoneNo,
          description: m.description,
          percentage: m.percentage || 0,
          netAmount: m.netAmount || 0,
          isNew: false,
        }))
      )
    }
  }

  const handleClose = () => {
    setMilestoneError('')
    setEditingMilestoneId(null)
    onClose()
  }

  const handleUpdateRow = <K extends keyof FormRow>(index: number, key: K, value: FormRow[K]) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddKM = () => {
    setRows((prev) => [
      ...prev,
      {
        type: 'KM',
        milestoneNo: `KM ${prev.filter((r) => r.type === 'KM').length + 1}`,
        description: '',
        percentage: 0,
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
        milestoneNo: `RD ${prev.filter((r) => r.type === 'roboty_dodatkowe').length + 1}`,
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
      if (!row.milestoneNo.trim()) return setMilestoneError(`Wiersz ${i + 1}: Symbol/Nr jest wymagany.`)
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
      const newKMs: CreateMilestonePayload[] = []
      const newRDs: CreateMilestonePayload[] = []
      
      for (const row of rows) {
        if (row.id && !row.isNew) {
          await new Promise<void>((resolve, reject) => {
            updateMilestoneMutation.mutate(
              {
                id: row.id!,
                payload: {
                  milestoneNo: row.milestoneNo.trim(),
                  description: row.description.trim(),
                  type: row.type,
                  ...(row.type === 'KM' ? { percentage: Number(row.percentage) } : { netAmount: Number(row.netAmount) }),
                },
              },
              { onSuccess: () => resolve(), onError: (err) => reject(err) }
            )
          })
        } else {
          if (row.type === 'KM') {
            newKMs.push({ milestoneNo: row.milestoneNo.trim(), description: row.description.trim(), type: 'KM', percentage: Number(row.percentage) })
          } else {
            newRDs.push({ milestoneNo: row.milestoneNo.trim(), description: row.description.trim(), type: 'roboty_dodatkowe', netAmount: Number(row.netAmount) })
          }
        }
      }

      const allNew = [...newKMs, ...newRDs]
      if (allNew.length > 0) {
        await new Promise<void>((resolve, reject) => {
          createMilestonesBatchMutation.mutate(allNew, { onSuccess: () => resolve(), onError: (err) => reject(err) })
        })
      }
      
      handleClose()
    } catch (err: unknown) {
      setMilestoneError(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setIsSaving(false)
    }
  }

  const isPending = createMilestoneMutation.isPending || createMilestonesBatchMutation.isPending || updateMilestoneMutation.isPending || isSaving

  const inputCls =
    'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 disabled:opacity-50 disabled:cursor-not-allowed'
  const inputLockedCls =
    'h-9 w-full rounded-lg border border-[var(--border)]/60 bg-[var(--muted)]/30 px-2.5 text-xs text-[var(--muted-foreground)] cursor-not-allowed select-none flex items-center'

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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-[var(--background)]/20">
          {milestoneError && <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">{milestoneError}</div>}

          {rows.some(r => r.type === 'KM') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">Suma % KM:</span>
                <span className={`font-extrabold ${Math.abs(currentKMPct - 100) <= 0.01 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentKMPct.toFixed(2)}% / 100%
                </span>
              </div>
              <div className="relative h-1.5 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full transition-all duration-300 ${Math.abs(currentKMPct - 100) <= 0.01 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(currentKMPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kamienie Milowe (KM) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Milestone size={14} className="text-[var(--sidebar-primary)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--sidebar-primary)]">Kamienie Milowe (KM)</span>
              </div>
              
              {rows.filter((r) => r.type === 'KM').length === 0 && <p className="text-xs text-[var(--muted-foreground)] italic">Brak kamieni milowych.</p>}

              {rows.map((row, index) => {
                if (row.type !== 'KM') return null
                const computedNet = kmNetAmount(row.percentage)
                return (
                  <div key={row.id || `new-${index}`} className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-2xs group hover:border-[var(--sidebar-primary)]/30 transition-colors">
                    <div className="grid grid-cols-12 gap-2.5 items-end">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Nr</label>
                        <input value={row.milestoneNo} onChange={(e) => handleUpdateRow(index, 'milestoneNo', e.target.value)} placeholder="KM 1" required className={inputCls} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Udział %</label>
                        <input type="number" min="0.01" max="100" step="0.01" value={row.percentage || ''} onChange={(e) => handleUpdateRow(index, 'percentage', e.target.value ? Number(e.target.value) : 0)} placeholder="10.0" required className={inputCls} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Kwota (auto)</label>
                        <div className={inputLockedCls}>{computedNet > 0 ? computedNet.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) : '—'}</div>
                      </div>
                      <div className="col-span-5 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Opis etapu</label>
                        <input value={row.description} onChange={(e) => handleUpdateRow(index, 'description', e.target.value)} placeholder="Opis..." required className={inputCls} />
                      </div>
                      <div className="col-span-1 pb-1 flex justify-end">
                        {row.isNew && (
                          <button type="button" onClick={() => handleRemoveRow(index)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Usuń nowy wiersz">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Roboty dodatkowe (RD) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 mb-1">
                <Wrench size={14} className="text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Roboty dodatkowe (RD)</span>
              </div>

              {rows.filter((r) => r.type === 'roboty_dodatkowe').length === 0 && <p className="text-xs text-[var(--muted-foreground)] italic">Brak robót dodatkowych.</p>}

              {rows.map((row, index) => {
                if (row.type !== 'roboty_dodatkowe') return null
                return (
                  <div key={row.id || `new-${index}`} className="relative rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-3 shadow-2xs group hover:border-amber-500/40 transition-colors">
                    <div className="grid grid-cols-12 gap-2.5 items-end">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Nr</label>
                        <input value={row.milestoneNo} onChange={(e) => handleUpdateRow(index, 'milestoneNo', e.target.value)} placeholder="RD 1" required className={inputCls} />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Kwota netto</label>
                        <input type="number" min="0.01" step="0.01" value={row.netAmount || ''} onChange={(e) => handleUpdateRow(index, 'netAmount', e.target.value ? Number(e.target.value) : 0)} placeholder="np. 15000" required className={inputCls} />
                      </div>
                      <div className="col-span-6 space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Opis prac</label>
                        <input value={row.description} onChange={(e) => handleUpdateRow(index, 'description', e.target.value)} placeholder="Opis robót..." required className={inputCls} />
                      </div>
                      <div className="col-span-1 pb-1 flex justify-end">
                        {row.isNew && (
                          <button type="button" onClick={() => handleRemoveRow(index)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Usuń nowy wiersz">
                            <Trash2 size={14} />
                          </button>
                        )}
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
    </>
  )
}
