import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BadgePercent, Calendar, Coins, Loader2, PencilLine, Plus, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatAmount } from '@/lib/format'
import {
  createSurcharge,
  deleteSurcharge,
  fetchSurcharges,
  updateSurcharge,
  type Surcharge,
  type SurchargePayload,
} from '@/features/workspace/api/surcharges'

const PRIMARY_BTN =
  'rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_88%,black)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] disabled:opacity-50 disabled:shadow-none'
const inputCls =
  'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm outline-none transition placeholder:text-zinc-500/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sidebar-primary)_15%,transparent)] hover:border-zinc-400/60'

const formatDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : '')
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date())

/** Whether the surcharge applies today (active and within its dates) */
function appliesToday(s: Surcharge) {
  const d = today()
  return s.isActive && s.validFrom <= d && (!s.validTo || s.validTo >= d)
}

/** Settings block "Dopłaty" (admin only): hourly surcharges with validity dates */
export function SurchargesSettings() {
  const queryClient = useQueryClient()
  const { data: surcharges = [], isLoading, error } = useQuery({ queryKey: ['surcharges'], queryFn: fetchSurcharges })
  const [editing, setEditing] = useState<Surcharge | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: (id: string) => deleteSurcharge(id),
    onSuccess: () => {
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: ['surcharges'] })
    },
  })

  return (
    <section className="px-3 pb-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              <BadgePercent size={14} />
              Dopłaty
            </p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight">Dopłaty godzinowe</h3>
            <p className="mt-1 max-w-2xl text-xs text-[var(--muted-foreground)]">
              Stawki doliczane do każdej godziny pracy w okresie obowiązywania. Widoczne tylko dla administratora;
              aplikacja brygadzistów pobiera aktualne dopłaty z ERP.
            </p>
          </div>
          <Button type="button" onClick={() => setEditing('new')} className={`h-9 gap-1.5 px-4 text-xs ${PRIMARY_BTN}`}>
            <Plus size={14} />
            Dodaj dopłatę
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-2">Nazwa</th>
                <th className="px-3 py-2 text-right">Stawka</th>
                <th className="px-3 py-2">Obowiązuje</th>
                <th className="px-3 py-2">Status</th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--muted-foreground)]">
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-rose-500">{(error as Error).message}</td>
                </tr>
              ) : surcharges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[var(--muted-foreground)]">
                    Brak dopłat. Dodaj pierwszą, np. „Trudne warunki”.
                  </td>
                </tr>
              ) : (
                surcharges.map((s) => {
                  const now = appliesToday(s)
                  return (
                    <tr
                      key={s.id}
                      onDoubleClick={() => setEditing(s)}
                      className={`group cursor-pointer transition-colors hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_5%,transparent)] ${s.isActive ? '' : 'opacity-60'}`}
                    >
                      <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">{s.name}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">
                        {formatAmount(s.ratePerHour)} <span className="font-normal text-[var(--muted-foreground)]">PLN/h</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[var(--foreground)]">
                        {formatDate(s.validFrom)} – {s.validTo ? formatDate(s.validTo) : <span className="text-[var(--muted-foreground)]">bezterminowo</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            now
                              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : s.isActive
                                ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'
                          }`}
                          title={now ? 'Obowiązuje dziś' : s.isActive ? 'Aktywna, ale poza okresem obowiązywania' : 'Wyłączona'}
                        >
                          <span className={`size-1.5 rounded-full ${now ? 'bg-emerald-500' : s.isActive ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                          {now ? 'Obowiązuje' : s.isActive ? 'Poza okresem' : 'Nieaktywna'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {confirmDelete === s.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => remove.mutate(s.id)}
                              disabled={remove.isPending}
                              className="h-7 rounded-lg px-2 text-[11px]"
                            >
                              {remove.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Usuń'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)} className="h-7 rounded-lg px-2 text-[11px]">
                              Nie
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditing(s)}
                              className="rounded-md p-1.5 text-[var(--muted-foreground)] transition hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_10%,transparent)] hover:text-[var(--sidebar-primary)]"
                              title="Edytuj"
                            >
                              <PencilLine size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(s.id)}
                              className="rounded-md p-1.5 text-rose-500 transition hover:bg-rose-500/10"
                              title="Usuń"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {remove.error ? <p className="mt-2 text-xs text-rose-500">{(remove.error as Error).message}</p> : null}
      </div>

      {editing ? (
        <SurchargeFormDrawer
          key={editing === 'new' ? 'new' : editing.id}
          surcharge={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  )
}

function SurchargeFormDrawer({ surcharge, onClose }: { surcharge: Surcharge | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(surcharge?.name ?? '')
  const [rate, setRate] = useState(surcharge ? String(surcharge.ratePerHour) : '')
  const [validFrom, setValidFrom] = useState(surcharge?.validFrom ?? today())
  const [validTo, setValidTo] = useState(surcharge?.validTo ?? '')
  const [isActive, setIsActive] = useState(surcharge?.isActive ?? true)
  const [error, setError] = useState('')

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

  const save = useMutation({
    mutationFn: (payload: SurchargePayload) => (surcharge ? updateSurcharge(surcharge.id, payload) : createSurcharge(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const value = Number(rate.replace(',', '.'))
    if (!name.trim()) return setError('Podaj nazwę dopłaty.')
    if (!rate.trim() || Number.isNaN(value) || value < 0) return setError('Podaj stawkę za godzinę (0 lub więcej).')
    if (!validFrom) return setError('Podaj datę, od której obowiązuje dopłata.')
    if (validTo && validTo < validFrom) return setError('Data „do” nie może być wcześniejsza niż data „od”.')
    save.mutate({ name: name.trim(), ratePerHour: Math.round(value * 100) / 100, validFrom, validTo: validTo || null, isActive })
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] p-2 text-[var(--sidebar-primary)]">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold leading-tight">{surcharge ? 'Edytuj dopłatę' : 'Nowa dopłata'}</h3>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Stawka doliczana do każdej godziny pracy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[var(--muted-foreground)] transition-all hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="surcharge-form" onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-6 custom-scrollbar">
          <label className="block space-y-1">
            <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nazwa <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <BadgePercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input value={name} maxLength={150} onChange={(e) => setName(e.target.value)} placeholder="np. Trudne warunki" className={inputCls} autoFocus />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Stawka za godzinę (PLN) <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="np. 5.00" className={inputCls} />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Obowiązuje od <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`} />
              </div>
            </label>
            <label className="block space-y-1">
              <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Obowiązuje do <span className="font-normal text-[var(--muted-foreground)]">(opcjonalnie)</span>
              </span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="date"
                  value={validTo}
                  min={validFrom || undefined}
                  onChange={(e) => setValidTo(e.target.value)}
                  className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`}
                />
              </div>
            </label>
          </div>
          <p className="-mt-2 text-[11px] text-[var(--muted-foreground)]">Bez daty „do” dopłata obowiązuje bezterminowo.</p>

          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold">Aktywna</span>
              <span className="block text-[11px] text-[var(--muted-foreground)]">Nieaktywna dopłata nie jest naliczana, nawet w okresie obowiązywania</span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isActive ? 'bg-[var(--sidebar-primary)]' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              aria-checked={isActive}
              role="switch"
            >
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${isActive ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </form>

        <div className="shrink-0 space-y-3 border-t border-[var(--border)] bg-[var(--card)] px-6 py-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending} className="h-10 rounded-xl px-5">
              Anuluj
            </Button>
            <Button type="submit" form="surcharge-form" disabled={save.isPending} className={`h-10 gap-2 px-5 ${PRIMARY_BTN}`}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
