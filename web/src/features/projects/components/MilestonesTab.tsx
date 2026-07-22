import { Check, CheckCircle2, Edit, Layers, Loader2, Plus, Trash2, X } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import type { ApiMilestone, CreateMilestonePayload, ApiProject } from '@/features/projects/types'

type MilestonesTabProps = {
  milestones: ApiMilestone[]
  milestonesLoading: boolean
  editingProject: ApiProject | null
  canEditProject: boolean
  showMilestoneForm: boolean
  setShowMilestoneForm: (show: boolean) => void
  milestoneForm: CreateMilestonePayload
  setMilestoneForm: React.Dispatch<React.SetStateAction<CreateMilestonePayload>>
  editingMilestoneId: string | null
  setEditingMilestoneId: (id: string | null) => void
  milestoneError: string
  setMilestoneError: (err: string) => void
  handleMilestoneSubmit: (e: React.FormEvent) => void
  createMilestoneMutation: UseMutationResult<any, Error, CreateMilestonePayload, unknown>
  updateMilestoneMutation: UseMutationResult<any, Error, { id: string; payload: Partial<CreateMilestonePayload> }, unknown>
  deleteMilestoneMutation: UseMutationResult<any, Error, string, unknown>
  handleCloseDrawer: () => void
  formatBudget: (val: number, currency?: string) => string
}

