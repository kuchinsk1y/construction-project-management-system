import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Loader2, PencilLine, Plus, Search, Building2, Trash2, X } from 'lucide-react'
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
}

const emptyForm: ContractorFormState = {
  name: '',
  tax_number: '',
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

      <article className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm motion-safe:animate-[auth-rise_420ms_ease-out] md:p-4">
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-[var(--sidebar-primary)]/20 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              <Building2 size={14} />
              {t('contractors.hero.eyebrow')}
            </p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{t('contractors.hero.title')}</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('contractors.hero.subtitle')}</p>
          </div>

          <Button
            type="button"
            onClick={openCreateModal}
            className="h-9 rounded-xl bg-[var(--sidebar-primary)] px-3 text-[var(--sidebar-primary-foreground)] shadow-[0_8px_24px_color-mix(in_oklch,var(--sidebar-primary),transparent_70%)] hover:bg-[var(--sidebar-primary)]/90"
          >
            <Plus size={16} />
            {t('contractors.hero.addButton')}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/65 p-2.5">
            <p className="text-xs text-[var(--muted-foreground)]">{t('contractors.stats.all')}</p>
            <p className="mt-0.5 text-lg font-semibold">{filteredContractors.length}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('contractors.filters.searchPlaceholder')}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
            />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-[var(--muted-foreground)]">
              <Loader2 size={16} className="animate-spin" />
              {t('contractors.states.loading')}
            </div>
          ) : null}

          {isError ? (
            <div className="px-3 py-6 text-sm text-rose-500">
              {error instanceof Error ? error.message : t('contractors.states.loadError')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <div className="max-h-[62vh] overflow-auto">
              <table className="min-w-[600px] w-full table-fixed border-separate border-spacing-0 text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--background)]/90 backdrop-blur">
                    <th className="w-[40%] border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.name')}</th>
                    <th className="w-[25%] border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.taxNumber')}</th>
                    <th className="w-[20%] border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.createdAt')}</th>
                    <th className="w-[15%] border-b border-[var(--border)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('contractors.table.headers.actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContractors.map((c) => (
                    <tr key={c.id} className="group h-12 odd:bg-[var(--background)]/35 transition-colors hover:bg-[var(--sidebar-accent)]/35">
                      <td className="border-b border-[var(--border)] px-3 py-2 align-middle">
                        <p className="truncate font-semibold" title={c.name}>{c.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{t('contractors.table.idLabel')}: {c.id}</p>
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2 align-middle">
                        <span className="font-mono">{c.tax_number || t('contractors.table.noTaxNumber')}</span>
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2 align-middle">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2 align-middle text-right">
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

              {filteredContractors.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">{t('contractors.states.noResults')}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {showModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl motion-safe:animate-[auth-rise_320ms_ease-out]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold">{isEditMode ? t('contractors.modal.editTitle') : t('contractors.modal.createTitle')}</h4>
                <p className="text-sm text-[var(--muted-foreground)]">{isEditMode ? t('contractors.modal.editSubtitle') : t('contractors.modal.createSubtitle')}</p>
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setShowModal(false)} aria-label={t('contractors.actions.closeModal')}>
                <X size={14} />
              </Button>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.name')} *</span>
                <input
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('contractors.modal.labels.taxNumber')}</span>
                <input
                  value={formState.tax_number}
                  onChange={(event) => setFormState((prev) => ({ ...prev, tax_number: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>
            </div>

            {formError ? (
              <p className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{formError}</p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>{t('contractors.actions.cancel')}</Button>
              <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={14} className="animate-spin" /> : null}
                {isEditMode ? t('contractors.actions.save') : t('contractors.actions.addContractor')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
