import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Paperclip,
  Receipt,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchInvoiceProtocol } from '@/features/projects/api'
import type { ApiInvoice, ApiMilestone, ApiMilestoneInvoice } from '@/features/projects/types'

type InvoicesInboxDrawerProps = {
  onClose: () => void
  milestones: ApiMilestone[]
  invoices: ApiInvoice[]
  currency: string
  formatBudget: (val: number, currency?: string) => string
  /** Opens the full invoice form (number, Fakturownia, link, status) */
  /** Opens the invoice form for a shared invoice id or an older single-milestone invoice row id */
  onOpenInvoice: (id: string) => void
  /** Older single-milestone invoices are edited on the milestone page */
  /** Kept by the parent so the list reopens on the same tab after editing an invoice */
  filter?: Filter
  onFilterChange?: (filter: Filter) => void
}

export type Filter = 'pending' | 'issued' | 'paid' | 'all'

type Entry = {
  key: string
  date: string | null
  number: string | null
  status: 'OCZEKUJE' | 'WYSTAWIONA' | 'ZAPŁACONA'
  total: number
  link: string | null
  note: string
  createdBy: string | null
  parts: { milestoneNo: string; isRD: boolean; netValue: number; percent: number | null }[]
  shared?: ApiInvoice
  legacy?: { milestone: ApiMilestone; row: ApiMilestoneInvoice }
}

const normalize = (s?: string | null): Entry['status'] =>
  s === 'ZAPŁACONE' || s === 'ZAPŁACONA' ? 'ZAPŁACONA' : s === 'WYSTAWIONA' ? 'WYSTAWIONA' : 'OCZEKUJE'
const formatDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : '—')
const byNo = (a: string, b: string) => a.localeCompare(b, 'pl', { numeric: true })

const FILTERS: { id: Filter; label: string; hint: string }[] = [
  { id: 'pending', label: 'Do wystawienia', hint: 'Prośby od kierowników projektu' },
  { id: 'issued', label: 'Do zapłaty', hint: 'Wystawione, czekają na płatność' },
  { id: 'paid', label: 'Zapłacone', hint: 'Rozliczone' },
  { id: 'all', label: 'Wszystkie', hint: '' },
]

