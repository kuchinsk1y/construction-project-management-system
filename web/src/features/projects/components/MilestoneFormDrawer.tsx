import { useState } from 'react'
import { Plus, Trash2, X, Loader2, Calendar, Milestone, Wrench, PencilLine, Lock } from 'lucide-react'
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
  /** When true, opens in "edit all milestones" mode */
  isBulkEdit?: boolean
}

type MilestoneType = 'KM' | 'roboty_dodatkowe'

type RowKM = {
  milestoneNo: string
  description: string
  percentage: number
  invoicingPercentage?: number
}

type RowRoboty = {
  milestoneNo: string
  description: string
  netAmount: number
}

// Editable row that mirrors an existing ApiMilestone (for bulk-edit mode)
type BulkEditRow = {
  id: string
  type: MilestoneType
  milestoneNo: string
  description: string
  percentage: number         // locked in edit mode
  netAmount: number          // editable for roboty, locked for KM
  originalNo: string
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
  contractNetValue = 0,
  isBulkEdit = false,
}: MilestoneFormDrawerProps) {
  // ---- Add mode state ----
  const [selectedType, setSelectedType] = useState<MilestoneType | null>(null)
  const [kmRows, setKmRows] = useState<RowKM[]>([])
  const [robotyRows, setRobotyRows] = useState<RowRoboty[]>([])

  // ---- Bulk-edit mode state ----
  const [bulkRows, setBulkRows] = useState<BulkEditRow[]>([])

  // Track previous props to reset on changes
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [prevEditingId, setPrevEditingId] = useState(editingMilestoneId)
  const [prevIsBulkEdit, setPrevIsBulkEdit] = useState(isBulkEdit)

  if (isOpen !== prevIsOpen || editingMilestoneId !== prevEditingId || isBulkEdit !== prevIsBulkEdit) {
    setPrevIsOpen(isOpen)
    setPrevEditingId(editingMilestoneId)
    setPrevIsBulkEdit(isBulkEdit)

    if (isOpen) {
      if (isBulkEdit) {
        // Populate bulk-edit rows from all existing milestones
        setBulkRows(
          milestones.map((m) => ({
            id: m.id,
            type: m.type as MilestoneType,
            milestoneNo: m.milestoneNo,
            description: m.description,
            percentage: m.percentage,
            netAmount: m.netAmount ?? 0,
            originalNo: m.milestoneNo,
          })),
        )
      } else if (editingMilestoneId) {
        // Single-edit existing milestone
        const existingType = (milestoneForm.type ?? 'KM') as MilestoneType
        setSelectedType(existingType)
        if (existingType === 'KM') {
          setKmRows([{
            milestoneNo: milestoneForm.milestoneNo,
            description: milestoneForm.description,
            percentage: milestoneForm.percentage ?? 0,
            invoicingPercentage: milestoneForm.invoicingPercentage ?? undefined,
          }])
          setRobotyRows([])
        } else {
          setRobotyRows([{
            milestoneNo: milestoneForm.milestoneNo,
            description: milestoneForm.description,
            netAmount: milestoneForm.netAmount ?? 0,
          }])
          setKmRows([])
        }
      } else {
        // New milestone — no type selected
        setSelectedType(null)
        setKmRows([{
          milestoneNo: `KM ${milestones.length + 1}`,
          description: '',
          percentage: 0,
          invoicingPercentage: undefined,
        }])
        setRobotyRows([{
          milestoneNo: `RD ${milestones.length + 1}`,
          description: '',
          netAmount: 0,
        }])
        setBulkRows([])
      }
    }
  }

  const handleClose = () => {
    setMilestoneError('')
    setEditingMilestoneId(null)
    onClose()
  }

  // ---- KM Row Handlers (add mode) ----
  const handleAddKmRow = () => {
    setKmRows((prev) => [...prev, {
      milestoneNo: `KM ${milestones.length + prev.length + 1}`,
      description: '',
      percentage: 0,
      invoicingPercentage: undefined,
    }])
  }

  const handleRemoveKmRow = (index: number) => {
    setKmRows((prev) => prev.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      milestoneNo: `KM ${milestones.length + i + 1}`,
    })))
  }

  const handleUpdateKmRow = <K extends keyof RowKM>(index: number, key: K, value: RowKM[K]) => {
    setKmRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  const kmNetAmount = (pct: number) =>
    contractNetValue > 0 ? Math.round(contractNetValue * pct / 100 * 100) / 100 : 0

  // ---- Roboty Dodatkowe Row Handlers (add mode) ----
  const handleAddRobotyRow = () => {
    setRobotyRows((prev) => [...prev, {
      milestoneNo: `RD ${milestones.length + prev.length + 1}`,
      description: '',
      netAmount: 0,
    }])
  }

  const handleRemoveRobotyRow = (index: number) => {
    setRobotyRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateRobotyRow = <K extends keyof RowRoboty>(index: number, key: K, value: RowRoboty[K]) => {
    setRobotyRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  // ---- Bulk-edit row handler ----
  const handleUpdateBulkRow = <K extends keyof BulkEditRow>(index: number, key: K, value: BulkEditRow[K]) => {
    setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  // ---- Submit (add mode) ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMilestoneError('')

    if (!selectedType) {
      setMilestoneError('Wybierz typ etapu.')
      return
    }

    if (selectedType === 'KM') {
      for (let i = 0; i < kmRows.length; i++) {
        const row = kmRows[i]
        const label = kmRows.length > 1 ? `Wiersz ${i + 1}: ` : ''
        if (!row.milestoneNo.trim()) { setMilestoneError(`${label}Symbol (KM) jest wymagany.`); return }
        if (!row.description.trim()) { setMilestoneError(`${label}Opis etapu jest wymagany.`); return }
        if ((row.percentage ?? 0) <= 0 || (row.percentage ?? 0) > 100) {
          setMilestoneError(`${label}Udział % musi być z przedziału 0.01% - 100%.`); return
        }
      }

      const existingPctSum = milestones
        .filter((m) => m.id !== editingMilestoneId && m.type === 'KM')
        .reduce((sum, m) => sum + (m.percentage || 0), 0)
      const newPctSum = kmRows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)
      const totalProposedPct = existingPctSum + newPctSum

      if (totalProposedPct > 100.01) {
        setMilestoneError(`Suma procentów wszystkich KM (${totalProposedPct.toFixed(2)}%) nie może przekraczać 100%. Obecna suma: ${existingPctSum.toFixed(2)}%.`)
        return
      }
      if (totalProposedPct < 95) {
        setMilestoneError(`Suma procentów wszystkich KM musi wynosić co najmniej 95%. Aktualna suma po dodaniu: ${totalProposedPct.toFixed(2)}%. Brakuje jeszcze ${(95 - totalProposedPct).toFixed(2)}%.`)
        return
      }

      if (editingMilestoneId) {
        const row = kmRows[0]
        updateMilestoneMutation.mutate(
          { id: editingMilestoneId, payload: { milestoneNo: row.milestoneNo.trim(), description: row.description.trim(), type: 'KM', percentage: Number(row.percentage) } },
          { onSuccess: () => handleClose() },
        )
      } else {
        const payloads: CreateMilestonePayload[] = kmRows.map((row) => ({ milestoneNo: row.milestoneNo.trim(), description: row.description.trim(), type: 'KM', percentage: Number(row.percentage) }))
        if (payloads.length === 1) {
          createMilestoneMutation.mutate(payloads[0], { onSuccess: () => handleClose() })
        } else {
          createMilestonesBatchMutation.mutate(payloads, { onSuccess: () => handleClose() })
        }
      }
    } else {
      for (let i = 0; i < robotyRows.length; i++) {
        const row = robotyRows[i]
        const label = robotyRows.length > 1 ? `Wiersz ${i + 1}: ` : ''
        if (!row.milestoneNo.trim()) { setMilestoneError(`${label}Numer jest wymagany.`); return }
        if (!row.description.trim()) { setMilestoneError(`${label}Opis jest wymagany.`); return }
        if ((row.netAmount ?? 0) <= 0) { setMilestoneError(`${label}Kwota netto musi być większa od 0.`); return }
      }

      if (editingMilestoneId) {
        const row = robotyRows[0]
        updateMilestoneMutation.mutate(
          { id: editingMilestoneId, payload: { milestoneNo: row.milestoneNo.trim(), description: row.description.trim(), type: 'roboty_dodatkowe', netAmount: Number(row.netAmount) } },
          { onSuccess: () => handleClose() },
        )
      } else {
        const payloads: CreateMilestonePayload[] = robotyRows.map((row) => ({ milestoneNo: row.milestoneNo.trim(), description: row.description.trim(), type: 'roboty_dodatkowe', netAmount: Number(row.netAmount) }))
        if (payloads.length === 1) {
          createMilestoneMutation.mutate(payloads[0], { onSuccess: () => handleClose() })
        } else {
          createMilestonesBatchMutation.mutate(payloads, { onSuccess: () => handleClose() })
        }
      }
    }
  }

  // ---- Submit (bulk-edit mode) ----
  const [bulkSaving, setBulkSaving] = useState(false)

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMilestoneError('')

    // Validate all rows
    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i]
      const label = `Etap "${row.milestoneNo}": `
      if (!row.milestoneNo.trim()) { setMilestoneError(`${label}Nr jest wymagany.`); return }
      if (!row.description.trim()) { setMilestoneError(`${label}Opis jest wymagany.`); return }
      if (row.type === 'roboty_dodatkowe' && (row.netAmount ?? 0) <= 0) {
        setMilestoneError(`${label}Kwota netto musi być większa od 0.`); return
      }
    }

    setBulkSaving(true)
    try {
      for (const row of bulkRows) {
        await new Promise<void>((resolve, reject) => {
          updateMilestoneMutation.mutate(
            {
              id: row.id,
              payload: {
                milestoneNo: row.milestoneNo.trim(),
                description: row.description.trim(),
                type: row.type,
                ...(row.type === 'roboty_dodatkowe' ? { netAmount: Number(row.netAmount) } : {}),
              },
            },
            { onSuccess: () => resolve(), onError: (err) => reject(err) },
          )
        })
      }
      handleClose()
    } catch (err: unknown) {
      setMilestoneError(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setBulkSaving(false)
    }
  }

  // Live preview for KM (add mode)
  const currentPctSum = milestones
    .filter((m) => m.id !== editingMilestoneId && m.type === 'KM')
    .reduce((sum, m) => sum + (m.percentage || 0), 0)
  const incomingPctSum = kmRows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)
  const projectedPctSum = currentPctSum + incomingPctSum

  const isPending =
    createMilestoneMutation.isPending ||
    createMilestonesBatchMutation.isPending ||
    updateMilestoneMutation.isPending ||
    bulkSaving

  const inputCls =
    'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 disabled:cursor-not-allowed'

  const inputLockedCls =
    'h-10 w-full rounded-xl border border-[var(--border)]/60 bg-[var(--muted)]/30 px-3 text-sm text-[var(--muted-foreground)] cursor-not-allowed select-none'

  // ---- Header title by mode ----
  const drawerTitle = isBulkEdit
    ? 'Edytuj wszystkie etapy'
    : editingMilestoneId
      ? 'Edytuj kamień milowy'
      : 'Dodaj nowy etap'

  const drawerSubtitle = isBulkEdit
    ? 'Zmień opisy i numery — procentów nie można edytować'
    : editingMilestoneId
      ? 'Zmień dane wybranego etapu rozliczeniowego'
      : 'Wybierz typ etapu i uzupełnij dane'

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
          onClick={handleClose}
        />
      )}

      {/* Slide-over — wider for bulk-edit */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          isBulkEdit ? 'w-full max-w-[680px]' : 'w-full max-w-[560px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              {isBulkEdit
                ? <PencilLine size={18} className="text-[var(--sidebar-primary)]" />
                : <Calendar size={18} className="text-[var(--sidebar-primary)]" />}
              {drawerTitle}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{drawerSubtitle}</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-[var(--background)]/20">
          {milestoneError && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
              {milestoneError}
            </div>
          )}

          {/* ================================
              BULK-EDIT MODE
              ================================ */}
          {isBulkEdit && (
            <form onSubmit={handleBulkSubmit} className="space-y-3">
              {bulkRows.length === 0 && (
                <p className="text-center text-sm text-[var(--muted-foreground)] py-8">
                  Brak etapów do edycji.
                </p>
              )}

              {/* Legend */}
              {bulkRows.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--muted)]/20 px-3.5 py-2.5">
                  <Lock size={12} className="text-[var(--muted-foreground)] shrink-0" />
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Pola oznaczone kłódką są zablokowane do edycji. Edytować można <strong>Nr</strong>, <strong>Opis</strong>, i dla robót dodatkowych — <strong>Kwotę netto</strong>.
                  </p>
                </div>
              )}

              {/* KM rows */}
              {bulkRows.filter((r) => r.type === 'KM').length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Milestone size={13} className="text-[var(--sidebar-primary)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-primary)]">
                      Kamienie Milowe (KM)
                    </span>
                  </div>
                  {bulkRows.map((row, index) => {
                    if (row.type !== 'KM') return null
                    const computedNet = kmNetAmount(row.percentage)
                    return (
                      <div
                        key={row.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3 shadow-2xs"
                      >
                        <div className="grid grid-cols-12 gap-3">
                          {/* Nr */}
                          <label className="block col-span-3">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Nr</span>
                            <input
                              value={row.milestoneNo}
                              onChange={(e) => handleUpdateBulkRow(index, 'milestoneNo', e.target.value)}
                              placeholder="KM 1"
                              required
                              className={inputCls}
                            />
                          </label>

                          {/* % — locked */}
                          <label className="block col-span-2">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 mb-1">
                              Udział %
                              <Lock size={9} className="text-[var(--muted-foreground)]" />
                            </span>
                            <div className={inputLockedCls + ' flex items-center'}>
                              {row.percentage.toFixed(2)}%
                            </div>
                          </label>

                          {/* Kwota netto — locked */}
                          <label className="block col-span-7">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 mb-1">
                              Kwota netto
                              <Lock size={9} className="text-[var(--muted-foreground)]" />
                            </span>
                            <div className={inputLockedCls + ' flex items-center'}>
                              {computedNet > 0
                                ? computedNet.toLocaleString('pl-PL', { minimumFractionDigits: 2 })
                                : '—'}
                            </div>
                          </label>

                          {/* Opis */}
                          <label className="block col-span-12">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              Opis etapu <span className="text-rose-500">*</span>
                            </span>
                            <input
                              value={row.description}
                              onChange={(e) => handleUpdateBulkRow(index, 'description', e.target.value)}
                              placeholder="np. Stan surowy, roboty ziemne"
                              required
                              className={inputCls}
                            />
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Roboty dodatkowe rows */}
              {bulkRows.filter((r) => r.type === 'roboty_dodatkowe').length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Roboty dodatkowe
                    </span>
                  </div>
                  {bulkRows.map((row, index) => {
                    if (row.type !== 'roboty_dodatkowe') return null
                    return (
                      <div
                        key={row.id}
                        className="rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-4 space-y-3 shadow-2xs"
                      >
                        <div className="grid grid-cols-12 gap-3">
                          {/* Nr */}
                          <label className="block col-span-4">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Nr</span>
                            <input
                              value={row.milestoneNo}
                              onChange={(e) => handleUpdateBulkRow(index, 'milestoneNo', e.target.value)}
                              placeholder="RD 1"
                              required
                              className={inputCls}
                            />
                          </label>

                          {/* Kwota netto — editable */}
                          <label className="block col-span-8">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              Kwota netto <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={row.netAmount || ''}
                              onChange={(e) =>
                                handleUpdateBulkRow(index, 'netAmount', e.target.value ? Number(e.target.value) : 0)
                              }
                              placeholder="np. 15000.00"
                              required
                              className={inputCls}
                            />
                          </label>

                          {/* Opis */}
                          <label className="block col-span-12">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              Opis <span className="text-rose-500">*</span>
                            </span>
                            <input
                              value={row.description}
                              onChange={(e) => handleUpdateBulkRow(index, 'description', e.target.value)}
                              placeholder="np. Roboty dodatkowe – fundamenty"
                              required
                              className={inputCls}
                            />
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </form>
          )}

          {/* ================================
              ADD / SINGLE-EDIT MODE
              ================================ */}
          {!isBulkEdit && (
            <>
              {/* TYPE SELECTION — only when creating new */}
              {!editingMilestoneId && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedType('KM')}
                    className={[
                      'flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer text-left',
                      selectedType === 'KM'
                        ? 'border-[var(--sidebar-primary)] bg-[var(--sidebar-primary)]/8 shadow-[0_0_0_3px_color-mix(in_oklch,var(--sidebar-primary),transparent_80%)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--sidebar-primary)]/50 hover:bg-[var(--sidebar-primary)]/5',
                    ].join(' ')}
                  >
                    <div className={`p-2.5 rounded-xl ${selectedType === 'KM' ? 'bg-[var(--sidebar-primary)]/15' : 'bg-[var(--muted)]/60'}`}>
                      <Milestone size={18} className={selectedType === 'KM' ? 'text-[var(--sidebar-primary)]' : 'text-[var(--muted-foreground)]'} />
                    </div>
                    <span className={`text-xs font-bold text-center ${selectedType === 'KM' ? 'text-[var(--sidebar-primary)]' : 'text-[var(--foreground)]'}`}>
                      Kamień Milowy (KM)
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] text-center leading-relaxed">
                      Procent budżetu · kwota liczona automatycznie
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('roboty_dodatkowe')}
                    className={[
                      'flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer text-left',
                      selectedType === 'roboty_dodatkowe'
                        ? 'border-amber-500 bg-amber-500/8 shadow-[0_0_0_3px_color-mix(in_oklch,oklch(0.769_0.188_70.08),transparent_80%)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-amber-500/50 hover:bg-amber-500/5',
                    ].join(' ')}
                  >
                    <div className={`p-2.5 rounded-xl ${selectedType === 'roboty_dodatkowe' ? 'bg-amber-500/15' : 'bg-[var(--muted)]/60'}`}>
                      <Wrench size={18} className={selectedType === 'roboty_dodatkowe' ? 'text-amber-500' : 'text-[var(--muted-foreground)]'} />
                    </div>
                    <span className={`text-xs font-bold text-center ${selectedType === 'roboty_dodatkowe' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--foreground)]'}`}>
                      Roboty dodatkowe
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] text-center leading-relaxed">
                      Kwota netto wpisana ręcznie · poza budżetem
                    </span>
                  </button>
                </div>
              )}

              {/* KM form */}
              {selectedType === 'KM' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-3.5">
                    {kmRows.map((row, index) => {
                      const computedNet = kmNetAmount(row.percentage ?? 0)
                      return (
                        <div
                          key={index}
                          className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-primary)]">
                              Etap #{index + 1}
                            </span>
                            {kmRows.length > 1 && (
                              <button type="button" onClick={() => handleRemoveKmRow(index)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1 rounded-lg transition">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <label className="block sm:col-span-3">
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Nr <span className="text-rose-500">*</span></span>
                              <input value={row.milestoneNo} onChange={(e) => handleUpdateKmRow(index, 'milestoneNo', e.target.value)} placeholder="KM 1" required className={inputCls} />
                            </label>

                            <label className="block sm:col-span-3">
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Udział % <span className="text-rose-500">*</span></span>
                              <input type="number" min="0.01" max="100" step="0.01" value={row.percentage || ''} onChange={(e) => handleUpdateKmRow(index, 'percentage', e.target.value ? Number(e.target.value) : 0)} placeholder="15.5" required className={inputCls} />
                            </label>

                            <label className="block sm:col-span-6">
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                                Kwota netto
                                <span className="ml-1.5 text-[9px] font-normal text-[var(--muted-foreground)] uppercase tracking-wide">(auto)</span>
                              </span>
                              <input value={computedNet > 0 ? computedNet.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) : ''} disabled placeholder="—" className={inputCls} />
                            </label>

                            <label className="block sm:col-span-12">
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Opis etapu <span className="text-rose-500">*</span></span>
                              <input value={row.description} onChange={(e) => handleUpdateKmRow(index, 'description', e.target.value)} placeholder="np. Stan surowy, roboty ziemne" required className={inputCls} />
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {!editingMilestoneId && (
                    <div className="space-y-4 pt-2">
                      <Button type="button" onClick={handleAddKmRow} variant="outline" className="w-full h-10 rounded-xl text-sm border-dashed border-[var(--sidebar-primary)]/30 hover:border-[var(--sidebar-primary)] text-[var(--sidebar-primary)] bg-[var(--card)] hover:bg-[var(--sidebar-primary)]/5">
                        <Plus size={14} className="mr-1.5" />
                        Dodaj kolejny wiersz (etap)
                      </Button>

                      {/* KPI Preview */}
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-2.5 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Podgląd udziału projektu</span>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="space-y-0.5 border-r border-[var(--border)]/50">
                            <p className="text-[10px] text-[var(--muted-foreground)]">Obecny</p>
                            <p className="text-xs font-extrabold text-[var(--foreground)]">{currentPctSum.toFixed(2)}%</p>
                          </div>
                          <div className="space-y-0.5 border-r border-[var(--border)]/50">
                            <p className="text-[10px] text-[var(--muted-foreground)]">Nowe</p>
                            <p className="text-xs font-extrabold text-[var(--sidebar-primary)]">+{incomingPctSum.toFixed(2)}%</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-[var(--muted-foreground)]">Suma</p>
                            <p className={`text-xs font-extrabold ${projectedPctSum > 100.01 || projectedPctSum < 95 ? 'text-rose-500' : projectedPctSum >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {projectedPctSum.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        <div className="relative h-2 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden">
                          <div className="absolute left-0 top-0 h-full bg-[var(--muted-foreground)]/40 transition-all duration-300" style={{ width: `${Math.min(currentPctSum, 100)}%` }} />
                          <div
                            className={`absolute h-full transition-all duration-300 ${projectedPctSum > 100.01 ? 'bg-rose-500 animate-pulse' : projectedPctSum < 95 && projectedPctSum > 0 ? 'bg-rose-400' : projectedPctSum >= 100 ? 'bg-emerald-500' : 'bg-[var(--sidebar-primary)]'}`}
                            style={{ left: `${Math.min(currentPctSum, 100)}%`, width: `${Math.min(incomingPctSum, Math.max(0, 100 - currentPctSum))}%` }}
                          />
                        </div>
                        {projectedPctSum > 100.01 && (
                          <p className="text-[10px] font-bold text-rose-500 text-center animate-pulse">Uwaga: Łączny udział przekracza dopuszczalne 100%!</p>
                        )}
                        {projectedPctSum < 95 && projectedPctSum > 0 && (
                          <p className="text-[10px] font-bold text-amber-500 text-center">⚠ Wymagane min. 95% — brakuje jeszcze {(95 - projectedPctSum).toFixed(2)}%</p>
                        )}
                        {projectedPctSum === 0 && (
                          <p className="text-[10px] text-[var(--muted-foreground)] text-center">Uzupełnij udziały procentowe powyżej</p>
                        )}
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Roboty dodatkowe form */}
              {selectedType === 'roboty_dodatkowe' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-3.5">
                    {robotyRows.map((row, index) => (
                      <div key={index} className="relative rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Robota dodatkowa #{index + 1}</span>
                          {robotyRows.length > 1 && (
                            <button type="button" onClick={() => handleRemoveRobotyRow(index)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1 rounded-lg transition">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <label className="block sm:col-span-4">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Nr <span className="text-rose-500">*</span></span>
                            <input value={row.milestoneNo} onChange={(e) => handleUpdateRobotyRow(index, 'milestoneNo', e.target.value)} placeholder="RD 1" required className={inputCls} />
                          </label>
                          <label className="block sm:col-span-8">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Kwota netto <span className="text-rose-500">*</span></span>
                            <input type="number" min="0.01" step="0.01" value={row.netAmount || ''} onChange={(e) => handleUpdateRobotyRow(index, 'netAmount', e.target.value ? Number(e.target.value) : 0)} placeholder="np. 15000.00" required className={inputCls} />
                          </label>
                          <label className="block sm:col-span-12">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Opis <span className="text-rose-500">*</span></span>
                            <input value={row.description} onChange={(e) => handleUpdateRobotyRow(index, 'description', e.target.value)} placeholder="np. Roboty dodatkowe – fundamenty" required className={inputCls} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!editingMilestoneId && (
                    <Button type="button" onClick={handleAddRobotyRow} variant="outline" className="w-full h-10 rounded-xl text-sm border-dashed border-amber-500/30 hover:border-amber-500 text-amber-600 dark:text-amber-400 bg-[var(--card)] hover:bg-amber-500/5">
                      <Plus size={14} className="mr-1.5" />
                      Dodaj kolejny wiersz (robota)
                    </Button>
                  )}
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
            Anuluj
          </Button>

          {/* Bulk-edit save */}
          {isBulkEdit && bulkRows.length > 0 && (
            <Button
              type="submit"
              onClick={handleBulkSubmit}
              disabled={isPending}
              className="rounded-xl text-white bg-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
            >
              {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Zapisz wszystkie zmiany
            </Button>
          )}

          {/* Add / single-edit save */}
          {!isBulkEdit && selectedType && (
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isPending || (selectedType === 'KM' && (projectedPctSum > 100.01 || projectedPctSum < 95))}
              className={`rounded-xl text-white shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] ${selectedType === 'roboty_dodatkowe' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/90'}`}
            >
              {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              {editingMilestoneId
                ? 'Zapisz zmiany'
                : selectedType === 'KM'
                  ? kmRows.length > 1 ? `Dodaj ${kmRows.length} etapów` : 'Dodaj etap'
                  : robotyRows.length > 1 ? `Dodaj ${robotyRows.length} robót` : 'Dodaj robotę'}
            </Button>
          )}
        </footer>
      </aside>
    </>
  )
}
