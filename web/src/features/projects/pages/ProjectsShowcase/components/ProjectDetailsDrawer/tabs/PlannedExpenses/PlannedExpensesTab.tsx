import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Wallet, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { 
  getCostCategories, 
  createCostCategory, 
  getPlannedExpenses, 
  createPlannedExpense, 
  updatePlannedExpense, 
  deletePlannedExpense 
} from '@/features/projects/api'
import type { ApiProject, ApiPlannedExpense } from '@/features/projects/types'
import { PlannedExpenseFormDrawer } from '@/features/projects/pages/ProjectsShowcase/components/ProjectDetailsDrawer/tabs/PlannedExpenses/PlannedExpenseFormDrawer'

interface PlannedExpensesTabProps {
  project: ApiProject
}

export function PlannedExpensesTab({ project }: PlannedExpensesTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['cost-categories'],
    queryFn: getCostCategories,
  })

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['planned-expenses', project.id],
    queryFn: () => getPlannedExpenses(project.id),
  })

  // Mutations
  const createCategoryMut = useMutation({
    mutationFn: createCostCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-categories'] })
    }
  })

  const createExpenseMut = useMutation({
    mutationFn: (payload: { costCategoryId: string, plannedPercent: number }) => createPlannedExpense(project.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-expenses', project.id] })
    }
  })

  const updateExpenseMut = useMutation({
    mutationFn: (data: { id: string, payload: { costCategoryId?: string, plannedPercent?: number } }) => 
      updatePlannedExpense(project.id, data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-expenses', project.id] })
    }
  })

  const deleteExpenseMut = useMutation({
    mutationFn: (id: string) => deletePlannedExpense(project.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-expenses', project.id] })
    }
  })

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  
  // Budget calculations
  const contractValue = project.contract_net_value ? Number(project.contract_net_value) : 0
  const currency = project.currency || 'PLN'
  const warrantyPercent = project.warrantyPercent ? Number(project.warrantyPercent) : 0
  const availableBudget = contractValue - (contractValue * (warrantyPercent / 100))
  const totalPercentUsed = expenses.reduce((sum, e) => sum + e.plannedPercent, 0)
  
  const formatBudget = (val: number, curr?: string) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: curr || 'PLN',
    }).format(val)
  }

  const openAddDrawer = () => {
    setEditingExpenseId(null)
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (expense: ApiPlannedExpense) => {
    setEditingExpenseId(expense.id)
    setIsDrawerOpen(true)
  }

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm space-y-4 animate-tab-content">
      {/* Header Action Bar & Summary Stats */}
      <div className="flex flex-col gap-3">
        {/* Overall Allocation Progress Bar */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Wallet size={14} className="text-[var(--sidebar-primary)]" />
              Suma rozdysponowanych wydatków z budżetu ({formatBudget(availableBudget, currency)})
            </span>
            <span className={`font-extrabold ${totalPercentUsed === 100 ? 'text-emerald-500' : totalPercentUsed > 100 ? 'text-rose-500' : 'text-amber-500'}`}>
              {totalPercentUsed.toFixed(2)}% / 100%
            </span>
          </div>
          <div className="relative h-3.5 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalPercentUsed === 100 ? 'bg-emerald-500' : totalPercentUsed > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(totalPercentUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-2.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Wartość kontraktu netto</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(contractValue, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-2.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Budżet (-{warrantyPercent}% gw.)</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(availableBudget, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-2.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Pozostało (%)</span>
            <p className={`text-sm font-extrabold ${(100 - totalPercentUsed) === 0 ? 'text-emerald-500' : (100 - totalPercentUsed) < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
              {(100 - totalPercentUsed).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Header controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Coins size={14} className="text-[var(--sidebar-primary)]" />
            <span>Tabela rodzajów wydatków</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={openAddDrawer}
              className="h-8 rounded-xl bg-[var(--sidebar-primary)] px-3 text-xs font-bold text-[var(--sidebar-primary-foreground)] shadow-[0_2px_10px_color-mix(in_oklch,var(--sidebar-primary),transparent_70%)] hover:bg-[var(--sidebar-primary)]/90"
            >
              <Plus size={14} className="mr-1.5" />
              Dodaj / Edytuj
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
        <div className="max-h-[500px] overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 border-b-[3px] border-zinc-300 dark:border-zinc-700 bg-[var(--background)]/95 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 border-r border-[var(--border)] min-w-[200px]">Rodzaj wydatku</th>
                <th className="px-4 py-2 text-center border-r border-[var(--border)] w-28">Udział (%)</th>
                <th className="px-4 py-2 text-right border-r border-[var(--border)] w-36">Wartość</th>
                <th className="px-3 py-2 w-20 text-center">Akcje</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody className="font-medium">
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-[var(--muted-foreground)]">
                    Ładowanie wydatków...
                  </td>
                </tr>
              </tbody>
            ) : expenses.length === 0 ? (
              <tbody className="font-medium">
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-[var(--muted-foreground)] italic text-[11px]">
                    Brak zaplanowanych wydatków. Kliknij „Dodaj / Edytuj”, aby rozpocząć planowanie budżetu.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="font-medium divide-y divide-[var(--border)]">
                {expenses.map((expense) => {
                  const val = availableBudget * (expense.plannedPercent / 100)
                  return (
                    <tr key={expense.id} className="group hover:bg-[var(--muted)]/20 transition-colors align-middle">
                      <td className="px-4 py-2 border-r border-[var(--border)] font-bold text-[var(--foreground)]">
                        {expense.costCategoryName}
                      </td>
                      <td className="px-4 py-2 text-center border-r border-[var(--border)]">
                        <span className="inline-block rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-bold border border-[var(--border)] tabular-nums">
                          {expense.plannedPercent}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right border-r border-[var(--border)] tabular-nums font-semibold text-[11px]">
                        {formatBudget(val, currency)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(expense)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
                            title="Edytuj"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
                                deleteExpenseMut.mutate(expense.id)
                              }
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-rose-500 hover:bg-rose-500/10"
                            title="Usuń"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>

      <PlannedExpenseFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        expenses={expenses}
        categories={categories}
        editingExpenseId={editingExpenseId}
        setEditingExpenseId={setEditingExpenseId}
        createCategoryMut={createCategoryMut}
        createExpenseMut={createExpenseMut}
        updateExpenseMut={updateExpenseMut}
        deleteExpenseMut={deleteExpenseMut}
      />
    </div>
  )
}
