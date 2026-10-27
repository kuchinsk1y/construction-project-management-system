import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteInvoice, deleteMilestoneInvoice, fetchInvoiceProtocol, updateInvoice, updateMilestoneInvoice } from '@/features/projects/api'
import type { ApiInvoice, UpdateInvoicePayload } from '@/features/projects/types'

/** Older invoices of a single milestone are shown in the same form; they are saved through the milestone API */
export type ManagedInvoice = ApiInvoice & { legacyMilestoneId?: string }
import { FakturowniaImportDrawer } from './FakturowniaImportDrawer'

type InvoiceManageDrawerProps = {
  invoice: ManagedInvoice
  onClose: () => void
  canManage: boolean
  country?: string | null
  currency: string
  formatBudget: (val: number, currency?: string) => string
}

const STATUS_OPTIONS = [
  { value: 'OCZEKUJE', label: 'Oczekuje' },
  { value: 'WYSTAWIONA', label: 'Wystawiona' },
  { value: 'ZAPŁACONE', label: 'Zapłacona' },
]

const invoiceStatusLabel = (status?: string | null) =>
  status === 'ZAPŁACONE' || status === 'ZAPŁACONA' ? 'ZAPŁACONA' : status === 'WYSTAWIONA' ? 'WYSTAWIONA' : 'OCZEKUJE'

const formatDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : '—')

