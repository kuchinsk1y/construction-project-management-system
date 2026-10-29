import { useState } from 'react' // React,
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, Coins, FileText, ShieldCheck, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getCostCategories,
  getPlannedExpenses,
  savePlannedExpenses,
  fetchMilestones,
  type PlannedExpensePlanItem,
} from '@/features/projects/api'
import type { ApiProject } from '@/features/projects/types'
import { PlannedExpenseFormDrawer } from '@/features/projects/pages/ProjectsShowcase/components/ProjectDetailsDrawer/tabs/PlannedExpenses/PlannedExpenseFormDrawer'
import { formatMoney } from '@/lib/format'

interface PlannedExpensesTabProps {
  project: ApiProject
  canEdit?: boolean
}

export function PlannedExpensesTab({ project, canEdit = false }: PlannedExpensesTabProps) {
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

  // The whole plan is saved in one request (one transaction, one batch to the sheet)
  const savePlanMut = useMutation({
    mutationFn: (items: PlannedExpensePlanItem[]) => savePlannedExpenses(project.id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-expenses', project.id] })
      queryClient.invalidateQueries({ queryKey: ['cost-categories'] })
      queryClient.invalidateQueries({ queryKey: ['hours-plan', project.id] })
    },
  })

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  // Additional works (RD) are paid on top of the contract, so they enlarge the budget to plan
  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', project.id],
    queryFn: () => fetchMilestones(project.id),
  })
  const additionalWorksValue = milestones
    .filter((m) => m.type === 'roboty_dodatkowe')
    .reduce((sum, m) => sum + (Number(m.netAmount) || 0), 0)

  // Budget calculations
  const contractValue = project.contract_net_value ? Number(project.contract_net_value) : 0
  const totalValue = contractValue + additionalWorksValue
  const currency = project.currency || 'PLN'
  const warrantyPercent = project.warrantyPercent ? Number(project.warrantyPercent) : 0
  const availableBudget = totalValue - (totalValue * (warrantyPercent / 100))
  const totalPercentUsed = expenses.reduce((sum, e) => sum + e.plannedPercent, 0)

  const formatBudget = (val: number, curr?: string) => formatMoney(val, curr)

  const openAddDrawer = () => {
    setEditingExpenseId(null)
    setIsDrawerOpen(true)
  }

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm space-y-4 animate-tab-content">
      {/* Header Action Bar & Summary Stats */}
      <div className="flex flex-col gap-3">

        {/* Top Stats & Progress Bar in a row */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">

          {/* Left: Progress Bar */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-3 shadow-2xs flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <Wallet size={14} className="text-[var(--sidebar-primary)]" />
                Zaplanowano z budżetu
              </span>
              <span className={`font-extrabold ${totalPercentUsed === 100 ? 'text-[var(--sidebar-primary)]' : totalPercentUsed > 100 ? 'text-rose-500' : 'text-amber-500'}`}>
                {totalPercentUsed % 1 === 0 ? totalPercentUsed : totalPercentUsed.toFixed(2)}%
              </span>
            </div>
            <div className="relative h-3 w-full bg-[var(--muted)]/30 border border-[var(--border)] shadow-inner rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${totalPercentUsed === 100 ? 'bg-[var(--sidebar-primary)]' : totalPercentUsed > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(totalPercentUsed, 100)}%` }}
              />
            </div>
          </div>

          {/* Right: KPI Card with dividers */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 shadow-xs flex items-center divide-x divide-[var(--border)] overflow-hidden">
            <div className="flex-[1.3] p-3 space-y-1 min-w-0 self-stretch flex flex-col justify-center">
              <span className="flex items-start gap-1.5 text-[10px] font-bold uppercase tracking-wider leading-tight text-[var(--muted-foreground)]">
                <FileText size={12} className="text-[var(--sidebar-primary)] shrink-0 mt-px" />
                {additionalWorksValue > 0 ? 'Wartość netto (umowa + RD)' : 'Wartość kontraktu netto'}
              </span>
              <p className="text-sm font-extrabold text-[var(--foreground)] whitespace-nowrap">{formatBudget(totalValue, currency)}</p>
              {additionalWorksValue > 0 ? (
                <p className="text-[10px] font-medium leading-snug text-[var(--muted-foreground)]">
                  umowa {formatBudget(contractValue, currency)}
                  <span className="font-semibold text-amber-500"> + RD {formatBudget(additionalWorksValue, currency)}</span>
                </p>
              ) : null}
            </div>
            <div className="flex-1 p-3 space-y-1 min-w-0 self-stretch flex flex-col justify-center">
              <span className="flex items-start gap-1.5 text-[10px] font-bold uppercase tracking-wider leading-tight text-[var(--muted-foreground)]">
                <ShieldCheck size={12} className="text-[var(--sidebar-primary)] shrink-0 mt-px" />
                Planowana gwarancja ({warrantyPercent}%)
              </span>
              <p className="text-sm font-extrabold text-[var(--foreground)] whitespace-nowrap">{formatBudget(totalValue * (warrantyPercent / 100), currency)}</p>
            </div>
            <div className="flex-1 p-3 space-y-1 min-w-0 self-stretch flex flex-col justify-center">
              <span className="flex items-start gap-1.5 text-[10px] font-bold uppercase tracking-wider leading-tight text-[var(--muted-foreground)]">
                <Calculator size={12} className="text-[var(--sidebar-primary)] shrink-0 mt-px" />
                Budżet do zaplanowania
              </span>
              <p className="text-sm font-extrabold text-[var(--foreground)] whitespace-nowrap">{formatBudget(availableBudget, currency)}</p>
            </div>
          </div>

        </div>

        {/* Header controls */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Coins size={14} className="text-[var(--sidebar-primary)]" />
            <span>Planowane wydatki według kategorii · plan, nie koszty rzeczywiste</span>
          </div>

          {canEdit && <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={openAddDrawer}
              className="text-[11px] h-8 px-4 rounded-md flex items-center gap-1.5 transition font-bold shadow-sm bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
            >
              <Plus size={13} />
              <span>Dodaj / Edytuj</span>
            </Button>
          </div>}
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
        <div className="max-h-[500px] overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 border-r border-[var(--border)] min-w-[200px]">Planowany wydatek</th>
                <th className="px-4 py-2 text-center border-r border-[var(--border)] w-44 whitespace-nowrap">Planowany udział (%)</th>
                <th className="px-4 py-2 text-right border-r border-[var(--border)] w-40 whitespace-nowrap">Planowana kwota</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody className="font-medium">
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-[var(--muted-foreground)]">
                    Ładowanie planu wydatków...
                  </td>
                </tr>
              </tbody>
            ) : expenses.length === 0 ? (
              <tbody className="font-medium">
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-[var(--muted-foreground)] italic text-[11px]">
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
        savePlanMut={savePlanMut}
      />
    </div>
  )
}
