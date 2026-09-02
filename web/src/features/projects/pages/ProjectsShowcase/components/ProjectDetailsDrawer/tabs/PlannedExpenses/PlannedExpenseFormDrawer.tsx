import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Loader2, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ApiCostCategory, ApiPlannedExpense } from '@/features/projects/types'

type PlannedExpenseFormDrawerProps = {
  isOpen: boolean
  onClose: () => void
  expenses: ApiPlannedExpense[]
  categories: ApiCostCategory[]
  editingExpenseId: string | null
  setEditingExpenseId: (id: string | null) => void
  createCategoryMut: UseMutationResult<ApiCostCategory, Error, { name: string }, unknown>
  createExpenseMut: UseMutationResult<ApiPlannedExpense, Error, { costCategoryId: string; plannedPercent: number }, unknown>
  updateExpenseMut: UseMutationResult<ApiPlannedExpense, Error, { id: string; payload: { costCategoryId?: string; plannedPercent?: number } }, unknown>
  deleteExpenseMut: UseMutationResult<void, Error, string, unknown>
}

type FormRow = {
  id?: string
  costCategoryName: string
  plannedPercent: number
  isNew?: boolean
}

export function PlannedExpenseFormDrawer({
  isOpen,
  onClose,
  expenses,
  categories,
  editingExpenseId,
  setEditingExpenseId,
  createCategoryMut,
  createExpenseMut,
  updateExpenseMut,
  deleteExpenseMut,
}: PlannedExpenseFormDrawerProps) {
  const [rows, setRows] = useState<FormRow[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  // Sync rows when opened
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      if (editingExpenseId) {
        // Edit single mode (if we still use it)
        const exp = expenses.find((e) => e.id === editingExpenseId)
        if (exp) {
          setRows([{
            id: exp.id,
            costCategoryName: exp.costCategoryName,
            plannedPercent: exp.plannedPercent,
            isNew: false
          }])
        }
      } else {
        // Bulk mode
        if (expenses.length > 0) {
          setRows(expenses.map(e => ({
            id: e.id,
            costCategoryName: e.costCategoryName,
            plannedPercent: e.plannedPercent,
            isNew: false
          })))
        } else {
          // Empty starting row
          setRows([{ costCategoryName: '', plannedPercent: 0, isNew: true }])
        }
      }
    }
  }

  const handleClose = () => {
    setError('')
    setEditingExpenseId(null)
    setDeletedIds([])
    onClose()
  }

  const addRow = () => {
    setRows(prev => [...prev, { costCategoryName: '', plannedPercent: 0, isNew: true }])
  }

  const removeRow = (index: number) => {
    const row = rows[index]
    if (row.id && !row.isNew) {
      setDeletedIds(prev => [...prev, row.id!])
    }
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateRow = <K extends keyof FormRow>(index: number, key: K, value: FormRow[K]) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [key]: value } : r))
  }

  const currentTotal = rows.reduce((s, r) => s + (Number(r.plannedPercent) || 0), 0)

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.costCategoryName.trim()) {
        setError(`Wiersz ${i + 1}: Brak nazwy rodzaju wydatku.`)
        return
      }
      if (r.plannedPercent < 0) {
        setError(`Wiersz ${i + 1}: Procent nie może być mniejszy od 0.`)
        return
      }
    }

    if (Math.abs(currentTotal - 100) > 0.01 && rows.length > 0) {
      setError(`Suma procentów musi wynosić dokładnie 100%. Obecnie jest ${currentTotal.toFixed(2)}%.`)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      // 1. Delete rows
      for (const id of deletedIds) {
        await deleteExpenseMut.mutateAsync(id)
      }

      // 2. Update or Create
      // Cache created categories in this run to avoid duplicates
      const localCatCache = new Map<string, string>()

      for (const row of rows) {
        const catNameStr = row.costCategoryName.trim()
        const lowerName = catNameStr.toLowerCase()

        let categoryId = localCatCache.get(lowerName)

        if (!categoryId) {
          // check if exists in DB
          const existing = categories.find(c => c.name.toLowerCase() === lowerName)
          if (existing) {
            categoryId = existing.id
          } else {
            // create new
            const newCat = await createCategoryMut.mutateAsync({ name: catNameStr })
            categoryId = newCat.id
            localCatCache.set(lowerName, categoryId)
          }
        }

        if (row.id && !row.isNew) {
          await updateExpenseMut.mutateAsync({
            id: row.id,
            payload: { costCategoryId: categoryId, plannedPercent: Number(row.plannedPercent) }
          })
        } else {
          await createExpenseMut.mutateAsync({
            costCategoryId: categoryId,
            plannedPercent: Number(row.plannedPercent)
          })
        }
      }

      handleClose()
    } catch (err: any) {
      setError(err?.message || 'Wystąpił błąd podczas zapisywania.')
    } finally {
      setIsSaving(false)
    }
  }

  if (typeof document === 'undefined') return null

  const isPending = isSaving || createCategoryMut.isPending || createExpenseMut.isPending || updateExpenseMut.isPending || deleteExpenseMut.isPending

  const inputCls =
    'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs text-[var(--foreground)] outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 disabled:opacity-50 disabled:cursor-not-allowed'

  return createPortal(
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out w-full max-w-[500px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <Wallet size={18} className="text-[var(--sidebar-primary)]" />
              Zarządzaj wydatkami
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Rozplanuj budżet w 100%. Wybierz z listy lub wpisz nową kategorię.
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-[var(--background)]/20">
          {error && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--foreground)]">Suma %:</span>
              <span className={`font-extrabold ${Math.abs(currentTotal - 100) <= 0.01 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {currentTotal.toFixed(2)}% / 100%
              </span>
            </div>
            <div className="relative h-2 w-full bg-[var(--border)]/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${Math.abs(currentTotal - 100) <= 0.01 ? 'bg-emerald-500' : currentTotal > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(currentTotal, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col">
            {rows.map((row, index) => (
              <div key={index} className={`flex gap-2 items-start relative group ${index > 0 ? 'pt-3 mt-3 border-t border-[var(--border)]/50' : ''}`}>
                <div className="flex-1">
                  {index === 0 && (
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] ml-1 mb-1.5">Rodzaj wydatku</span>
                  )}
                  <input
                    type="text"
                    list={`category-options-${index}`}
                    value={row.costCategoryName}
                    onChange={(e) => updateRow(index, 'costCategoryName', e.target.value)}
                    placeholder="Wybierz lub wpisz..."
                    className={inputCls}
                  />
                  <datalist id={`category-options-${index}`}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div className="w-24">
                  {index === 0 && (
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] ml-1 mb-1.5">Udział (%)</span>
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.plannedPercent || ''}
                    onChange={(e) => updateRow(index, 'plannedPercent', e.target.value ? Number(e.target.value) : 0)}
                    placeholder="0"
                    className={`${inputCls} font-bold text-center`}
                  />
                </div>

                <div className={index === 0 ? 'pt-[22px]' : ''}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            className="w-full rounded-xl border-dashed border-[var(--sidebar-primary)]/40 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/5"
          >
            <Plus size={14} className="mr-2" />
            Dodaj kolejny wiersz
          </Button>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--border)] p-4 bg-[var(--card)]">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl" disabled={isPending}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
          >
            {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
            Zapisz budżet
          </Button>
        </div>
      </aside>
    </>,
    document.body
  )
}