export function MilestonesTab({
  milestones,
  milestonesLoading,
  editingProject,
  canEditProject,
  showMilestoneForm,
  setShowMilestoneForm,
  milestoneForm,
  setMilestoneForm,
  editingMilestoneId,
  setEditingMilestoneId,
  milestoneError,
  setMilestoneError,
  handleMilestoneSubmit,
  createMilestoneMutation,
  updateMilestoneMutation,
  deleteMilestoneMutation,
  handleCloseDrawer,
  formatBudget,
}: MilestonesTabProps) {
  const contractVal = editingProject?.contract_net_value ? Number(editingProject.contract_net_value) : 0
  const totalPct = milestones.reduce((s, m) => s + (m.percentage || 0), 0)
  const totalNet = milestones.reduce((s, m) => s + (m.netAmount || (contractVal * (m.percentage / 100))), 0)
  const totalInvoiced = milestones.reduce((s, m) => {
    if (m.invoicingPercentage) return s + (contractVal * (m.invoicingPercentage / 100))
    return s + (m.netAmount || (contractVal * (m.percentage / 100)))
  }, 0)
  const totalRemaining = Math.max(0, totalNet - totalInvoiced)
  const currency = editingProject?.currency || 'PLN'

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-5 shadow-sm space-y-5 animate-tab-content">
      {/* Header Action Bar & Summary Stats */}
      <div className="flex flex-col gap-4">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <span>Łączny Udział %</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${totalPct === 100 ? 'bg-emerald-500/10 text-emerald-500' : totalPct > 100 ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {totalPct.toFixed(1)}% / 100%
              </span>
            </div>
            <div className="relative h-2 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-all duration-300 ${totalPct === 100 ? 'bg-emerald-500' : totalPct > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(totalPct, 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Kwota Netto Etapów</span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{formatBudget(totalNet, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Pozostało Netto</span>
            <p className="text-sm font-extrabold text-amber-500">{formatBudget(totalRemaining, currency)}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Wystawiono (Faktury)</span>
            <p className="text-sm font-extrabold text-emerald-500">{formatBudget(totalInvoiced, currency)}</p>
          </div>
        </div>

        {/* Header controls */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Layers size={14} className="text-[var(--sidebar-primary)]" />
            <span>Harmonogram i Tabela Etapów (Kamienie Milowe)</span>
          </div>
          {canEditProject && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (showMilestoneForm && !editingMilestoneId) {
                  setShowMilestoneForm(false)
                } else {
                  setEditingMilestoneId(null)
                  setMilestoneForm({ milestoneNo: `KM ${milestones.length + 1}`, description: '', percentage: 0 })
                  setMilestoneError('')
                  setShowMilestoneForm(true)
                }
              }}
              className="rounded-xl text-xs h-8 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
            >
              <Plus size={13} className="mr-1" />
              {showMilestoneForm && !editingMilestoneId ? 'Zamknij formularz' : 'Dodaj nowy etap'}
            </Button>
          )}
        </div>
      </div>

      {milestoneError && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-500 font-medium">
          {milestoneError}
        </div>
      )}

      {/* Expandable Add / Edit Milestone Form */}
      {showMilestoneForm && (
        <div className="rounded-xl border border-[var(--sidebar-primary)]/30 bg-[var(--background)]/60 p-4 space-y-3 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sidebar-primary)]">
              {editingMilestoneId ? 'Edytuj kamień milowy' : 'Nowy kamień milowy'}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowMilestoneForm(false)
                setEditingMilestoneId(null)
                setMilestoneForm({ milestoneNo: '', description: '', percentage: 0 })
                setMilestoneError('')
              }}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleMilestoneSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <label className="block md:col-span-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Symbol (KM) <span className="text-rose-500">*</span>
              </span>
              <input
                value={milestoneForm.milestoneNo}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, milestoneNo: e.target.value }))}
                placeholder="np. KM 1"
                className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--sidebar-primary)]"
              />
            </label>
            <label className="block md:col-span-5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Nazwa etapu <span className="text-rose-500">*</span>
              </span>
              <input
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="np. Prace przygotowawcze i montaż"
                className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--sidebar-primary)]"
              />
            </label>
            <label className="block md:col-span-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Udział (%) <span className="text-rose-500">*</span>
              </span>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={milestoneForm.percentage || ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, percentage: e.target.value ? Number(e.target.value) : 0 }))}
                placeholder="np. 10.0"
                className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--sidebar-primary)]"
              />
            </label>
            <label className="block md:col-span-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Fakturowanie (%)</span>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={milestoneForm.invoicingPercentage || ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, invoicingPercentage: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Domyślnie jak wyżej"
                className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--sidebar-primary)]"
              />
            </label>
            <div className="md:col-span-12 flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMilestoneForm(false)
                  setEditingMilestoneId(null)
                  setMilestoneForm({ milestoneNo: '', description: '', percentage: 0 })
                }}
                className="h-8 text-xs rounded-xl"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                className="h-8 text-xs rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]"
              >
                {createMilestoneMutation.isPending || updateMilestoneMutation.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                {editingMilestoneId ? 'Zapisz zmiany' : 'Dodaj etap'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Milestones Data Table */}
      {milestonesLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={24} />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
          <div className="max-h-[520px] overflow-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2.5 text-center w-16 border-r border-[var(--border)]/40">KM</th>
                  <th className="px-3.5 py-2.5 border-r border-[var(--border)]/40">Etap / Opis prac</th>
                  <th className="px-3 py-2.5 text-center w-24 border-r border-[var(--border)]/40">% Udziału</th>
                  <th className="px-3.5 py-2.5 text-right w-36 border-r border-[var(--border)]/40">Kwota netto</th>
                  <th className="px-3.5 py-2.5 text-right w-36 border-r border-[var(--border)]/40">Pozostało netto</th>
                  <th className="px-3 py-2.5 text-center w-24 border-r border-[var(--border)]/40">Faktura</th>
                  <th className="px-3.5 py-2.5 text-right w-36 border-r border-[var(--border)]/40">Wystawiona kwota</th>
                  {canEditProject && <th className="px-3 py-2.5 text-center w-20">Akcje</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50 font-medium">
                {milestones.map((m, index) => {
                  const netValue = m.netAmount ? m.netAmount : (contractVal ? (m.percentage / 100) * contractVal : 0)
                  const invoicedVal = m.invoicingPercentage
                    ? (contractVal * (m.invoicingPercentage / 100))
                    : netValue
                  const remainingVal = Math.max(0, netValue - invoicedVal)
                  const isFullyInvoiced = remainingVal === 0 && netValue > 0

                  return (
                    <tr
                      key={m.id}
                      style={{ animationDelay: `${index * 25}ms` }}
                      className="group transition-colors hover:bg-[var(--sidebar-primary)]/[0.04] align-middle"
                    >
                      {/* KM Symbol */}
                      <td className="px-3 py-2.5 text-center border-r border-[var(--border)]/30 font-bold">
                        <span className="inline-block rounded-md bg-[var(--sidebar-primary)]/10 px-2 py-0.5 text-[11px] text-[var(--sidebar-primary)] shadow-2xs">
                          {m.milestoneNo}
                        </span>
                      </td>

                      {/* Etap / Opis */}
                      <td className="px-3.5 py-2.5 border-r border-[var(--border)]/30 text-[var(--foreground)] font-semibold leading-relaxed">
                        {m.description}
                      </td>

                      {/* % Udziału */}
                      <td className="px-3 py-2.5 text-center border-r border-[var(--border)]/30 font-bold">
                        <span className="inline-block rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] border border-[var(--border)]">
                          {m.percentage.toFixed(1)}%
                        </span>
                      </td>

                      {/* Kwota netto */}
                      <td className="px-3.5 py-2.5 text-right border-r border-[var(--border)]/30 font-bold text-[var(--foreground)]">
                        {formatBudget(netValue, currency)}
                      </td>

                      {/* Pozostało netto */}
                      <td className="px-3.5 py-2.5 text-right border-r border-[var(--border)]/30 font-semibold text-amber-500">
                        {formatBudget(remainingVal, currency)}
                      </td>

                      {/* Faktura Status */}
                      <td className="px-3 py-2.5 text-center border-r border-[var(--border)]/30">
                        {isFullyInvoiced ? (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto" title="Faktura wystawiona">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-[var(--muted)]/40 text-[var(--muted-foreground)]/60 mx-auto" title="W trakcie">
                            -
                          </span>
                        )}
                      </td>

                      {/* Wystawiona kwota */}
                      <td className="px-3.5 py-2.5 text-right border-r border-[var(--border)]/30 font-semibold text-emerald-500">
                        {formatBudget(invoicedVal, currency)}
                      </td>

                      {/* Akcje */}
                      {canEditProject && (
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMilestoneId(m.id)
                                setMilestoneForm({
                                  milestoneNo: m.milestoneNo,
                                  description: m.description,
                                  percentage: m.percentage,
                                  invoicingPercentage: m.invoicingPercentage ?? undefined,
                                })
                                setShowMilestoneForm(true)
                              }}
                              className="rounded-lg p-1.5 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 transition cursor-pointer"
                              title="Edytuj"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMilestoneMutation.mutate(m.id)}
                              disabled={deleteMilestoneMutation.isPending}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
                              title="Usuń"
                            >
                              {deleteMilestoneMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}

                {milestones.length === 0 && (
                  <tr>
                    <td colSpan={canEditProject ? 8 : 7} className="text-center py-10 text-xs text-[var(--muted-foreground)]">
                      Brak zdefiniowanych kamieni milowych dla tego projektu.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Summary Excel-style Footer Row */}
              {milestones.length > 0 && (
                <tfoot className="border-t-2 border-[var(--border)] bg-[var(--background)]/90 font-extrabold text-xs">
                  <tr>
                    <td className="px-3 py-3 text-center border-r border-[var(--border)]/40 text-[var(--sidebar-primary)]">
                      RAZEM
                    </td>
                    <td className="px-3.5 py-3 border-r border-[var(--border)]/40 text-[var(--foreground)] uppercase text-[10px] tracking-wider">
                      Suma całkowita etapu
                    </td>
                    <td className="px-3 py-3 text-center border-r border-[var(--border)]/40 text-[var(--foreground)]">
                      {totalPct.toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-3 text-right border-r border-[var(--border)]/40 text-[var(--foreground)]">
                      {formatBudget(totalNet, currency)}
                    </td>
                    <td className="px-3.5 py-3 text-right border-r border-[var(--border)]/40 text-amber-500">
                      {formatBudget(totalRemaining, currency)}
                    </td>
                    <td className="px-3 py-3 text-center border-r border-[var(--border)]/40">
                      <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                    </td>
                    <td className="px-3.5 py-3 text-right border-r border-[var(--border)]/40 text-emerald-500">
                      {formatBudget(totalInvoiced, currency)}
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