const STATUS_STYLE: Record<Entry['status'], { label: string; cls: string }> = {
  OCZEKUJE: { label: 'Oczekuje', cls: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
  WYSTAWIONA: { label: 'Wystawiona', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  ZAPŁACONA: { label: 'Zapłacona', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
}

const PRIMARY_BTN =
  'rounded-lg bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_88%,black)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_70%)]'

export function InvoicesInboxDrawer({
  onClose,
  milestones,
  invoices,
  currency,
  formatBudget,
  onOpenInvoice,
  filter: controlledFilter,
  onFilterChange,
}: InvoicesInboxDrawerProps) {
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [openingProtocol, setOpeningProtocol] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  /** Shared invoices (works protocols) plus older invoices of a single milestone */
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = invoices.map((inv) => ({
      key: inv.id,
      date: inv.issuedDate,
      number: inv.invoiceNumber,
      status: normalize(inv.status),
      total: inv.totalNet,
      link: inv.link,
      note: inv.note,
      createdBy: inv.createdBy,
      parts: inv.allocations.map((a) => ({
        milestoneNo: a.milestoneNo,
        isRD: a.type === 'roboty_dodatkowe',
        netValue: a.netValue,
        percent: a.percent,
      })),
      shared: inv,
    }))
    for (const m of milestones) {
      for (const row of m.invoices ?? []) {
        if (row.invoiceId) continue
        list.push({
          key: row.id,
          date: row.issuedDate,
          number: row.invoiceNumber,
          status: normalize(row.status),
          total: row.netValue,
          link: row.link ?? null,
          note: row.note,
          createdBy: null,
          parts: [{ milestoneNo: m.milestoneNo, isRD: m.type === 'roboty_dodatkowe', netValue: row.netValue, percent: null }],
          legacy: { milestone: m, row },
        })
      }
    }
    // Oldest requests first: they have waited the longest
    return list.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }, [invoices, milestones])

  const counts = useMemo(
    () => ({
      pending: entries.filter((e) => e.status === 'OCZEKUJE').length,
      issued: entries.filter((e) => e.status === 'WYSTAWIONA').length,
      paid: entries.filter((e) => e.status === 'ZAPŁACONA').length,
      all: entries.length,
    }),
    [entries],
  )
  const [localFilter, setLocalFilter] = useState<Filter>(() => (counts.pending ? 'pending' : counts.issued ? 'issued' : 'all'))
  const filter = controlledFilter ?? localFilter
  const setFilter = (f: Filter) => {
    setLocalFilter(f)
    onFilterChange?.(f)
  }

  const sums = useMemo(
    () => ({
      pending: entries.filter((e) => e.status === 'OCZEKUJE').reduce((s, e) => s + e.total, 0),
      issued: entries.filter((e) => e.status === 'WYSTAWIONA').reduce((s, e) => s + e.total, 0),
      paid: entries.filter((e) => e.status === 'ZAPŁACONA').reduce((s, e) => s + e.total, 0),
    }),
    [entries],
  )

  const visible = entries.filter((e) => {
    if (filter === 'pending' && e.status !== 'OCZEKUJE') return false
    if (filter === 'issued' && e.status !== 'WYSTAWIONA') return false
    if (filter === 'paid' && e.status !== 'ZAPŁACONA') return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [e.number ?? '', e.note, ...e.parts.map((p) => p.milestoneNo)].join(' ').toLowerCase().includes(q)
  })
  const ordered = filter === 'paid' || filter === 'all' ? [...visible].reverse() : visible

  // Every action opens the invoice form; issuing and payment are confirmed there
  const open = (e: Entry) => onOpenInvoice(e.key)

  const openProtocol = async (inv: ApiInvoice) => {
    setOpeningProtocol(inv.id)
    try {
      const url = URL.createObjectURL(await fetchInvoiceProtocol(inv.id))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOpeningProtocol(null)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-[var(--card)] text-[var(--foreground)] border-l border-[var(--border)] shadow-2xl w-full max-w-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] text-[var(--sidebar-primary)]">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight">Zarządzaj fakturami</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Wystawianie, powiązanie z Fakturownią i płatności</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-md transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] shrink-0">
          {(
            [
              ['pending', 'Do wystawienia', sums.pending, 'text-[var(--foreground)]'],
              ['issued', 'Do zapłaty', sums.issued, 'text-amber-600 dark:text-amber-400'],
              ['paid', 'Zapłacono', sums.paid, 'text-emerald-600 dark:text-emerald-400'],
            ] as const
          ).map(([id, label, sum, cls]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-5 py-3 text-left transition-colors ${filter === id ? 'bg-[color-mix(in_oklch,var(--sidebar-primary)_6%,transparent)]' : 'hover:bg-[var(--muted)]'}`}
            >
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
                {label} · {counts[id]}
              </div>
              <div className={`mt-0.5 text-sm font-bold whitespace-nowrap ${cls}`}>{formatBudget(sum, currency)}</div>
            </button>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-[var(--border)] shrink-0">
          <div className="flex p-0.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                title={f.hint}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors ${
                  filter === f.id ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {f.label}
                {f.id !== 'all' && counts[f.id] > 0 ? (
                  <span
                    className={`min-w-4 h-4 px-1 rounded-full text-[9px] leading-4 text-center ${
                      f.id === 'pending' ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]' : 'bg-[var(--border)] text-[var(--foreground)]'
                    }`}
                  >
                    {counts[f.id]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Numer, etap, uwagi…"
              className="h-8 w-full pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-2.5">
          {error ? (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {ordered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--muted-foreground)]">
              <div className="p-3 rounded-full bg-[var(--muted)]">
                {filter === 'pending' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Inbox className="w-6 h-6 opacity-60" />}
              </div>
              <span className="text-xs">
                {search ? 'Nic nie pasuje do wyszukiwania.' : filter === 'pending' ? 'Wszystko wystawione — brak nowych próśb.' : 'Brak faktur.'}
              </span>
            </div>
          ) : (
            ordered.map((e) => {
              const st = STATUS_STYLE[e.status]
              return (
                <div
                  key={e.key}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[color-mix(in_oklch,var(--sidebar-primary)_40%,var(--border))] transition-colors"
                >
                  <button type="button" onClick={() => open(e)} className="w-full text-left px-4 pt-3 pb-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{e.number || 'Bez numeru'}</span>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                          {e.legacy ? <span className="text-[10px] text-[var(--muted-foreground)]">pojedynczy etap</span> : null}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                          {e.status === 'OCZEKUJE' ? 'Wniosek' : 'Wystawiona'} {formatDate(e.date)}
                          {e.createdBy ? ` · ${e.createdBy}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold whitespace-nowrap">{formatBudget(e.total, currency)}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">netto</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...e.parts].sort((a, b) => byNo(a.milestoneNo, b.milestoneNo)).map((p) => (
                        <span
                          key={p.milestoneNo}
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${
                            p.isRD
                              ? 'bg-[color-mix(in_oklch,#f59e0b_12%,transparent)] text-amber-700 dark:text-amber-400'
                              : 'bg-[color-mix(in_oklch,var(--sidebar-primary)_10%,transparent)] text-[var(--sidebar-primary)]'
                          }`}
                        >
                          <b className="font-bold">{p.milestoneNo}</b>
                          <span className="text-[var(--foreground)] opacity-80">{formatBudget(p.netValue, currency)}</span>
                        </span>
                      ))}
                    </div>
                    {e.note ? <p className="mt-2 text-[11px] text-[var(--muted-foreground)] line-clamp-2">{e.note}</p> : null}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border)]">
                    {e.shared?.protocol ? (
                      <button
                        type="button"
                        onClick={() => openProtocol(e.shared!)}
                        disabled={openingProtocol === e.key}
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--sidebar-primary)]"
                      >
                        {openingProtocol === e.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                        Protokół
                      </button>
                    ) : null}
                    {e.link ? (
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--sidebar-primary)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Faktura
                      </a>
                    ) : null}

                    <div className="ml-auto flex items-center gap-2">
                      {e.status === 'OCZEKUJE' ? (
                        <Button type="button" onClick={() => open(e)} className={`h-7 px-3 text-[11px] gap-1.5 ${PRIMARY_BTN}`}>
                          <FileText className="w-3.5 h-3.5" />
                          Zatwierdź
                        </Button>
                      ) : e.status === 'WYSTAWIONA' ? (
                        <>
                          <Button
                            type="button"
                            onClick={() => open(e)}
                            className="h-7 px-3 text-[11px] gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Oznacz jako zapłaconą
                          </Button>
                        </>
                      ) : (
                        <Button type="button" variant="outline" onClick={() => open(e)} className="h-7 px-3 text-[11px] gap-1 rounded-lg">
                          Szczegóły
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card)] shrink-0 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5 rounded-xl">
            Zamknij
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
