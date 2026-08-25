import { Layers, Loader2, Plus, Wallet } from 'lucide-react' // Trash2
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
  // deleteMilestoneMutation,
  handleCloseDrawer,
  formatBudget,
  onBulkEdit,
}: MilestonesTabProps) {
  const contractVal = editingProject?.contract_net_value ? Number(editingProject.contract_net_value) : 0
  const currency = editingProject?.currency || 'PLN'

  // Calculations: only KM milestones count toward % total
  const kmMilestones = milestones.filter((m) => m.type === 'KM')
  const rdMilestones = milestones.filter((m) => m.type === 'roboty_dodatkowe')
  const totalPct = kmMilestones.reduce((s, m) => s + (m.percentage || 0), 0)
  const totalNet = Math.round(milestones.reduce((s, m) => s + (m.netAmount || (m.type === 'KM' ? contractVal * (m.percentage / 100) : 0)), 0) * 100) / 100
  const diffNet = Math.round((contractVal - totalNet) * 100) / 100

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm space-y-4 animate-tab-content">
      {/* Header Action Bar & Summary Stats */}
      <div className="flex flex-col gap-3">
        {/* Overall Allocation Progress Bar */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-3 space-y-2 shadow-2xs">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-2.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Wartość kontraktu netto</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(contractVal, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-2.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Suma kwot netto etapów</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(totalNet, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-2.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Pozostało do przypisania</span>
            <p className={`text-sm font-extrabold ${diffNet === 0 ? 'text-emerald-500' : diffNet < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
              {formatBudget(diffNet, currency)}
            </p>
          </div>
        </div>

        {/* Header controls */}
        <div className="flex items-center justify-between gap-3">
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

      {/* Milestones Data Tables */}
      {milestonesLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={24} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Kamienie Milowe Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[var(--sidebar-primary)] px-1 flex items-center gap-2">
              Kamienie Milowe (KM)
            </h3>
            <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--card)] shadow-xs">
              <div className="max-h-[400px] overflow-auto custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-[var(--background)]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-2 py-1.5 text-center w-24 border-r border-zinc-200/70 dark:border-zinc-800/70">Nr</th>
                      <th className="px-3 py-1.5 border-r border-zinc-200/70 dark:border-zinc-800/70">Etap / Opis prac</th>
                      <th className="px-2 py-1.5 text-center w-28 border-r border-zinc-200/70 dark:border-zinc-800/70">% Udziału</th>
                      <th className="px-3 py-1.5 text-right w-40 border-r border-zinc-200/70 dark:border-zinc-800/70">Kwota netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 font-medium">
                    {kmMilestones.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                          Brak zdefiniowanych kamieni milowych.
                        </td>
                      </tr>
                    ) : (
                      kmMilestones.map((m, index) => {
                        const netValue = Math.round((contractVal ? (m.percentage / 100) * contractVal : 0) * 100) / 100
                        return (
                          <tr
                            key={m.id}
                            style={{ animationDelay: `${index * 25}ms` }}
                            className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 align-middle cursor-default"
                          >
                            <td className="px-2 py-2 text-center border-r border-zinc-200/60 dark:border-zinc-800/60 font-bold">
                              <span className="inline-block rounded-md px-1.5 py-0.5 text-[11px] shadow-2xs font-extrabold bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                                {m.milestoneNo}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[var(--foreground)] font-normal leading-relaxed">
                              {m.description}
                            </td>
                            <td className="px-2 py-2 text-center border-r border-zinc-200/60 dark:border-zinc-800/60 font-bold">
                              <span className="inline-block rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] border border-zinc-200 dark:border-zinc-700/60">
                                {m.percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right border-r border-zinc-200/60 dark:border-zinc-800/60 font-bold text-[var(--foreground)]">
                              {formatBudget(netValue, currency)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  {kmMilestones.length > 0 && (
                    <tfoot className="border-t-2 border-zinc-200 dark:border-zinc-800 bg-[var(--background)]/40 font-bold text-xs">
                      <tr>
                        <td className="px-2 py-2.5 text-center text-[var(--sidebar-primary)]">
                          Razem
                        </td>
                        <td className="px-3 py-2.5 text-[var(--muted-foreground)] text-[11px] text-right">
                          Suma KM
                        </td>
                        <td className="px-2 py-2.5 text-center text-[var(--foreground)]">
                          {totalPct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--foreground)]">
                          <span className="underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 decoration-2">
                            {formatBudget(Math.round(kmMilestones.reduce((s, m) => s + (contractVal * (m.percentage / 100)), 0) * 100) / 100, currency)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Roboty Dodatkowe Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-500 px-1 flex items-center gap-2">
              Roboty Dodatkowe (RD)
            </h3>
            <div className="w-full overflow-hidden rounded-xl border border-amber-500/20 dark:border-amber-500/10 bg-[var(--card)] shadow-xs">
              <div className="max-h-[300px] overflow-auto custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-amber-500/20 dark:border-amber-500/10 bg-amber-500/5 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-amber-600/80 dark:text-amber-500/80">
                    <tr>
                      <th className="px-2 py-1.5 text-center w-24 border-r border-amber-500/10 dark:border-amber-500/10">Nr</th>
                      <th className="px-3 py-1.5 border-r border-amber-500/10 dark:border-amber-500/10">Opis prac</th>
                      <th className="px-3 py-1.5 text-right w-40 border-r border-amber-500/10 dark:border-amber-500/10">Kwota netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10 dark:divide-amber-500/10 font-medium">
                    {rdMilestones.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-xs text-amber-600/60 dark:text-amber-500/60">
                          Brak zdefiniowanych robót dodatkowych.
                        </td>
                      </tr>
                    ) : (
                      rdMilestones.map((m, index) => {
                        const netValue = m.netAmount || 0
                        return (
                          <tr
                            key={m.id}
                            style={{ animationDelay: `${index * 25}ms` }}
                            className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 align-middle cursor-default"
                          >
                            <td className="px-2 py-2 text-center border-r border-amber-500/10 dark:border-amber-500/10 font-bold">
                              <span className="inline-block rounded-md px-1.5 py-0.5 text-[11px] shadow-2xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {m.milestoneNo}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r border-amber-500/10 dark:border-amber-500/10 text-[var(--foreground)] font-normal leading-relaxed">
                              {m.description}
                            </td>
                            <td className="px-3 py-2 text-right border-r border-amber-500/10 dark:border-amber-500/10 font-bold text-[var(--foreground)]">
                              {formatBudget(netValue, currency)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  {rdMilestones.length > 0 && (
                    <tfoot className="border-t-2 border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 font-bold text-xs">
                      <tr>
                        <td className="px-2 py-2.5 text-center text-amber-600 dark:text-amber-400">
                          Razem
                        </td>
                        <td className="px-3 py-2.5 text-amber-600/70 dark:text-amber-500/70 text-[11px] text-right">
                          Suma RD
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--foreground)]">
                          <span className="underline underline-offset-4 decoration-amber-500/30 dark:decoration-amber-500/40 decoration-2">
                            {formatBudget(Math.round(rdMilestones.reduce((s, m) => s + (m.netAmount || 0), 0) * 100) / 100, currency)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Footer */}
      <div className="border-t border-[var(--border)] pt-3 flex items-center justify-end">
        <Button type="button" variant="outline" onClick={handleCloseDrawer} className="rounded-xl h-8 text-xs">
          Zamknij
        </Button>
      </div>
    </div>
  )
}
