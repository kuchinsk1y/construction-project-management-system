import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileUp,
  Loader2,
  Lock,
  Minus,
  Paperclip,
  Search,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createInvoiceProtocol } from '@/features/projects/api'
import type { ApiInvoice, ApiMilestone, ApiWorkType } from '@/features/projects/types'

type CloseWorksDrawerProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  milestones: ApiMilestone[]
  works: ApiWorkType[]
  invoices: ApiInvoice[]
  contractVal: number
  currency: string
  formatBudget: (val: number, currency?: string) => string
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx'
const MAX_FILE_MB = 20

const round2 = (n: number) => Math.round(n * 100) / 100
const fmtPct = (n: number) => `${Number(n.toFixed(2))}%`
/** Invoicing step: only values that split 100% evenly (25, 50…); anything else means one invoice for 100% */
const invoicingStep = (v: number | null) =>
  v != null && v > 0 && v <= 100 && Math.abs(100 / v - Math.round(100 / v)) < 0.01 ? v : 100
const byNo = (a: ApiMilestone, b: ApiMilestone) =>
  Number(a.type === 'roboty_dodatkowe') - Number(b.type === 'roboty_dodatkowe') ||
  a.milestoneNo.localeCompare(b.milestoneNo, 'pl', { numeric: true })