export function InvoiceManageDrawer({ invoice, onClose, canManage, country, currency, formatBudget }: InvoiceManageDrawerProps) {
  const queryClient = useQueryClient()
  // Mounted per invoice (keyed by id), so the form starts from the saved values
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber ?? '')
  const [status, setStatus] = useState(() => {
    const label = invoiceStatusLabel(invoice.status)
    return label === 'ZAPŁACONA' ? 'ZAPŁACONE' : label
  })
  const [link, setLink] = useState(invoice.link ?? '')
  const [issuedDate, setIssuedDate] = useState(invoice.issuedDate ?? '')
  const [note, setNote] = useState(invoice.note ?? '')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [fakturowniaOpen, setFakturowniaOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [openingProtocol, setOpeningProtocol] = useState(false)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['milestones'] })
    queryClient.invalidateQueries({ queryKey: ['project-invoices'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
  }

  const persist = async (payload: UpdateInvoicePayload): Promise<void> => {
    if (invoice.legacyMilestoneId) {
      await updateMilestoneInvoice(invoice.legacyMilestoneId, invoice.id, { ...payload, netValue: invoice.totalNet })
    } else {
      await updateInvoice(invoice.id, payload)
    }
  }

  const save = useMutation({
    mutationFn: () =>
      persist({
        invoiceNumber: invoiceNumber.trim() || null,
        status,
        link: link.trim() || null,
        issuedDate: issuedDate || null,
        note: note.trim(),
      }),
    onSuccess: () => {
      refresh()
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  // One click for an issued invoice: number and link are already there
  const markPaid = useMutation({
    mutationFn: () => persist({ status: 'ZAPŁACONE' }),
    onSuccess: () => {
      refresh()
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: async (): Promise<void> => {
      if (invoice.legacyMilestoneId) await deleteMilestoneInvoice(invoice.legacyMilestoneId, invoice.id)
      else await deleteInvoice(invoice.id)
    },
    onSuccess: () => {
      refresh()
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const openProtocol = async () => {
    setOpeningProtocol(true)
    try {
      const blob = await fetchInvoiceProtocol(invoice.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOpeningProtocol(false)
    }
  }

  const submit = () => {
    setError('')
    if (status !== 'OCZEKUJE' && (!invoiceNumber.trim() || !link.trim())) {
      setError('Wystawiona lub zapłacona faktura wymaga numeru i linku.')
      return
    }
    save.mutate()
  }

  const inputCls =
    'h-10 w-full pl-10 pr-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)] hover:border-zinc-400/60 disabled:opacity-70'
  const label = invoiceStatusLabel(invoice.status)
  const statusCls =
    label === 'ZAPŁACONA'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : label === 'WYSTAWIONA'
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'

  return createPortal(
    <>
      <div className="fixed inset-0 z-[120] flex justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
        <div className="relative bg-[var(--card)] text-[var(--foreground)] border-l border-[var(--border)] shadow-2xl w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] text-[var(--sidebar-primary)]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base leading-tight truncate">{invoice.invoiceNumber || 'Faktura z protokołu'}</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                  {invoice.allocations.map((a) => a.milestoneNo).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusCls}`}>{label}</span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-md transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-6 space-y-5">
            {canManage && label === 'WYSTAWIONA' ? (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">Faktura wystawiona — czeka na płatność</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">Data zapłaty zostanie ustawiona na dziś</div>
                </div>
                <Button
                  type="button"
                  onClick={() => markPaid.mutate()}
                  disabled={markPaid.isPending}
                  className="h-8 px-3 text-xs gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
                >
                  {markPaid.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Oznacz jako zapłaconą
                </Button>
              </div>
            ) : null}
            {label === 'ZAPŁACONA' && invoice.paidAt ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Zapłacona {formatDate(invoice.paidAt)}
              </div>
            ) : null}

            {/* Summary */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
              <div className="flex items-baseline justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs text-[var(--muted-foreground)]">Kwota netto</span>
                <span className="text-lg font-bold">{formatBudget(invoice.totalNet, currency)}</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {invoice.allocations.map((a) => (
                  <li key={a.rowId} className="flex items-center gap-3 px-4 py-2 text-xs">
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                        a.type === 'roboty_dodatkowe'
                          ? 'text-amber-600 dark:text-amber-400 bg-[color-mix(in_oklch,#f59e0b_12%,transparent)]'
                          : 'text-[var(--sidebar-primary)] bg-[color-mix(in_oklch,var(--sidebar-primary)_10%,transparent)]'
                      }`}
                    >
                      {a.milestoneNo}
                    </span>
                    <span className="truncate flex-1 text-[var(--muted-foreground)]" title={a.description}>{a.description}</span>
                    {a.percent != null ? <span className="text-[var(--muted-foreground)]">{Number(a.percent.toFixed(2))}%</span> : null}
                    <span className="font-semibold whitespace-nowrap">{formatBudget(a.netValue, currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-3 gap-3 px-4 py-3 border-t border-[var(--border)] text-[11px]">
                <div>
                  <div className="text-[var(--muted-foreground)]">Wniosek</div>
                  <div className="font-medium">{formatDate(invoice.createdAt.split('T')[0])}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[var(--muted-foreground)]">Zgłosił</div>
                  <div className="font-medium truncate">{invoice.createdBy ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[var(--muted-foreground)]">Protokół</div>
                  {invoice.protocol ? (
                    <button
                      type="button"
                      onClick={openProtocol}
                      disabled={openingProtocol}
                      className="flex items-center gap-1 font-semibold text-[var(--sidebar-primary)] hover:underline disabled:opacity-60"
                      title={invoice.protocol.fileName}
                    >
                      {openingProtocol ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      Otwórz
                    </button>
                  ) : (
                    <div className="font-medium">—</div>
                  )}
                </div>
              </div>
            </div>

            {invoice.note && !canManage ? (
              <p className="text-xs text-[var(--muted-foreground)] whitespace-pre-line">{invoice.note}</p>
            ) : null}

            {/* Finance: number, Fakturownia, status, payment */}
            {canManage ? (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Numer faktury</label>
                    <button
                      type="button"
                      onClick={() => setFakturowniaOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[var(--sidebar-primary)] hover:underline"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Pobierz z Fakturowni
                    </button>
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="np. FV/10/2026" className={inputCls} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Status</label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                    {STATUS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setStatus(o.value)}
                        className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                          status === o.value
                            ? o.value === 'ZAPŁACONE'
                              ? 'bg-emerald-500 text-white'
                              : o.value === 'WYSTAWIONA'
                                ? 'bg-amber-500 text-white'
                                : 'bg-[var(--muted)] text-[var(--foreground)]'
                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Link do faktury</label>
                    {link.trim() ? (
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-[var(--sidebar-primary)] hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Otwórz
                      </a>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…fakturownia.pl/invoices/…" className={inputCls} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Data wystawienia</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="date"
                      value={issuedDate}
                      onChange={(e) => setIssuedDate(e.target.value)}
                      className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Uwagi</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)] resize-none h-20"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card)] shrink-0 space-y-3">
            {warning ? (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {warning}
              </div>
            ) : null}
            {error ? (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            ) : null}
            {canManage ? (
              <div className="flex items-center gap-3">
                {confirmDelete ? (
                  <div className="flex items-center gap-2 mr-auto">
                    <span className="text-xs text-rose-500">Usunąć fakturę ze wszystkich etapów?</span>
                    <Button type="button" variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending} className="h-8 px-3 text-xs rounded-xl">
                      {remove.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Usuń'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} className="h-8 px-3 text-xs rounded-xl">
                      Nie
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="mr-auto p-2 rounded-md text-rose-500 hover:bg-rose-500/10"
                    title="Usuń fakturę"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending} className="h-10 px-5 rounded-xl">
                  Anuluj
                </Button>
                <Button type="button" onClick={submit} disabled={save.isPending} className="h-10 px-5 gap-2 rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_88%,black)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] disabled:opacity-50 disabled:shadow-none">
                  {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Zapisz
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5 rounded-xl">
                  Zamknij
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FakturowniaImportDrawer
        isOpen={fakturowniaOpen}
        country={country ?? undefined}
        onClose={() => setFakturowniaOpen(false)}
        onImport={(inv: { number?: string; price_net?: string; issue_date?: string; view_url?: string }) => {
          setInvoiceNumber(inv.number ?? '')
          if (inv.view_url) setLink(inv.view_url)
          if (inv.issue_date) setIssuedDate(inv.issue_date)
          setStatus((s) => (s === 'OCZEKUJE' ? 'WYSTAWIONA' : s))
          const net = parseFloat(inv.price_net ?? '')
          setWarning(
            !Number.isNaN(net) && Math.abs(net - invoice.totalNet) > 0.01
              ? `Kwota w Fakturowni (${formatBudget(net, currency)}) różni się od wniosku (${formatBudget(invoice.totalNet, currency)}).`
              : '',
          )
          setFakturowniaOpen(false)
        }}
      />
    </>,
    document.body,
  )
}
