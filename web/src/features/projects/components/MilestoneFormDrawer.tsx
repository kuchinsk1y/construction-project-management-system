import { useState } from 'react'
import { Plus, Trash2, X, Loader2, Calendar } from 'lucide-react'
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
}

export function MilestoneFormDrawer({
  isOpen,
  onClose,
  milestones,
  editingMilestoneId,
  setEditingMilestoneId,
  milestoneForm,
  milestoneError,
  setMilestoneError,
  createMilestoneMutation,
  createMilestonesBatchMutation,
  updateMilestoneMutation,
}: MilestoneFormDrawerProps) {
  // Batch rows state
  const [rows, setRows] = useState<CreateMilestonePayload[]>([])
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [prevEditingId, setPrevEditingId] = useState(editingMilestoneId)

  // Reset rows state on open/editingId change during render to allow smooth slide-in
  if (isOpen !== prevIsOpen || editingMilestoneId !== prevEditingId) {
    setPrevIsOpen(isOpen)
    setPrevEditingId(editingMilestoneId)

    if (isOpen) {
      if (editingMilestoneId) {
        setRows([
          {
            milestoneNo: milestoneForm.milestoneNo,
            description: milestoneForm.description,
            percentage: milestoneForm.percentage,
            invoicingPercentage: milestoneForm.invoicingPercentage ?? undefined,
          },
        ])
      } else {
        setRows([
          {
            milestoneNo: `KM ${milestones.length + 1}`,
            description: '',
            percentage: 0,
            invoicingPercentage: undefined,
          },
        ])
      }
    }
  }

  // Clean up error on close
  const handleClose = () => {
    setMilestoneError('')
    setEditingMilestoneId(null)
    onClose()
  }

  // Add another row in batch mode
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        milestoneNo: `KM ${milestones.length + prev.length + 1}`,
        description: '',
        percentage: 0,
        invoicingPercentage: undefined,
      },
    ])
  }

  // Remove a row in batch mode
  const handleRemoveRow = (index: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Re-index KM symbols for consistency
      return next.map((row, i) => ({
        ...row,
        milestoneNo: `KM ${milestones.length + i + 1}`,
      }))
    })
  }

  // Update field inside a row
  const handleUpdateRow = <K extends keyof CreateMilestonePayload>(
    index: number,
    key: K,
    value: CreateMilestonePayload[K],
  ) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    )
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMilestoneError('')

    // Basic Validation
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const label = rows.length > 1 ? `Wiersz ${i + 1}: ` : ''
      if (!row.milestoneNo.trim()) {
        setMilestoneError(`${label}Symbol (KM) jest wymagany.`)
        return
      }
      if (!row.description.trim()) {
        setMilestoneError(`${label}Opis etapu jest wymagany.`)
        return
      }
      if (row.percentage <= 0 || row.percentage > 100) {
        setMilestoneError(`${label}Udział % must być z przedziału 0.01% - 100%.`)
        return
      }
    }

    // Percentage Sum Validation
    const existingPctSum = milestones
      .filter((m) => m.id !== editingMilestoneId)
      .reduce((sum, m) => sum + (m.percentage || 0), 0)
    const newPctSum = rows.reduce((sum, r) => sum + (r.percentage || 0), 0)
    const totalProposedPct = existingPctSum + newPctSum

    if (totalProposedPct > 100.01) {
      setMilestoneError(
        `Suma procentów wszystkich kamieni milowych (${totalProposedPct.toFixed(
          2,
        )}%) nie może przekraczać 100%. Obecna suma w projekcie: ${existingPctSum.toFixed(
          2,
        )}%.`,
      )
      return
    }

    // Mutate
    if (editingMilestoneId) {
      // Single Update
      const row = rows[0]
      const payload = {
        milestoneNo: row.milestoneNo.trim(),
        description: row.description.trim(),
        percentage: Number(row.percentage),
      }
      updateMilestoneMutation.mutate(
        { id: editingMilestoneId, payload },
        {
          onSuccess: () => handleClose(),
        },
      )
    } else {
      // Single or Batch Creation
      const payloads = rows.map((row) => ({
        milestoneNo: row.milestoneNo.trim(),
        description: row.description.trim(),
        percentage: Number(row.percentage),
      }))

      if (payloads.length === 1) {
        createMilestoneMutation.mutate(payloads[0], {
          onSuccess: () => handleClose(),
        })
      } else {
        createMilestonesBatchMutation.mutate(payloads, {
          onSuccess: () => handleClose(),
        })
      }
    }
  }

  // Pre-calculate sums for preview
  const currentPctSum = milestones
    .filter((m) => m.id !== editingMilestoneId)
    .reduce((sum, m) => sum + (m.percentage || 0), 0)
  const incomingPctSum = rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)
  const projectedPctSum = currentPctSum + incomingPctSum

  const isPending =
    createMilestoneMutation.isPending ||
    createMilestonesBatchMutation.isPending ||
    updateMilestoneMutation.isPending

  return (
    <>
      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
          onClick={handleClose}
        />
      )}

      {/* Slide-over Container */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-[70] flex w-full max-w-[550px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Drawer Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <Calendar size={18} className="text-[var(--sidebar-primary)]" />
              {editingMilestoneId ? 'Edytuj kamień milowy' : 'Zarządzaj etapami'}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {editingMilestoneId
                ? 'Zmień dane wybranego etapu rozliczeniowego'
                : 'Dodaj jeden lub kilka nowych etapów do projektu'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleClose}
            className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
          >
            <X size={15} />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-[var(--background)]/20">
          {milestoneError && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
              {milestoneError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rows List */}
            <div className="space-y-3.5">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-primary)]">
                      Etap #{index + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1 rounded-lg transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <label className="block sm:col-span-3">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Symbol (KM) <span className="text-rose-500">*</span>
                      </span>
                      <input
                        value={row.milestoneNo}
                        onChange={(e) =>
                          handleUpdateRow(index, 'milestoneNo', e.target.value)
                        }
                        placeholder="np. KM 1"
                        required
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>

                    <label className="block sm:col-span-9">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Nazwa / Opis etapu <span className="text-rose-500">*</span>
                      </span>
                      <input
                        value={row.description}
                        onChange={(e) =>
                          handleUpdateRow(index, 'description', e.target.value)
                        }
                        placeholder="np. Stan surowy, roboty ziemne"
                        required
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>

                    <label className="block sm:col-span-12">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Udział w budżecie (%) <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={row.percentage || ''}
                        onChange={(e) =>
                          handleUpdateRow(
                            index,
                            'percentage',
                            e.target.value ? Number(e.target.value) : 0,
                          )
                        }
                        placeholder="np. 15.5"
                        required
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Batch mode Actions & Live Progress Preview */}
            {!editingMilestoneId && (
              <div className="space-y-4 pt-2">
                <Button
                  type="button"
                  onClick={handleAddRow}
                  variant="outline"
                  className="w-full h-10 rounded-xl text-sm border-dashed border-[var(--sidebar-primary)]/30 hover:border-[var(--sidebar-primary)] text-[var(--sidebar-primary)] bg-[var(--card)] hover:bg-[var(--sidebar-primary)]/5"
                >
                  <Plus size={14} className="mr-1.5" />
                  Dodaj kolejny wiersz (etap)
                </Button>

                {/* KPI Preview Panel */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                    Podgląd udziału projektu
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-0.5 border-r border-[var(--border)]/50">
                      <p className="text-[10px] text-[var(--muted-foreground)]">Obecny</p>
                      <p className="text-xs font-extrabold text-[var(--foreground)]">
                        {currentPctSum.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-0.5 border-r border-[var(--border)]/50">
                      <p className="text-[10px] text-[var(--muted-foreground)]">Nowe wiersze</p>
                      <p className="text-xs font-extrabold text-[var(--sidebar-primary)]">
                        +{incomingPctSum.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-[var(--muted-foreground)]">Suma ogółem</p>
                      <p
                        className={`text-xs font-extrabold ${projectedPctSum > 100.01
                            ? 'text-rose-500'
                            : projectedPctSum === 100
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                          }`}
                      >
                        {projectedPctSum.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar Visualizer */}
                  <div className="relative h-2 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-[var(--muted-foreground)]/40 transition-all duration-300"
                      style={{ width: `${Math.min(currentPctSum, 100)}%` }}
                    />
                    <div
                      className={`absolute h-full transition-all duration-300 ${projectedPctSum > 100.01
                          ? 'bg-rose-500 animate-pulse'
                          : projectedPctSum === 100
                            ? 'bg-emerald-500'
                            : 'bg-[var(--sidebar-primary)]'
                        }`}
                      style={{
                        left: `${Math.min(currentPctSum, 100)}%`,
                        width: `${Math.min(incomingPctSum, Math.max(0, 100 - currentPctSum))}%`,
                      }}
                    />
                  </div>

                  {projectedPctSum > 100.01 && (
                    <p className="text-[10px] font-bold text-rose-500 text-center animate-pulse">
                      Uwaga: Łączny udział przekracza dopuszczalne 100%!
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Drawer Footer */}
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || projectedPctSum > 100.01}
            className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : null}
            {editingMilestoneId ? 'Zapisz zmiany' : rows.length > 1 ? `Dodaj ${rows.length} etapów` : 'Dodaj etap'}
          </Button>
        </footer>
      </aside>
    </>
  )
}
