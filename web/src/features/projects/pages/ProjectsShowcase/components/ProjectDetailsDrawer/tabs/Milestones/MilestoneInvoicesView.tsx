import { ArrowLeft, FileText, Plus, Trash2, CheckCircle2, AlertTriangle, Calculator, PieChart, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiMilestone } from '@/features/projects/types'

type MilestoneInvoicesViewProps = {
  milestone: ApiMilestone
  contractVal: number
  currency: string
  canEditProject: boolean
  onClose: () => void
  onAddInvoiceClick: (milestone: ApiMilestone) => void
  onRemoveInvoiceClick: (milestoneId: string, invoiceId: string) => void
  formatBudget: (val: number, currency?: string) => string
}

export function MilestoneInvoicesView({
  milestone,
  contractVal,
  currency,
  canEditProject,
  onClose,
  onAddInvoiceClick,
  onRemoveInvoiceClick,
  formatBudget,
}: MilestoneInvoicesViewProps) {
  // Calculations
  const milestoneTotal = Math.round((contractVal ? (milestone.percentage / 100) * contractVal : 0) * 100) / 100
  const invoicedNet = milestone.invoices?.reduce((sum, inv) => sum + inv.netValue, 0) || 0
  const remainingNet = Math.max(0, milestoneTotal - invoicedNet)
  const invoicedPct = milestoneTotal > 0 ? (invoicedNet / milestoneTotal) * 100 : 0
  
  const isSettled = invoicedPct >= 100
  const isOverbudget = invoicedPct > 100

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
      
      {/* 2. KPI Cards & Progress Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
          {/* Progress Bar Container */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-3 shadow-2xs flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <PieChart size={14} className="text-[var(--sidebar-primary)]" />
                Postęp fakturowania
              </span>
              <span className={`font-extrabold ${isSettled ? 'text-[var(--sidebar-primary)]' : isOverbudget ? 'text-rose-500' : 'text-amber-500'}`}>
                {invoicedPct.toFixed(1)}% / 100%
              </span>
            </div>
            <div className="relative h-3 w-full bg-[var(--muted)]/50 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isSettled ? 'bg-[var(--sidebar-primary)]' : isOverbudget ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(invoicedPct, 100)}%` }}
              />
            </div>
          </div>
          
          {/* KPI Dividers */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 shadow-xs flex items-center divide-x divide-[var(--border)] overflow-hidden">
            <div className="flex-[1.2] p-3 space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap truncate">
                <Calculator size={12} className="text-[var(--sidebar-primary)] shrink-0" />
                Wartość etapu
              </span>
              <p className="text-sm font-extrabold text-[var(--foreground)] truncate">{formatBudget(milestoneTotal, currency)}</p>
            </div>
            <div className="flex-1 p-3 space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap truncate">
                <FileText size={12} className="text-[var(--sidebar-primary)] shrink-0" />
                Zafakturowano
              </span>
              <p className={`text-sm font-extrabold truncate ${isSettled ? 'text-[var(--sidebar-primary)]' : isOverbudget ? 'text-rose-500' : 'text-amber-500'}`}>
                {formatBudget(invoicedNet, currency)}
              </p>
            </div>
            <div className="flex-1 p-3 space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap truncate">
                <Banknote size={12} className="text-[var(--sidebar-primary)] shrink-0" />
                Pozostało
              </span>
              <p className="text-sm font-extrabold text-[var(--foreground)] truncate">
                {isOverbudget ? formatBudget(0, currency) : formatBudget(remainingNet, currency)}
              </p>
            </div>
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
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--card)] shadow-xs flex flex-col">
        {milestone.invoices && milestone.invoices.length > 0 ? (
          <div className="flex-1 overflow-auto custom-scrollbar">
           <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-[var(--background)]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                 <tr>
                    <th className="px-3 py-1.5 border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Nr faktury</th>
                    <th className="px-3 py-1.5 border-r border-zinc-200/70 dark:border-zinc-800/70 text-center w-40 whitespace-nowrap">Data wystawienia</th>
                    <th className="px-3 py-1.5 border-r border-zinc-200/70 dark:border-zinc-800/70 w-1/3">Uwagi</th>
                    <th className="px-3 py-1.5 border-r border-zinc-200/70 dark:border-zinc-800/70 text-right w-44 whitespace-nowrap">Kwota netto</th>
                    {canEditProject && <th className="px-2 py-1.5 text-right w-16">Akcje</th>}
                 </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 font-medium">
                 {milestone.invoices.map((inv, index) => (
                   <tr 
                     key={inv.id} 
                     style={{ animationDelay: `${index * 25}ms` }}
                     className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 align-middle cursor-default"
                   >
                      <td className="px-3 py-2 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[var(--foreground)] font-bold">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[var(--muted-foreground)] text-center whitespace-nowrap">
                        <span className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
                          {inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString('pl-PL') : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[var(--muted-foreground)] text-[10px] leading-snug">
                        {inv.note ? <span className="line-clamp-2" title={inv.note}>{inv.note}</span> : '-'}
                      </td>
                      <td className="px-3 py-2 border-r border-zinc-200/60 dark:border-zinc-800/60 text-right text-[var(--foreground)] font-bold">{formatBudget(inv.netValue, currency)}</td>
                      {canEditProject && (
                         <td className="px-2 py-2 text-right">
                           <button
                              onClick={() => {
                                if (confirm('Czy na pewno chcesz usunąć tę fakturę?')) {
                                  onRemoveInvoiceClick(milestone.id, inv.id)
                                }
                              }}
                              className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                              title="Usuń fakturę"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
    </div>
  )
}
