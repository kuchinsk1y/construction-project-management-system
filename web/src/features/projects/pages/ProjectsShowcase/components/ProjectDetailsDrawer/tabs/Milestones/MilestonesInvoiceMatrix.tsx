import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import type { ApiInvoice, ApiMilestone } from '@/features/projects/types'
import { formatAmount } from '@/lib/format'

type MilestonesInvoiceMatrixProps = {
  milestones: ApiMilestone[]
  invoices: ApiInvoice[]
  contractVal: number
  currency: string
  formatBudget: (val: number, currency?: string) => string
  onOpenInvoice: (invoice: ApiInvoice) => void
  onOpenMilestone: (milestone: ApiMilestone) => void
}

type Column = {
  key: string
  date: string | null
  number: string | null
  status: string
  total: number
  invoice?: ApiInvoice
}

const isPaid = (s?: string | null) => s === 'ZAPŁACONE' || s === 'ZAPŁACONA'
const statusText = (s?: string | null) => (isPaid(s) ? 'Zapłacona' : s === 'WYSTAWIONA' ? 'Wystawiona' : 'Oczekuje')
const statusDot = (s?: string | null) => (isPaid(s) ? 'bg-emerald-500' : s === 'WYSTAWIONA' ? 'bg-amber-500' : 'bg-zinc-400')
const amountColor = (s?: string | null) =>
  isPaid(s) ? 'text-emerald-600 dark:text-emerald-400' : s === 'WYSTAWIONA' ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
const formatDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : '—')
const byNo = (a: ApiMilestone, b: ApiMilestone) =>
  Number(a.type === 'roboty_dodatkowe') - Number(b.type === 'roboty_dodatkowe') ||
  a.milestoneNo.localeCompare(b.milestoneNo, 'pl', { numeric: true })

