import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Loader2, PencilLine, Plus, Search, Trash2, X } from 'lucide-react' /* Building2 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { createContractor, deleteContractor, fetchContractors, updateContractor } from '@/features/contractors/api'
import type { ApiContractor, CreateContractorPayload, UpdateContractorPayload } from '@/features/contractors/types'

type ContractorsPageProps = {
  canManage: boolean
}

type NoticeTone = 'success' | 'error'

type NoticeState = {
  id: number
  tone: NoticeTone
  title: string
  message: string
} | null

type ContractorFormState = {
  name: string
  tax_number: string
  street: string
  postal_code: string
  city: string
  country: string
  notes: string
}

const emptyForm: ContractorFormState = {
  name: '',
  tax_number: '',
  street: '',
  postal_code: '',
  city: '',
  country: '',
  notes: '',
}

export function ContractorsPage({ canManage }: ContractorsPageProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<ContractorFormState>(emptyForm)
  const [notice, setNotice] = useState<NoticeState>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const showNotice = (tone: NoticeTone, title: string, message: string) => {
    setNotice({ id: Date.now(), tone, title, message })
  }

  useEffect(() => {
    if (!notice) return

    const timer = window.setTimeout(() => {
      setNotice((current) => (current?.id === notice.id ? null : current))
    }, 3400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [notice])

  const { data: contractors = [], isLoading, isError, error } = useQuery({
    queryKey: ['contractors'],
    queryFn: fetchContractors,
    staleTime: 1000 * 30,
  })

  const createMutation = useMutation({
    mutationFn: createContractor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contractors'] })
      setShowModal(false)
      setIsEditMode(false)
      setEditingId(null)
      setFormState(emptyForm)
      setFormError('')
      showNotice('success', t('contractors.notices.addedTitle'), t('contractors.notices.addedMessage'))
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : t('contractors.notices.addErrorMessage')
      setFormError(message)
      showNotice('error', t('contractors.notices.addErrorTitle'), message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateContractorPayload }) =>
      updateContractor(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contractors'] })
      setShowModal(false)
      setIsEditMode(false)
      setEditingId(null)
      setFormState(emptyForm)
      setFormError('')
      showNotice('success', t('contractors.notices.savedTitle'), t('contractors.notices.savedMessage'))
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : t('contractors.notices.updateErrorMessage')
      setFormError(message)
      showNotice('error', t('contractors.notices.updateErrorTitle'), message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteContractor,
    onSuccess: async (_, deletedId) => {
      const deletedName = contractors.find((c) => c.id === deletedId)?.name || ''
      await queryClient.invalidateQueries({ queryKey: ['contractors'] })
      showNotice('success', t('contractors.notices.deletedTitle'), t('contractors.notices.deletedMessage', { name: deletedName }))
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : t('contractors.notices.deleteErrorMessage')
      showNotice('error', t('contractors.notices.deleteErrorTitle'), message)
    },
  })

  const filteredContractors = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return contractors.filter((c) => {
      return (
        !normalized ||
        c.name.toLowerCase().includes(normalized) ||
        (c.tax_number && c.tax_number.toLowerCase().includes(normalized))
      )
    })
  }, [query, contractors])

  const openCreateModal = () => {
    setFormError('')
    setIsEditMode(false)
    setEditingId(null)
    setFormState(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (c: ApiContractor) => {
    setFormError('')
    setIsEditMode(true)
    setEditingId(c.id)
    setFormState({
      name: c.name,
      tax_number: c.tax_number ?? '',
      street: c.street ?? '',
      postal_code: c.postal_code ?? '',
      city: c.city ?? '',
      country: c.country ?? '',
      notes: c.notes ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = () => {
    setFormError('')

    if (!formState.name.trim()) {
      setFormError(t('contractors.validation.required'))
      return
    }

    const payload: CreateContractorPayload = {
      name: formState.name.trim(),
      tax_number: formState.tax_number.trim() || undefined,
      street: formState.street.trim() || undefined,
      postal_code: formState.postal_code.trim() || undefined,
      city: formState.city.trim() || undefined,
      country: formState.country.trim() || undefined,
      notes: formState.notes.trim() || undefined,
    }

    if (isEditMode && editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        payload,
      })
      return
    }

    createMutation.mutate(payload)
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  if (!canManage) {
    return (
      <section className="p-3">
        <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-600">{t('contractors.accessDenied')}</p>
        </article>
      </section>
    )
  }

  return (
    <section className="p-3">
      {notice ? (
        <div className="users-toast-wrap" role="status" aria-live="polite">
          <div className={[
            'users-toast',
            notice.tone === 'success' ? 'users-toast-success' : 'users-toast-error',
          ].join(' ')}>
            <div className="users-toast-icon" aria-hidden="true">
              {notice.tone === 'success' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
            </div>

            <div className="users-toast-content">
              <p className="users-toast-title">{notice.title}</p>
              <p className="users-toast-message">{notice.message}</p>
            </div>

            <button
              type="button"
              className="users-toast-close"
              aria-label={t('contractors.actions.closeAlert')}
              onClick={() => setNotice(null)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between animate-fade-in mb-3">
        <div>
          {/* <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            <Building2 size={14} />
            {t('contractors.hero.eyebrow')}
          </p> */}
          <h2 className="mt-1 text-xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
            {t('contractors.hero.title')}
          </h2>
          {/* <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t('contractors.hero.subtitle')}
          </p> */}
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="h-9 rounded-xl bg-[var(--sidebar-primary)] px-3 text-[var(--sidebar-primary-foreground)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] hover:bg-[var(--sidebar-primary)]/90"
        >
          <Plus size={16} />
          {t('contractors.hero.addButton')}
        </Button>
      </div>

      {/* <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in mb-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            {t('contractors.stats.all')}
          </span>
          <p className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            {filteredContractors.length}
          </p>
        </div>
      </div> */}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm animate-fade-in mb-3">
        <label className="relative min-w-[200px] flex-1">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('contractors.filters.searchPlaceholder')}
            className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
          />
        </label>
        {query && (
          <Button
            type="button"
            onClick={() => setQuery('')}
            variant="outline"
            size="sm"
            className="ml-auto shrink-0 gap-1.5 rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
          >
            <X size={13} />
            Wyczyść
          </Button>
        )}
      </div>

      <article className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm animate-fade-in mb-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Lista partnerów handlowych</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Pokazano {filteredContractors.length} z {contractors.length} firm
            </p>
          </div>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-[var(--muted-foreground)]">
              <Loader2 size={16} className="animate-spin" />
              {t('contractors.states.loading')}
            </div>
          ) : null}

          {isError ? (
            <div className="px-4 py-6 text-sm text-rose-500">
              {error instanceof Error ? error.message : t('contractors.states.loadError')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <table className="w-full whitespace-nowrap border-separate border-spacing-0 text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.name')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.taxNumber')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.createdAt')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Akcje</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContractors.map((c, index) => (
                    <tr
                      key={c.id}
                      className="group transition-colors odd:bg-[var(--background)]/25 hover:bg-[var(--sidebar-accent)]/35 animate-row-fade-in"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top whitespace-normal">
                        <p className="font-semibold text-sm leading-snug text-[var(--foreground)]">{c.name}</p>
                        {c.street || c.city ? (
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {c.street ? `${c.street}, ` : ''}{c.postal_code ? `${c.postal_code} ` : ''}{c.city ? `${c.city}` : ''}{c.country ? `, ${c.country}` : ''}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]/50 italic">Brak adresu</p>
                        )}
                        {c.notes ? (
                          <p className="mt-1.5 text-xs text-amber-500/90 italic leading-relaxed whitespace-pre-wrap max-w-md">
                            * {c.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                        <span className="font-mono bg-[var(--muted)]/50 px-2 py-0.5 rounded text-xs font-semibold text-[var(--foreground)]">
                          {c.tax_number || t('contractors.table.noTaxNumber')}
                        </span>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top text-[var(--muted-foreground)]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top text-right">
                        <div className="inline-flex gap-1.5">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(c)}>
                            <PencilLine size={13} />
                            {t('contractors.actions.edit')}
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-rose-500 border-rose-500/20 hover:bg-rose-500/10" onClick={() => handleDelete(c.id)} disabled={deleteMutation.isPending}>
                            <Trash2 size={13} />
                            {t('contractors.actions.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredContractors.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  {t('contractors.states.noResults')}
                </div>
              )}
            </>
          ) : null}
        </div>
      </article>

      {/* ─── Add/Edit Contractor Drawer ─── */}
      {showModal && (
        <div
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setShowModal(false)}
        />
      )}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          showModal ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">
              {isEditMode ? t('contractors.modal.editTitle') : t('contractors.modal.createTitle')}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {isEditMode ? t('contractors.modal.editSubtitle') : t('contractors.modal.createSubtitle')}
            </p>
          </div>
          <Button size="icon-sm" variant="outline" onClick={() => setShowModal(false)} aria-label={t('contractors.actions.closeModal')}>
            <X size={16} />
          </Button>
        </div>

        {/* Drawer form body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          <div className="space-y-4">
            {/* Section: Basic info */}
            <div>
              <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Informacje podstawowe
              </p>
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {t('contractors.modal.labels.name')} *
                  </span>
                  <input
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="np. Nazwa Firmy Sp. z o.o."
                    className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.taxNumber')}</span>
                  <input
                    value={formState.tax_number}
                    onChange={(event) => setFormState((prev) => ({ ...prev, tax_number: event.target.value }))}
                    placeholder="np. 1234567890"
                    className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>
              </div>
            </div>

            {/* Section: Address */}
            <div>
              <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Dane adresowe
              </p>
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.street')}</span>
                  <input
                    value={formState.street}
                    onChange={(event) => setFormState((prev) => ({ ...prev, street: event.target.value }))}
                    placeholder="np. ul. Marszałkowska 10/2"
                    className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block col-span-1 space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.postalCode')}</span>
                    <input
                      value={formState.postal_code}
                      onChange={(event) => setFormState((prev) => ({ ...prev, postal_code: event.target.value }))}
                      placeholder="00-000"
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>
                  <label className="block col-span-2 space-y-1">
                    <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.city')}</span>
                    <input
                      value={formState.city}
                      onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="np. Warszawa"
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.country')}</span>
                  <input
                    value={formState.country}
                    onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
                    placeholder="np. Polska"
                    className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>
              </div>
            </div>

            {/* Section: Additional info */}
            <div>
              <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Inne informacje
              </p>
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.notes')}</span>
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Dodatkowe uwagi dotyczące współpracy..."
                  rows={4}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 custom-scrollbar resize-none animate-fade-in"
                />
              </label>
            </div>
          </div>

          {formError && (
            <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500 mt-4 animate-fade-in">
              {formError}
            </p>
          )}
        </div>

        {/* Drawer footer */}
        <div className="shrink-0 border-t border-[var(--border)] px-5 py-4 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
            {t('contractors.actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
          >
            {createMutation.isPending || updateMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            {isEditMode ? t('contractors.actions.save') : t('contractors.actions.addContractor')}
          </Button>
        </div>
      </aside>

      {deleteConfirmId !== null ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl motion-safe:animate-[auth-rise_320ms_ease-out]">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[var(--foreground)]">Usuń kontrahenta</h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Czy na pewno chcesz usunąć tego kontrahenta? Tej operacji nie można cofnąć.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteMutation.isPending}
              >
                Anuluj
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deleteConfirmId, {
                    onSettled: () => {
                      setDeleteConfirmId(null)
                    }
                  })
                }}
              >
                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Usuń
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
