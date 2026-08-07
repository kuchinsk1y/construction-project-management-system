import { Layers, Loader2, Plus, Trash2, Wallet } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import type { ApiMilestone, CreateMilestonePayload, ApiProject } from '@/features/projects/types'

type MilestonesTabProps = {
  milestones: ApiMilestone[]
  milestonesLoading: boolean
  editingProject: ApiProject | null
  canEditProject: boolean
  editingMilestoneId: string | null
  handleMilestoneSubmit: (e: React.FormEvent) => void
  createMilestoneMutation: UseMutationResult<ApiMilestone, Error, CreateMilestonePayload, unknown>
  updateMilestoneMutation: UseMutationResult<ApiMilestone, Error, { id: string; payload: Partial<CreateMilestonePayload> }, unknown>
  deleteMilestoneMutation: UseMutationResult<void, Error, string, unknown>
  handleCloseDrawer: () => void
  formatBudget: (val: number, currency?: string) => string
  /** Called when user clicks "Edytuj" to open bulk-edit drawer */
  onBulkEdit: () => void
}

export function MilestonesTab({
  milestones,
  milestonesLoading,
  editingProject,
  canEditProject,
  deleteMilestoneMutation,
  handleCloseDrawer,
  formatBudget,
  onBulkEdit,
}: MilestonesTabProps) {
  const contractVal = editingProject?.contract_net_value ? Number(editingProject.contract_net_value) : 0
  const currency = editingProject?.currency || 'PLN'

  // Calculations: only KM milestones count toward % total
  const kmMilestones = milestones.filter((m) => m.type === 'KM')
  const totalPct = kmMilestones.reduce((s, m) => s + (m.percentage || 0), 0)
  const totalNet = Math.round(milestones.reduce((s, m) => s + (m.netAmount || (m.type === 'KM' ? contractVal * (m.percentage / 100) : 0)), 0) * 100) / 100
  const diffNet = Math.round((contractVal - totalNet) * 100) / 100

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-5 shadow-sm space-y-5 animate-tab-content">
      {/* Header Action Bar & Summary Stats */}
      <div className="flex flex-col gap-4">
        {/* Overall Allocation Progress Bar */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Wallet size={14} className="text-[var(--sidebar-primary)]" />
              Suma udziałów etapów w budżecie
            </span>
            <span className={`font-extrabold ${totalPct === 100 ? 'text-emerald-500' : totalPct > 100 ? 'text-rose-500' : 'text-amber-500'}`}>
              {totalPct.toFixed(1)}% / 100%
            </span>
          </div>
          <div className="relative h-3.5 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalPct === 100 ? 'bg-emerald-500' : totalPct > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(totalPct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted-foreground)]">
            <span>Suma przypisana: {formatBudget(totalNet, currency)}</span>
            <span>Wartość kontraktu: {formatBudget(contractVal, currency)}</span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Wartość kontraktu netto</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(contractVal, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Suma kwot netto etapów</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(totalNet, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Pozostało do przypisania</span>
            <p className={`text-sm font-extrabold ${diffNet === 0 ? 'text-emerald-500' : diffNet < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
              {formatBudget(diffNet, currency)}
            </p>
          </div>
        </div>

        {/* Header controls */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Layers size={14} className="text-[var(--sidebar-primary)]" />
            <span>Harmonogram i Tabela Etapów (Kamienie Milowe)</span>
          </div>

          {canEditProject && (
            <div className="flex items-center gap-2">
              {/* Dodaj / Edytuj etapy */}
              <Button
                type="button"
                size="sm"
                onClick={onBulkEdit}
                className="rounded-xl text-xs h-8 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_12px_color-mix(in_oklch,var(--sidebar-primary),transparent_75%)]"
              >
                <Plus size={13} className="mr-1" />
                Dodaj / Edytuj etapy
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Milestones Data Table */}
      {milestonesLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={24} />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--card)] shadow-xs">
          <div className="max-h-[520px] overflow-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-[var(--background)]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2.5 text-center w-16 border-r border-zinc-200/70 dark:border-zinc-800/70">Nr</th>
                  <th className="px-3 py-2.5 text-center w-28 border-r border-zinc-200/70 dark:border-zinc-800/70">Typ</th>
                  <th className="px-3.5 py-2.5 border-r border-zinc-200/70 dark:border-zinc-800/70">Etap / Opis prac</th>
                  <th className="px-3 py-2.5 text-center w-24 border-r border-zinc-200/70 dark:border-zinc-800/70">% Udziału</th>
                  <th className="px-3.5 py-2.5 text-right w-40 border-r border-zinc-200/70 dark:border-zinc-800/70">Kwota netto</th>
                  {canEditProject && <th className="px-3 py-2.5 text-center w-16">Akcje</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 font-medium">
                {milestones.map((m, index) => {
                  const netValue = Math.round((m.netAmount ? m.netAmount : (contractVal ? (m.percentage / 100) * contractVal : 0)) * 100) / 100
                  const isRoboty = m.type === 'roboty_dodatkowe'

                  return (
                    <tr
                      key={m.id}
                      style={{ animationDelay: `${index * 25}ms` }}
                      className="group transition-colors hover:bg-[var(--sidebar-primary)]/[0.04] align-middle"
                    >
                      {/* Nr Symbol */}
                      <td className="px-3 py-2.5 text-center border-r border-zinc-200/60 dark:border-zinc-800/60 font-bold">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] shadow-2xs font-extrabold ${isRoboty ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]'}`}>
                          {m.milestoneNo}
                        </span>
                      </td>

                      {/* Typ */}
                      <td className="px-3 py-2.5 text-center border-r border-zinc-200/60 dark:border-zinc-800/60">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${isRoboty ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-[var(--sidebar-primary)]/8 text-[var(--sidebar-primary)]'}`}>
                          {isRoboty ? 'Rob. dod.' : 'KM'}
                        </span>
                      </td>

                      {/* Etap / Opis */}
                      <td className="px-3.5 py-2.5 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[var(--foreground)] font-semibold leading-relaxed">
                        {m.description}
                      </td>

                      {/* % Udziału */}
                      <td className="px-3 py-2.5 text-center border-r border-zinc-200/60 dark:border-zinc-800/60 font-bold">
                        {isRoboty ? (
                          <span className="text-[11px] text-[var(--muted-foreground)] italic">—</span>
                        ) : (
                          <span className="inline-block rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] border border-zinc-200 dark:border-zinc-700/60">
                            {m.percentage.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Kwota netto */}
                      <td className="px-3.5 py-2.5 text-right border-r border-zinc-200/60 dark:border-zinc-800/60 font-bold text-[var(--foreground)]">
                        {formatBudget(netValue, currency)}
                      </td>

                      {/* Akcje — only delete */}
                      {canEditProject && (
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => deleteMilestoneMutation.mutate(m.id)}
                            disabled={deleteMilestoneMutation.isPending}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
                            title="Usuń"
                          >
                            {deleteMilestoneMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}

                {milestones.length === 0 && (
                  <tr>
                    <td colSpan={canEditProject ? 6 : 5} className="text-center py-10 text-xs text-[var(--muted-foreground)]">
                      Brak zdefiniowanych kamieni milowych dla tego projektu.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Summary Footer Row */}
              {milestones.length > 0 && (
                <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-[var(--background)]/90 font-extrabold text-xs">
                  <tr>
                    <td className="px-3 py-3 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 text-[var(--sidebar-primary)]">
                      RAZEM
                    </td>
                    <td className="px-3 py-3 text-center border-r border-zinc-200/70 dark:border-zinc-800/70" />
                    <td className="px-3.5 py-3 border-r border-zinc-200/70 dark:border-zinc-800/70 text-[var(--foreground)] uppercase text-[10px] tracking-wider">
                      Suma całkowita
                    </td>
                    <td className="px-3 py-3 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 text-[var(--foreground)]">
                      {totalPct.toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-3 text-right border-r border-zinc-200/70 dark:border-zinc-800/70 text-[var(--foreground)]">
                      {formatBudget(totalNet, currency)}
                    </td>
                    {canEditProject && <td className="px-3 py-3" />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Back Footer */}
      <div className="border-t border-[var(--border)] pt-4 flex items-center justify-end">
        <Button type="button" variant="outline" onClick={handleCloseDrawer} className="rounded-xl">
          Zamknij
        </Button>
      </div>
    </div>
  )
}