function Checkbox({ state, disabled }: { state: 'on' | 'off' | 'mixed'; disabled?: boolean }) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
        disabled
          ? 'border-[var(--border)] bg-[var(--muted)]'
          : state === 'off'
            ? 'border-zinc-300 dark:border-zinc-600 bg-[var(--background)]'
            : 'border-[var(--sidebar-primary)] bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
      }`}
    >
      {state === 'on' ? <Check size={11} strokeWidth={3} /> : state === 'mixed' ? <Minus size={11} strokeWidth={3} /> : null}
    </span>
  )
}

export function CloseWorksDrawer({
  isOpen,
  onClose,
  projectId,
  milestones,
  works,
  invoices,
  contractVal,
  currency,
  formatBudget,
}: CloseWorksDrawerProps) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set())
  // Milestones picked without works (e.g. additional works with no work list)
  const [pickedMilestones, setPickedMilestones] = useState<Set<string>>(new Set())
  const [percentOverride, setPercentOverride] = useState<Record<string, number>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [showSettled, setShowSettled] = useState(false)
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  // Keep the page behind still while the drawer is open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  /** Works already closed by a protocol, with the invoice that closed them */
  const closedBy = useMemo(() => {
    const map = new Map<string, ApiInvoice>()
    for (const inv of invoices) for (const w of inv.works) map.set(w.id, inv)
    return map
  }, [invoices])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...milestones].sort(byNo).map((m) => {
      const isRD = m.type === 'roboty_dodatkowe'
      const total = isRD ? m.netAmount || 0 : round2(contractVal * ((m.percentage || 0) / 100))
      const invoiced = (m.invoices ?? []).reduce((s, i) => s + i.netValue, 0)
      const remainingPct = total > 0 ? Math.max(0, round2(100 - (invoiced / total) * 100)) : 0
      const step = invoicingStep(m.invoicingPercentage)
      const mWorks = works
        .filter((w) => w.milestoneId === m.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }))
      const openWorks = mWorks.filter((w) => !closedBy.has(w.id))
      const matches = (text: string) => !q || text.toLowerCase().includes(q)
      const milestoneMatches = matches(`${m.milestoneNo} ${m.description}`)
      const visibleWorks = milestoneMatches ? mWorks : mWorks.filter((w) => matches(w.name))
      return { m, isRD, total, invoiced, remainingPct, step, mWorks, openWorks, visibleWorks, milestoneMatches }
    })
  }, [milestones, works, closedBy, contractVal, search])

  /** Invoice steps allowed for a milestone: multiples of its invoicing %, plus "the rest" when it does not fit a step */
  const stepsFor = (step: number, remainingPct: number) => {
    const list: number[] = []
    for (let p = step; p <= remainingPct + 1e-6; p = round2(p + step)) list.push(p)
    if (remainingPct > 0 && !list.some((p) => Math.abs(p - remainingPct) < 0.01)) list.push(remainingPct)
    return list
  }

  const lineFor = (g: (typeof groups)[number]) => {
    const chosen = g.mWorks.filter((w) => selectedWorks.has(w.id))
    const included = chosen.length > 0 || pickedMilestones.has(g.m.id)
    if (!included || g.remainingPct <= 0) return null
    const steps = stepsFor(g.step, g.remainingPct)
    let suggested: number
    if (g.openWorks.length > 0 && chosen.length === g.openWorks.length) {
      // Everything still open is closed now: invoice the rest
      suggested = g.remainingPct
    } else if (chosen.length > 0) {
      const share = chosen.reduce((s, w) => s + (w.percentage ?? 100 / Math.max(1, g.mWorks.length)), 0)
      suggested = [...steps].reverse().find((p) => p <= share + 1e-6) ?? steps[0]
    } else {
      suggested = steps[steps.length - 1]
    }
    const percent = percentOverride[g.m.id] ?? suggested
    const netValue = Math.abs(percent - g.remainingPct) < 0.01 ? round2(g.total - g.invoiced) : round2((g.total * percent) / 100)
    return { percent, netValue, steps, chosenCount: chosen.length }
  }

  const lines = groups.map((g) => ({ g, line: lineFor(g) })).filter((x) => x.line)
  const totalNet = round2(lines.reduce((s, x) => s + x.line!.netValue, 0))

  const toggleWork = (id: string) =>
    setSelectedWorks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleMilestone = (g: (typeof groups)[number]) => {
    if (g.remainingPct <= 0) return
    if (g.openWorks.length === 0) {
      setPickedMilestones((prev) => {
        const next = new Set(prev)
        if (next.has(g.m.id)) next.delete(g.m.id)
        else next.add(g.m.id)
        return next
      })
      return
    }
    const allOn = g.openWorks.every((w) => selectedWorks.has(w.id))
    setSelectedWorks((prev) => {
      const next = new Set(prev)
      for (const w of g.openWorks) {
        if (allOn) next.delete(w.id)
        else next.add(w.id)
      }
      return next
    })
    setPercentOverride((prev) => {
      const next = { ...prev }
      delete next[g.m.id]
      return next
    })
  }

  const pickFile = (f: File | undefined | null) => {
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Plik protokołu może mieć maksymalnie ${MAX_FILE_MB} MB.`)
      return
    }
    setError('')
    setFile(f)
  }

  const mutation = useMutation({
    mutationFn: () =>
      createInvoiceProtocol(
        projectId,
        {
          allocations: lines.map((x) => ({ milestoneId: x.g.m.id, percent: x.line!.percent })),
          workIds: [...selectedWorks],
          issuedDate: issuedDate || undefined,
          note: note.trim() || undefined,
        },
        file!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
      queryClient.invalidateQueries({ queryKey: ['project-invoices', projectId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const submit = () => {
    setError('')
    if (lines.length === 0) return setError('Wybierz roboty lub etapy do zafakturowania.')
    if (!file) return setError('Dołącz protokół odbioru robót.')
    mutation.mutate()
  }

  if (!isOpen) return null

  const visibleGroups = groups.filter(
    (g) =>
      g.total > 0 &&
      (showSettled || g.remainingPct > 0) &&
      (g.milestoneMatches || g.visibleWorks.length > 0),
  )
  const settledCount = groups.filter((g) => g.total > 0 && g.remainingPct <= 0).length
  const inputCls =
    'h-10 w-full pl-10 pr-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition duration-150 placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)] hover:border-zinc-400/60'

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-[var(--card)] text-[var(--foreground)] border-l border-[var(--border)] shadow-2xl w-full max-w-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] text-[var(--sidebar-primary)]">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight">Zamknij roboty</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Wybierz wykonane roboty i dołącz protokół — powstanie prośba o fakturę
              </p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-5 space-y-5">
          {/* Search + filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj etapu lub roboty…"
                className={inputCls}
              />
            </div>
            {settledCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowSettled((v) => !v)}
                className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] whitespace-nowrap"
              >
                <Checkbox state={showSettled ? 'on' : 'off'} />
                Rozliczone ({settledCount})
              </button>
            ) : null}
          </div>

          {/* Milestones with their works */}
          <div className="space-y-3">
            {visibleGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted-foreground)]">
                {search ? 'Nic nie pasuje do wyszukiwania.' : 'Wszystkie etapy są już rozliczone.'}
              </div>
            ) : (
              visibleGroups.map((g) => {
                const line = lineFor(g)
                const settled = g.remainingPct <= 0
                const chosen = g.openWorks.filter((w) => selectedWorks.has(w.id)).length
                const headState: 'on' | 'off' | 'mixed' =
                  g.openWorks.length === 0
                    ? pickedMilestones.has(g.m.id) ? 'on' : 'off'
                    : chosen === 0 ? 'off' : chosen === g.openWorks.length ? 'on' : 'mixed'
                // Collapsed by default; a search opens matching milestones
                const isCollapsed = search.trim() ? false : (collapsed[g.m.id] ?? true)
                const toggleOpen = () => setCollapsed((p) => ({ ...p, [g.m.id]: !isCollapsed }))
                const accent = g.isRD ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--sidebar-primary)]'
                const accentBg = g.isRD
                  ? 'bg-[color-mix(in_oklch,#f59e0b_12%,transparent)]'
                  : 'bg-[color-mix(in_oklch,var(--sidebar-primary)_10%,transparent)]'

                return (
                  <div
                    key={g.m.id}
                    className={`rounded-xl border bg-[var(--background)] transition-colors ${
                      line ? 'border-[color-mix(in_oklch,var(--sidebar-primary)_45%,var(--border))]' : 'border-[var(--border)]'
                    } ${settled ? 'opacity-60' : ''}`}
                  >
                    {/* Milestone header: checkbox selects its works, the rest opens the work list */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <button
                        type="button"
                        disabled={settled}
                        onClick={() => toggleMilestone(g)}
                        className="shrink-0 disabled:cursor-not-allowed"
                        title={settled ? 'Etap rozliczony' : 'Zaznacz wszystkie otwarte roboty etapu'}
                      >
                        {settled ? <Lock size={14} className="text-[var(--muted-foreground)]" /> : <Checkbox state={headState} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => (g.mWorks.length > 0 ? toggleOpen() : toggleMilestone(g))}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        title={g.mWorks.length > 0 ? (isCollapsed ? 'Pokaż roboty' : 'Ukryj roboty') : undefined}
                      >
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${accent} ${accentBg}`}>
                          {g.m.milestoneNo}
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block text-xs font-medium truncate" title={g.m.description}>
                            {g.m.description}
                          </span>
                          {g.mWorks.length > 0 ? (
                            <span className="block text-[10px] text-[var(--muted-foreground)]">
                              {chosen > 0
                                ? `wybrano ${chosen} z ${g.openWorks.length} otwartych`
                                : `${g.mWorks.length} robót${g.openWorks.length < g.mWorks.length ? ` · ${g.mWorks.length - g.openWorks.length} zamkniętych` : ''}`}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-right shrink-0 leading-tight">
                          <span className="block text-xs font-semibold whitespace-nowrap">{formatBudget(g.total, currency)}</span>
                          <span className="block text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                            {settled ? 'rozliczony' : `pozostało ${fmtPct(g.remainingPct)}`}
                          </span>
                        </span>
                        {g.mWorks.length > 0 ? (
                          <ChevronDown
                            size={14}
                            className={`shrink-0 text-[var(--muted-foreground)] transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                          />
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Invoice step for this milestone */}
                    {line ? (
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-[var(--border)] bg-[color-mix(in_oklch,var(--sidebar-primary)_5%,transparent)]">
                        <span className="text-[11px] text-[var(--muted-foreground)]">Do faktury:</span>
                        <div className="flex flex-wrap gap-1">
                          {line.steps.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPercentOverride((prev) => ({ ...prev, [g.m.id]: p }))}
                              className={`h-6 px-2 rounded-md border text-[11px] font-semibold transition-colors ${
                                Math.abs(p - line.percent) < 0.01
                                  ? 'border-[var(--sidebar-primary)] bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--sidebar-primary)]'
                              }`}
                            >
                              {fmtPct(p)}
                            </button>
                          ))}
                        </div>
                        <span className="ml-auto text-xs font-semibold whitespace-nowrap">{formatBudget(line.netValue, currency)}</span>
                      </div>
                    ) : null}

                    {/* Works */}
                    {!isCollapsed && g.mWorks.length > 0 ? (
                      <ul className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                        {g.visibleWorks.map((w) => {
                          const closed = closedBy.get(w.id)
                          const checked = selectedWorks.has(w.id)
                          const done = w.actualQuantity ?? 0
                          const progress = w.totalQuantity > 0 ? Math.min(100, Math.round((done / w.totalQuantity) * 100)) : 0
                          return (
                            <li key={w.id}>
                              <button
                                type="button"
                                disabled={!!closed || settled}
                                onClick={() => toggleWork(w.id)}
                                className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                                  checked ? 'bg-[color-mix(in_oklch,var(--sidebar-primary)_6%,transparent)]' : 'hover:bg-[var(--muted)]'
                                }`}
                              >
                                {closed ? <Lock size={13} className="text-[var(--muted-foreground)] shrink-0" /> : <Checkbox state={checked ? 'on' : 'off'} disabled={settled} />}
                                <div className="min-w-0 flex-1">
                                  <div className={`text-xs truncate ${closed ? 'text-[var(--muted-foreground)]' : ''}`} title={w.name}>
                                    {w.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                                    {w.departmentName}
                                    {w.percentage != null ? ` · ${fmtPct(w.percentage)} etapu` : ''}
                                  </div>
                                </div>
                                {closed ? (
                                  <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                                    zamknięta{closed.invoiceNumber ? ` · ${closed.invoiceNumber}` : ''}
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0" title={`Wykonano ${progress}%`}>
                                    <span className="text-[10px] tabular-nums text-[var(--muted-foreground)] whitespace-nowrap">
                                      {Number(done.toFixed(2))} / {Number(w.totalQuantity.toFixed(2))} {w.unit ?? ''}
                                    </span>
                                    <span className="h-1 w-12 rounded-full bg-[var(--muted)] overflow-hidden">
                                      <span
                                        className={`block h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-[var(--sidebar-primary)]'}`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </span>
                                  </div>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                    {g.mWorks.length === 0 && !settled ? (
                      <p className="border-t border-[var(--border)] px-3 py-2 pl-9 text-[11px] text-[var(--muted-foreground)]">
                        Brak robót w etapie — zaznacz etap, aby go zafakturować.
                      </p>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          {/* Protocol details */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Data wniosku</label>
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
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Protokół odbioru <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {file ? (
                  <div className="h-10 flex items-center gap-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                    <Paperclip className="w-4 h-4 text-[var(--sidebar-primary)] shrink-0" />
                    <span className="text-xs truncate flex-1" title={file.name}>{file.name}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-0.5 rounded text-[var(--muted-foreground)] hover:text-rose-500"
                      title="Usuń plik"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      pickFile(e.dataTransfer.files?.[0])
                    }}
                    className={`h-10 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed text-xs transition-colors ${
                      dragOver
                        ? 'border-[var(--sidebar-primary)] bg-[color-mix(in_oklch,var(--sidebar-primary)_8%,transparent)] text-[var(--sidebar-primary)]'
                        : 'border-zinc-300 dark:border-zinc-600 text-[var(--muted-foreground)] hover:border-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary)]'
                    }`}
                  >
                    <FileUp className="w-4 h-4" />
                    Wybierz lub upuść plik (PDF, zdjęcie)
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Uwagi (opcjonalnie)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Informacje dla działu finansowego…"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none transition placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)] resize-none h-20"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card)] shrink-0 space-y-3">
          {error ? (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Razem netto</div>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-base font-bold whitespace-nowrap">{formatBudget(totalNet, currency)}</span>
                <span className="text-[11px] text-[var(--muted-foreground)] truncate">
                  {lines.length
                    ? lines.map((x) => `${x.g.m.milestoneNo} ${fmtPct(x.line!.percent)}`).join(' · ')
                    : 'nic nie wybrano'}
                </span>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending} className="h-10 px-5 rounded-xl">
              Anuluj
            </Button>
            <Button type="button" onClick={submit} disabled={mutation.isPending || lines.length === 0} className="h-10 px-5 gap-2 rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_88%,black)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] disabled:opacity-50 disabled:shadow-none">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {mutation.isPending ? 'Wysyłanie…' : 'Wyślij do fakturowania'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
