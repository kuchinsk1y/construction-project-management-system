import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Calendar,
  Check,
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
import type { ApiMilestone } from '@/features/projects/types'

type CloseWorksDrawerProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  milestones: ApiMilestone[]
  contractVal: number
  currency: string
  formatBudget: (val: number, currency?: string) => string
}

// The acceptance protocol is accepted as PDF only
const ACCEPT = 'application/pdf,.pdf'
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
  contractVal,
  currency,
  formatBudget,
}: CloseWorksDrawerProps) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  // Milestones chosen for this invoice request (whole milestones, the share is picked with the % buttons)
  const [pickedMilestones, setPickedMilestones] = useState<Set<string>>(new Set())
  const [percentOverride, setPercentOverride] = useState<Record<string, number>>({})
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

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...milestones].sort(byNo).map((m) => {
      const isRD = m.type === 'roboty_dodatkowe'
      const total = isRD ? m.netAmount || 0 : round2(contractVal * ((m.percentage || 0) / 100))
      const invoiced = (m.invoices ?? []).reduce((s, i) => s + i.netValue, 0)
      const remainingPct = total > 0 ? Math.max(0, round2(100 - (invoiced / total) * 100)) : 0
      const step = invoicingStep(m.invoicingPercentage)
      const matches = !q || `${m.milestoneNo} ${m.description}`.toLowerCase().includes(q)
      return { m, isRD, total, invoiced, remainingPct, step, matches }
    })
  }, [milestones, contractVal, search])

  /** Invoice steps allowed for a milestone: multiples of its invoicing %, plus "the rest" when it does not fit a step */
  const stepsFor = (step: number, remainingPct: number) => {
    const list: number[] = []
    for (let p = step; p <= remainingPct + 1e-6; p = round2(p + step)) list.push(p)
    if (remainingPct > 0 && !list.some((p) => Math.abs(p - remainingPct) < 0.01)) list.push(remainingPct)
    return list
  }

  const lineFor = (g: (typeof groups)[number]) => {
    if (!pickedMilestones.has(g.m.id) || g.remainingPct <= 0) return null
    const steps = stepsFor(g.step, g.remainingPct)
    // Suggest the first step; the % buttons change it
    const percent = percentOverride[g.m.id] ?? steps[0]
    const netValue = Math.abs(percent - g.remainingPct) < 0.01 ? round2(g.total - g.invoiced) : round2((g.total * percent) / 100)
    return { percent, netValue, steps }
  }

  const lines = groups.map((g) => ({ g, line: lineFor(g) })).filter((x) => x.line)
  const totalNet = round2(lines.reduce((s, x) => s + x.line!.netValue, 0))

  const toggleMilestone = (g: (typeof groups)[number]) => {
    if (g.remainingPct <= 0) return
    setPickedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(g.m.id)) next.delete(g.m.id)
      else next.add(g.m.id)
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
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Protokół musi być plikiem PDF.')
      return
    }
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
          workIds: [],
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
    if (lines.length === 0) return setError('Wybierz etapy do zafakturowania.')
    if (!file) return setError('Dołącz protokół odbioru robót.')
    mutation.mutate()
  }

  if (!isOpen) return null

  const visibleGroups = groups.filter(
    (g) =>
      g.total > 0 &&
      (showSettled || g.remainingPct > 0) &&
      g.matches,
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
                Wybierz etapy i procent do zafakturowania, dołącz protokół
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
                placeholder="Szukaj etapu…"
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
                const checked = pickedMilestones.has(g.m.id)
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
                    {/* Milestone row: a click selects the whole milestone */}
                    <button
                      type="button"
                      disabled={settled}
                      onClick={() => toggleMilestone(g)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:cursor-not-allowed"
                      title={settled ? 'Etap rozliczony' : undefined}
                    >
                      {settled ? <Lock size={14} className="shrink-0 text-[var(--muted-foreground)]" /> : <Checkbox state={checked ? 'on' : 'off'} />}
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${accent} ${accentBg}`}>
                        {g.m.milestoneNo}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-xs font-medium truncate" title={g.m.description}>
                          {g.m.description}
                        </span>
                        {!settled && g.step < 100 ? (
                          <span className="block text-[10px] text-[var(--muted-foreground)]">fakturowanie co {fmtPct(g.step)}</span>
                        ) : null}
                      </span>
                      <span className="text-right shrink-0 leading-tight">
                        <span className="block text-xs font-semibold whitespace-nowrap">{formatBudget(g.total, currency)}</span>
                        <span className="block text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                          {settled ? 'rozliczony' : `pozostało ${fmtPct(g.remainingPct)}`}
                        </span>
                      </span>
                    </button>

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
                    Wybierz lub upuść plik PDF
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
              {mutation.isPending ? 'Wysyłanie…' : 'Wyślij do zatwierdzenia'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
