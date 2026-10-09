import { useState } from 'react'
import { ArrowLeft, FileText, Plus, Trash2, CheckCircle2, AlertTriangle, Calculator, PieChart, Banknote, Edit3, Link as LinkIcon, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiMilestone, ApiMilestoneInvoice, ApiWorkType } from '@/features/projects/types'
import { MilestoneInvoiceDonut } from './MilestoneInvoiceDonut'

type MilestoneInvoicesViewProps = {
  milestone: ApiMilestone
  contractVal: number
  currency: string
  canEditProject: boolean
  canManageInvoiceDetails?: boolean
  onClose: () => void
  onAddInvoiceClick: (milestone: ApiMilestone) => void
  onEditInvoiceClick?: (milestone: ApiMilestone, invoice: ApiMilestoneInvoice) => void
  onRemoveInvoiceClick: (milestoneId: string, invoiceId: string) => void
  formatBudget: (val: number, currency?: string) => string
  works?: ApiWorkType[]
}

export function MilestoneInvoicesView({
  milestone,
  contractVal,
  currency,
  canEditProject,
  canManageInvoiceDetails = false,
  onClose,
  onAddInvoiceClick,
  onEditInvoiceClick,
  onRemoveInvoiceClick,
  formatBudget,
  works = [],
}: MilestoneInvoicesViewProps) {
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)

  // Calculations
  const milestoneTotal = Math.round((contractVal ? (milestone.percentage / 100) * contractVal : 0) * 100) / 100
  const invoicedNet = milestone.invoices?.reduce((sum, inv) => sum + inv.netValue, 0) || 0
  
  const paidNet = milestone.invoices?.filter(i => i.status === 'ZAPŁACONE').reduce((sum, inv) => sum + inv.netValue, 0) || 0
  const invoicedNotPaidNet = invoicedNet - paidNet

  let remainingNet = Math.max(0, Math.round((milestoneTotal - invoicedNet) * 100) / 100)
  if (remainingNet < 0.1) remainingNet = 0
  
  const invoicedPct = milestoneTotal > 0 ? (invoicedNet / milestoneTotal) * 100 : 0
  
  const isSettled = invoicedNet >= milestoneTotal - 0.1
  const isOverbudget = invoicedNet > milestoneTotal + 0.1

  const milestoneWorks = works.filter(w => w.milestoneId === milestone.id)

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm gap-4 animate-tab-content relative">
      {/* 1. Header (Back button, Title, Status Badges) */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--muted)]/50 hover:bg-[var(--muted)] shrink-0 mt-0.5">
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[var(--foreground)] truncate">
                Faktury: {milestone.milestoneNo}
              </h2>
              {isSettled && !isOverbudget && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                  <CheckCircle2 size={11} />
                  Rozliczony
                </span>
              )}
              {isOverbudget && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 whitespace-nowrap">
                  <AlertTriangle size={11} />
                  Przekroczono
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-1 pr-4" title={milestone.description}>
              {milestone.description}
            </p>
          </div>
        </div>
      </div>
      
      {/* 2. Donut & Works List Combined Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-4 shadow-2xs flex flex-col md:flex-row items-stretch gap-6 shrink-0 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {/* Donut Chart */}
          <div className="flex-1 flex justify-center md:justify-center items-center py-2 md:py-0">
            <MilestoneInvoiceDonut 
              total={milestoneTotal}
              paid={paidNet}
              invoicedNotPaid={invoicedNotPaidNet}
              remaining={remainingNet}
              currency={currency}
            />
          </div>
          
          {/* Works List */}
          <div className="flex-1 flex flex-col min-h-[100px] max-h-[140px] md:pl-6 pt-4 md:pt-0 overflow-hidden">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5 shrink-0">
              <Layers size={12} className="text-[var(--sidebar-primary)]" />
              Roboty w tym etapie ({milestoneWorks.length})
            </h4>
            {milestoneWorks.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] italic flex-1 flex items-center justify-center text-center">Brak przypisanych robót</p>
            ) : (
              <ul className="space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
                {milestoneWorks.map((w, idx) => (
                  <li key={w.id} className="text-[11px] font-medium text-[var(--foreground)] flex items-start gap-2 leading-snug">
                    <span className="text-[var(--muted-foreground)] font-bold shrink-0">{idx + 1}.</span>
                    <span className="line-clamp-2" title={w.name}>{w.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
      </div>
      
      {/* 3. Table Header & Add Button */}
      <div className="flex justify-between items-center mt-2 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          <FileText size={14} className="text-[var(--sidebar-primary)]" />
          Lista wystawionych faktur
        </h3>
        {canEditProject && (
          <Button
            size="sm"
            onClick={() => onAddInvoiceClick(milestone)}
            className="rounded-xl text-xs h-8 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-[0_4px_12px_color-mix(in_oklch,var(--sidebar-primary),transparent_75%)] hover:bg-[var(--sidebar-primary)]/90"
          >
            <Plus size={13} className="mr-1" />
            Dodaj Fakturę
          </Button>
        )}
      </div>

      {/* 4. Data Table */}
      <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs flex flex-col">
        {milestone.invoices && milestone.invoices.length > 0 ? (
          <div className="flex-1 overflow-auto custom-scrollbar">
           <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-1.5 border-r border-[var(--border)] whitespace-nowrap">Nr faktury</th>
                    <th className="px-3 py-1.5 border-r border-[var(--border)] text-center w-40 whitespace-nowrap">Data wniosku/wyst.</th>
                    <th className="px-3 py-1.5 border-r border-[var(--border)] text-right w-44 whitespace-nowrap">Kwota netto</th>
                    <th className="px-3 py-1.5 border-r border-[var(--border)] text-center whitespace-nowrap">Status</th>
                    <th className="px-3 py-1.5 border-r border-[var(--border)] w-1/3">Uwagi</th>
                    {canManageInvoiceDetails && <th className="px-2 py-1.5 text-right w-16">Akcje</th>}
                 </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                 {milestone.invoices.map((inv, index) => (
                   <tr 
                     key={inv.id} 
                     style={{ animationDelay: `${index * 25}ms` }}
                     className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 align-middle cursor-default"
                   >
                      <td className="px-3 py-2 border-r border-[var(--border)] text-[var(--foreground)] font-bold">
                        {inv.invoiceNumber || <span className="text-zinc-400 font-normal italic">Brak numeru</span>}
                        {inv.link && (
                          <a href={inv.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-2 text-[var(--sidebar-primary)] hover:underline" title="Link do faktury">
                            <LinkIcon className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-[var(--border)] text-[var(--foreground)] text-center whitespace-nowrap font-medium">
                        {inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString('pl-PL') : '-'}
                      </td>
                      <td className="px-3 py-2 border-r border-[var(--border)] text-right text-[var(--foreground)] font-bold">{formatBudget(inv.netValue, currency)}</td>
                      <td className="px-3 py-2 border-r border-[var(--border)] text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'ZAPŁACONE'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : inv.status === 'WYSTAWIONA' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {inv.status || 'OCZEKUJE'}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-[var(--border)] text-[var(--muted-foreground)] text-[10px] leading-snug">
                        {inv.note ? <span className="line-clamp-2" title={inv.note}>{inv.note}</span> : '-'}
                      </td>
                      {canManageInvoiceDetails && (
                         <td className="px-2 py-2 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <button
                                onClick={() => onEditInvoiceClick && onEditInvoiceClick(milestone, inv)}
                                className="p-1.5 text-zinc-400 hover:text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 rounded-md transition-all"
                                title="Edytuj fakturę"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                             <button
                                onClick={() => setInvoiceToDelete(inv.id)}
                                className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                title="Usuń fakturę"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>
                         </td>
                      )}
                   </tr>
                 ))}
              </tbody>
           </table>
          </div>
        ) : (
           <div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted-foreground)] text-xs italic p-6 gap-3">
             <div className="p-3 bg-[var(--muted)]/50 rounded-full">
               <FileText className="w-6 h-6 opacity-50" />
             </div>
             <div>
               Brak wystawionych faktur dla tego etapu.<br/>Kliknij <strong className="text-[var(--foreground)]">"Dodaj Fakturę"</strong> aby rozpocząć rozliczanie.
             </div>
           </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl motion-safe:animate-[auth-rise_320ms_ease-out]">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[var(--foreground)]">Usuń fakturę</h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Czy na pewno chcesz usunąć tę fakturę? Tej operacji nie można cofnąć.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInvoiceToDelete(null)}
                className="h-8 text-xs rounded-xl"
              >
                Anuluj
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onRemoveInvoiceClick(milestone.id, invoiceToDelete)
                  setInvoiceToDelete(null)
                }}
                className="h-8 text-xs rounded-xl"
              >
                Usuń fakturę
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
