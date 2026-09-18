import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, FileText, Calendar, Banknote, Save, Percent, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiMilestone } from '@/features/projects/types'

type InvoiceFormDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { invoiceNumber: string; netValue: number; issuedDate: string; note?: string }) => void
  isSubmitting: boolean
  milestone: ApiMilestone | null
  contractVal: number
}

export function InvoiceFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  milestone,
  contractVal,
}: InvoiceFormDrawerProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [netValue, setNetValue] = useState('')
  const [percentage, setPercentage] = useState('')
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  // Reset form when opened with a new milestone
  useEffect(() => {
    if (isOpen && milestone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvoiceNumber('')
      setNetValue('')
      setPercentage('')
      setIssuedDate(new Date().toISOString().split('T')[0])
      setNote('')
      setError('')
    }
  }, [isOpen, milestone])

  if (!isOpen || !milestone) return null

  const milestoneTotal = milestone.type === 'KM' 
    ? Math.round(((milestone.percentage / 100) * contractVal) * 100) / 100
    : (milestone.netAmount || 0)

  const alreadyInvoicedPct = milestone.invoicingPercentage || 0
  const maxRemainingPct = Math.max(0, 100 - alreadyInvoicedPct)
  const maxRemainingNet = Math.max(0, milestoneTotal - (milestoneTotal * alreadyInvoicedPct / 100))

  const handleNetValueChange = (val: string) => {
    setNetValue(val)
    const num = parseFloat(val)
    if (!isNaN(num) && milestoneTotal > 0) {
      setPercentage(((num / milestoneTotal) * 100).toFixed(2))
    } else {
      setPercentage('')
    }
  }

  const handlePercentageChange = (val: string) => {
    setPercentage(val)
    const pct = parseFloat(val)
    if (!isNaN(pct) && milestoneTotal > 0) {
      setNetValue(((pct / 100) * milestoneTotal).toFixed(2))
    } else {
      setNetValue('')
    }
  }

  const handleFillRemaining = () => {
    setPercentage(maxRemainingPct.toFixed(2))
    setNetValue(maxRemainingNet.toFixed(2))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!invoiceNumber.trim()) {
      setError('Numer faktury jest wymagany.')
      return
    }
    
    const parsedValue = parseFloat(netValue)
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setError('Kwota netto musi być większa od 0.')
      return
    }

    if (parsedValue > maxRemainingNet + 0.1) {
      if (!confirm('Kwota faktury przekracza pozostałą kwotę etapu. Czy na pewno chcesz kontynuować?')) {
        return
      }
    }

    onSubmit({
      invoiceNumber: invoiceNumber.trim(),
      netValue: parsedValue,
      issuedDate,
      note: note.trim() || undefined,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="relative bg-[var(--card)] text-[var(--foreground)] border-l border-[var(--border)] shadow-2xl w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--foreground)] leading-tight">Nowa faktura</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-[250px]">
                {milestone.milestoneNo} - {milestone.description}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-md transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-[var(--background)]/20">
          <div className="mb-6 p-4 rounded-xl border border-[var(--sidebar-primary)]/20 bg-[var(--sidebar-primary)]/5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)]">Wartość całkowita etapu:</span>
              <span className="font-bold">{milestoneTotal.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)]">Już zafakturowano:</span>
              <span className="font-medium text-amber-600 dark:text-amber-500">{alreadyInvoicedPct.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-[var(--sidebar-primary)]/10 pt-2 mt-1">
              <span className="text-[var(--sidebar-primary)] font-semibold">Pozostało do zafakturowania:</span>
              <span className="font-bold text-[var(--sidebar-primary)]">
                {maxRemainingNet.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
                <span className="text-xs ml-1 opacity-70">({maxRemainingPct.toFixed(1)}%)</span>
              </span>
            </div>
          </div>

          <form id="invoice-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                Numer faktury <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="np. FV/10/2026"
                  className="h-10 w-full pl-10 pr-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1 flex justify-between">
                  <span>Kwota netto <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={netValue}
                    onChange={e => handleNetValueChange(e.target.value)}
                    placeholder="0.00"
                    className="h-10 w-full pl-10 pr-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                  Procent etapu (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    value={percentage}
                    onChange={e => handlePercentageChange(e.target.value)}
                    placeholder="0.00"
                    className="h-10 w-full pl-10 pr-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end -mt-3">
              <button 
                type="button" 
                onClick={handleFillRemaining}
                className="text-[11px] text-[var(--sidebar-primary)] hover:underline font-medium"
              >
                Uzupełnij pozostałą kwotą ({maxRemainingPct.toFixed(1)}%)
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                Data wystawienia <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="date"
                  value={issuedDate}
                  onChange={e => setIssuedDate(e.target.value)}
                  className="h-10 w-full pl-10 pr-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                Uwagi (opcjonalnie)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Dodatkowe informacje..."
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 resize-none h-24"
              />
            </div>
          </form>
          
          {milestone.invoices && milestone.invoices.length > 0 && (
            <div className="mt-8 pt-4 space-y-3 border-t border-[var(--sidebar-primary)]/10">
              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Historia zafakturowana</h4>
              <div className="space-y-2">
                {milestone.invoices.map((inv) => {
                  const pct = milestoneTotal > 0 ? ((inv.netValue / milestoneTotal) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={inv.id} className="p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col gap-1.5 text-sm shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-[var(--sidebar-primary)]">{inv.invoiceNumber}</span>
                        <span className="text-xs text-[var(--muted-foreground)] bg-[var(--background)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                          {inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString('pl-PL') : 'Brak daty'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-[var(--foreground)] font-medium">Netto: {inv.netValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</span>
                        <span className="text-[var(--muted-foreground)] font-bold">{pct}%</span>
                      </div>
                      {inv.note && <p className="text-xs text-[var(--muted-foreground)] bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-md mt-1 italic">{inv.note}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--card)] shrink-0 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-10 px-5">
            Anuluj
          </Button>
          <Button type="submit" form="invoice-form" disabled={isSubmitting} className="h-10 px-6 gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Zapisywanie...' : 'Zapisz fakturę'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