/** Excel-like view: milestones in rows, invoices in columns (by date), amounts where an invoice settles a milestone */
export function MilestonesInvoiceMatrix({
  milestones,
  invoices,
  contractVal,
  currency,
  formatBudget,
  onOpenInvoice,
  onOpenMilestone,
}: MilestonesInvoiceMatrixProps) {
  const rows = useMemo(() => [...milestones].sort(byNo), [milestones])

  const { columns, cells } = useMemo(() => {
    const cols = new Map<string, Column>()
    const cellMap = new Map<string, number>()
    for (const m of milestones) {
      for (const row of m.invoices ?? []) {
        // Rows of one shared invoice (works protocol) form one column
        const key = row.invoiceId ?? row.id
        const shared = row.invoiceId ? invoices.find((i) => i.id === row.invoiceId) : undefined
        const col = cols.get(key) ?? {
          key,
          date: row.issuedDate ?? null,
          number: row.invoiceNumber ?? null,
          status: row.status ?? 'OCZEKUJE',
          total: 0,
          invoice: shared,
        }
        col.total += row.netValue
        cols.set(key, col)
        cellMap.set(`${m.id}:${key}`, (cellMap.get(`${m.id}:${key}`) ?? 0) + row.netValue)
      }
    }
    const sorted = [...cols.values()].sort(
      (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.number ?? '').localeCompare(b.number ?? '', 'pl', { numeric: true }),
    )
    return { columns: sorted, cells: cellMap }
  }, [milestones, invoices])

  const milestoneTotal = (m: ApiMilestone) =>
    m.type === 'roboty_dodatkowe' ? m.netAmount || 0 : Math.round(contractVal * ((m.percentage || 0) / 100) * 100) / 100

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] p-8 text-center text-xs text-[var(--muted-foreground)]">
        <div className="p-3 rounded-full bg-[var(--muted)]">
          <FileText className="w-6 h-6 opacity-60" />
        </div>
        Brak faktur w projekcie — pojawią się tutaj po zamknięciu robót.
      </div>
    )
  }

  /** Rows an invoice touches in its column: one invoice over several milestones is drawn as one joined block */
  const spans = new Map<string, { first: number; last: number; count: number }>()
  for (const c of columns) {
    const hit = rows.flatMap((m, idx) => (cells.has(`${m.id}:${c.key}`) ? [idx] : []))
    if (hit.length) spans.set(c.key, { first: hit[0], last: hit[hit.length - 1], count: hit.length })
  }

  const shade = (i: number) => (i % 2 === 0 ? 'bg-[color-mix(in_srgb,var(--sidebar-primary)_6%,transparent)]' : '')
  const grandTotal = columns.reduce((s, c) => s + c.total, 0)

  return (
    <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-xl border border-[var(--border)] bg-[var(--card)]">
      {/* Fills the block when there are few invoices; scrolls sideways when there are many */}
      <table className="w-full border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 z-30 w-[240px] min-w-[220px] border-b border-r border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left align-bottom">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Etap / faktura</div>
              <div className="mt-1 text-[11px] font-semibold text-[var(--foreground)]">
                Razem {formatBudget(grandTotal, currency)}
              </div>
            </th>
            {columns.map((c, i) => (
              <th
                key={c.key}
                onClick={() => c.invoice && onOpenInvoice(c.invoice)}
                className={`min-w-[118px] border-b border-r border-[var(--border)] px-2 py-2 text-right align-bottom font-normal ${
                  i % 2 === 0 ? 'bg-[color-mix(in_srgb,var(--sidebar-primary)_9%,var(--background))]' : 'bg-[var(--background)]'
                } ${
                  c.invoice ? 'cursor-pointer hover:bg-[var(--muted)]' : ''
                }`}
                title={`${statusText(c.status)}${c.number ? ` · ${c.number}` : ''}${c.invoice ? ' · kliknij, aby otworzyć' : ''}`}
              >
                <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-[var(--foreground)] whitespace-nowrap">
                  <span className={`size-1.5 rounded-full ${statusDot(c.status)}`} />
                  {formatDate(c.date)}
                </div>
                <div className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[110px] ml-auto">{c.number ?? 'bez numeru'}</div>
                <div className="mt-1 text-[11px] font-bold text-[var(--foreground)] whitespace-nowrap">{formatBudget(c.total, currency)}</div>
                {(spans.get(c.key)?.count ?? 0) > 1 ? (
                  <div className="mt-1 ml-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--sidebar-primary)_16%,transparent)] px-1.5 text-[9px] font-bold text-[var(--sidebar-primary)]">
                    {spans.get(c.key)!.count} {spans.get(c.key)!.count >= 5 ? "etapów" : "etapy"}
                  </div>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m, rowIdx) => {
            const total = milestoneTotal(m)
            const invoiced = (m.invoices ?? []).reduce((s, r) => s + r.netValue, 0)
            const pct = total > 0 ? Math.min(100, (invoiced / total) * 100) : 0
            const isRD = m.type === 'roboty_dodatkowe'
            return (
              <tr key={m.id} className="group">
                <td
                  onDoubleClick={() => onOpenMilestone(m)}
                  className="sticky left-0 z-10 border-b border-r border-[var(--border)] bg-[var(--card)] px-3 py-2 group-hover:bg-[var(--muted)] cursor-pointer"
                  title="Kliknij dwukrotnie, aby otworzyć faktury etapu"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                        isRD
                          ? 'text-amber-600 dark:text-amber-400 bg-[color-mix(in_oklch,#f59e0b_12%,transparent)]'
                          : 'text-[var(--sidebar-primary)] bg-[color-mix(in_oklch,var(--sidebar-primary)_10%,transparent)]'
                      }`}
                    >
                      {m.milestoneNo}
                    </span>
                    <span className="truncate max-w-[130px] text-[11px] text-[var(--foreground)]" title={m.description}>
                      {m.description}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1 flex-1 rounded-full bg-[var(--muted)] overflow-hidden">
                      <span className="block h-full rounded-full bg-[var(--sidebar-primary)]" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-[10px] tabular-nums text-[var(--muted-foreground)] whitespace-nowrap">
                      {Math.round(pct)}% · {formatBudget(total, currency)}
                    </span>
                  </div>
                </td>
                {columns.map((c, i) => {
                  const value = cells.get(`${m.id}:${c.key}`)
                  const span = spans.get(c.key)
                  const joined = span && span.count > 1 && rowIdx >= span.first && rowIdx <= span.last
                  if (joined) {
                    const isFirst = rowIdx === span.first
                    const isLast = rowIdx === span.last
                    // One block from the first to the last milestone of the invoice; rows in between keep the line
                    return (
                      <td
                        key={c.key}
                        className={`relative border-r border-[var(--border)] p-0 group-hover:bg-[var(--muted)] ${shade(i)} ${isLast ? 'border-b' : ''}`}
                      >
                        <div
                          className={`absolute inset-x-1.5 border-x border-[color-mix(in_srgb,var(--sidebar-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--sidebar-primary)_13%,transparent)] ${
                            isFirst ? 'top-1.5 rounded-t-lg border-t' : 'top-0'
                          } ${isLast ? 'bottom-1.5 rounded-b-lg border-b' : '-bottom-px'}`}
                        />
                        <div
                          className={`relative px-3 py-2 text-right tabular-nums whitespace-nowrap ${
                            value ? `font-semibold ${amountColor(c.status)}` : ''
                          }`}
                        >
                          {value ? formatAmount(value) : ' '}
                        </div>
                      </td>
                    )
                  }
                  return (
                    <td
                      key={c.key}
                      className={`border-b border-r border-[var(--border)] px-2 py-2 text-right tabular-nums whitespace-nowrap group-hover:bg-[var(--muted)] ${shade(i)} ${
                        value ? `font-semibold ${amountColor(c.status)}` : ''
                      }`}
                    >
                      {value ? formatAmount(value) : ''}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
