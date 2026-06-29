import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Loader2, PencilLine, Plus, Search, UserCheck, UserX, X } from 'lucide-react' /* ShieldCheck */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { createUser, fetchUsers, updateUser } from '@/features/users/api'
import type { ApiUser, CreateUserPayload, UpdateUserPayload, UserRole } from '@/features/users/types'

type UsersPageProps = {
  canManage: boolean
}

type NoticeTone = 'success' | 'error'

type NoticeState = {
  id: number
  tone: NoticeTone
  title: string
  message: string
} | null

type UserFormState = {
  firstName: string
  lastName: string
  middleNames: string
  email: string
  position: string
  phoneNumber: string
  telegramId: string
  role: UserRole
  isActive: boolean
}

const roleOptions: UserRole[] = [
  'admin',
  'operational_director',
  'financial_director',
  'project_manager',
  'foreman',
  'viewer',
  'user',
]

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  middleNames: '',
  email: '',
  position: '',
  phoneNumber: '',
  telegramId: '',
  role: 'viewer',
  isActive: true,
}

function roleLabel(role: string, t: (key: string) => string): string {
  if (role === 'admin') return t('users.roles.admin')
  if (role === 'operational_director') return t('users.roles.operationalDirector')
  if (role === 'financial_director') return t('users.roles.financialDirector')
  if (role === 'project_manager') return t('users.roles.projectManager')
  if (role === 'foreman') return t('users.roles.foreman')
  if (role === 'user') return t('users.roles.user')
  return t('users.roles.viewer')
}

function statusClassName(isActive: boolean): string {
  return isActive
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
    : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-500'
}

function primaryRole(user: ApiUser): UserRole {
  const role = (user.roles[0] ?? 'viewer').toLowerCase()
  if (
    role === 'admin'
    || role === 'operational_director'
    || role === 'financial_director'
    || role === 'project_manager'
    || role === 'viewer'
    || role === 'foreman'
    || role === 'user'
  ) {
    return role
  }

  return 'viewer'
}

function fullName(user: ApiUser): string {
  const parts = [user.firstName, user.middleNames ?? '', user.lastName]
    .map((entry) => entry.trim())
    .filter(Boolean)
  return parts.join(' ')
}

function toCreatePayload(form: UserFormState): CreateUserPayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    middleNames: form.middleNames.trim() || undefined,
    email: form.email.trim().toLowerCase(),
    position: form.position.trim(),
    phoneNumber: form.phoneNumber.trim(),
    telegramId: form.telegramId.trim() || undefined,
    roles: [form.role],
    isActive: form.isActive,
  }
}

function toUpdatePayload(form: UserFormState): UpdateUserPayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    middleNames: form.middleNames.trim() || undefined,
    email: form.email.trim().toLowerCase(),
    position: form.position.trim(),
    phoneNumber: form.phoneNumber.trim(),
    telegramId: form.telegramId.trim() || undefined,
    roles: [form.role],
    isActive: form.isActive,
  }
}

export function UsersPage({ canManage }: UsersPageProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<UserFormState>(emptyForm)
  const [notice, setNotice] = useState<NoticeState>(null)

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

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 30,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowModal(false)
      setIsEditMode(false)
      setEditingId(null)
      setFormState(emptyForm)
      setFormError('')
      showNotice('success', t('users.notices.addedTitle'), t('users.notices.addedMessage'))
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : t('users.notices.addErrorMessage')
      setFormError(message)
      showNotice('error', t('users.notices.addErrorTitle'), message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload, noticeTitle, noticeMessage }: { id: number; payload: UpdateUserPayload; noticeTitle: string; noticeMessage: string }) =>
      updateUser(id, payload).then((updated) => ({ updated, noticeTitle, noticeMessage })),
    onSuccess: async ({ noticeTitle, noticeMessage }) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowModal(false)
      setIsEditMode(false)
      setEditingId(null)
      setFormState(emptyForm)
      setFormError('')
      showNotice('success', noticeTitle, noticeMessage)
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : t('users.notices.updateErrorMessage')
      setFormError(message)
      showNotice('error', t('users.notices.updateErrorTitle'), message)
    },
  })

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return users.filter((user) => {
      const matchesQuery = !normalized
        || fullName(user).toLowerCase().includes(normalized)
        || user.email.toLowerCase().includes(normalized)
        || user.phoneNumber.toLowerCase().includes(normalized)

      if (!matchesQuery) return false
      if (roleFilter !== 'all' && primaryRole(user) !== roleFilter) return false
      return true
    })
  }, [query, roleFilter, users])

  // const activeCount = filteredUsers.filter((item) => item.isActive).length

  const openCreateModal = () => {
    setFormError('')
    setIsEditMode(false)
    setEditingId(null)
    setFormState(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (user: ApiUser) => {
    setFormError('')
    setIsEditMode(true)
    setEditingId(user.id)
    setFormState({
      firstName: user.firstName,
      lastName: user.lastName,
      middleNames: user.middleNames ?? '',
      email: user.email,
      position: user.position,
      phoneNumber: user.phoneNumber,
      telegramId: user.telegramId ?? '',
      role: primaryRole(user),
      isActive: user.isActive,
    })
    setShowModal(true)
  }

  const handleSubmit = () => {
    setFormError('')

    if (!formState.firstName.trim() || !formState.lastName.trim() || !formState.email.trim() || !formState.position.trim() || !formState.phoneNumber.trim()) {
      setFormError(t('users.validation.required'))
      return
    }

    if (isEditMode && editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        payload: toUpdatePayload(formState),
        noticeTitle: t('users.notices.savedTitle'),
        noticeMessage: t('users.notices.savedMessage'),
      })
      return
    }

    createMutation.mutate(toCreatePayload(formState))
  }

  const handleToggleActive = (user: ApiUser) => {
    updateMutation.mutate({
      id: user.id,
      payload: { isActive: !user.isActive },
      noticeTitle: user.isActive ? t('users.notices.deactivatedTitle') : t('users.notices.activatedTitle'),
      noticeMessage: user.isActive
        ? t('users.notices.deactivatedMessage', { name: fullName(user) })
        : t('users.notices.activatedMessage', { name: fullName(user) }),
    })
  }

  if (!canManage) {
    return (
      <section className="p-3">
        <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-600">{t('users.accessDenied')}</p>
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
              aria-label={t('users.actions.closeAlert')}
              onClick={() => setNotice(null)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between animate-fade-in mb-3">
        <div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
            {t('users.hero.title')}
          </h2>
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="h-9 rounded-xl bg-[var(--sidebar-primary)] px-3 text-[var(--sidebar-primary-foreground)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] hover:bg-[var(--sidebar-primary)]/90"
        >
          <Plus size={16} />
          {t('users.hero.addButton')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm animate-fade-in mb-3">
        <label className="relative md:col-span-4">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('users.filters.searchPlaceholder')}
            className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
          />
        </label>

        <label className="md:col-span-2">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
            aria-label={t('users.filters.roleAria')}
            title={t('users.filters.roleTitle')}
            className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
          >
            <option value="all">{t('users.filters.allRoles')}</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{roleLabel(role, t)}</option>
            ))}
          </select>
        </label>
      </div>

      <article className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm animate-fade-in mb-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Lista użytkowników systemu</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Pokazano {filteredUsers.length} z {users.length} użytkowników
            </p>
          </div>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-[var(--muted-foreground)]">
              <Loader2 size={16} className="animate-spin" />
              {t('users.states.loading')}
            </div>
          ) : null}

          {isError ? (
            <div className="px-4 py-6 text-sm text-rose-500">
              {error instanceof Error ? error.message : t('users.states.loadError')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <table className="w-full whitespace-nowrap border-separate border-spacing-0 text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('users.table.headers.user')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('users.table.headers.role')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('users.table.headers.position')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('users.table.headers.contact')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('users.table.headers.status')}</th>
                    <th className="border-b border-[var(--border)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Akcje</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="group transition-colors odd:bg-[var(--background)]/25 hover:bg-[var(--sidebar-accent)]/35 animate-row-fade-in"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top whitespace-normal">
                        <p className="font-semibold text-sm leading-snug text-[var(--foreground)]">{fullName(user)}</p>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                        <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                          {roleLabel(primaryRole(user), t)}
                        </span>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top" title={user.position}>{user.position}</td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top whitespace-normal">
                        <p className="font-medium text-[var(--foreground)]">{user.phoneNumber || '-'}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{user.email}</p>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:brightness-110 ${statusClassName(user.isActive)}`}
                        >
                          {user.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                          {user.isActive ? t('users.statuses.active') : t('users.statuses.inactive')}
                        </button>
                      </td>
                      <td className="border-b border-[var(--border)] px-4 py-3 align-top text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(user)}>
                          <PencilLine size={13} />
                          {/* {t('users.actions.edit')} */}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  {t('users.states.noResults')}
                </div>
              )}
            </>
          ) : null}
        </div>
      </article>

      {/* Drawer backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setShowModal(false)}
      />

      {/* Drawer panel */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          showModal ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label={isEditMode ? t('users.modal.editTitle') : t('users.modal.createTitle')}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">
              {isEditMode ? t('users.modal.editTitle') : t('users.modal.createTitle')}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {isEditMode ? t('users.modal.editSubtitle') : t('users.modal.createSubtitle')}
            </p>
          </div>
          <Button size="icon-sm" variant="outline" onClick={() => setShowModal(false)} aria-label={t('users.actions.closeModal')}>
            <X size={16} />
          </Button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">

          {/* Section: Personal */}
          <div>
            <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('users.modal.labels.firstName')} / {t('users.modal.labels.lastName')}
            </p>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {t('users.modal.labels.firstName')} <span className="text-rose-500">*</span>
                </span>
                <input
                  value={formState.firstName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {t('users.modal.labels.lastName')} <span className="text-rose-500">*</span>
                </span>
                <input
                  value={formState.lastName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('users.modal.labels.middleNames')}</span>
                <input
                  value={formState.middleNames}
                  onChange={(event) => setFormState((prev) => ({ ...prev, middleNames: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>
            </div>
          </div>

          {/* Section: Contact */}
          <div>
            <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('users.modal.labels.email')} / {t('users.modal.labels.phone')}
            </p>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {t('users.modal.labels.email')} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {t('users.modal.labels.phone')} <span className="text-rose-500">*</span>
                </span>
                <input
                  value={formState.phoneNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>

              {isEditMode ? (
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted-foreground)]">{t('users.modal.labels.telegramId')}</span>
                  <input
                    value={formState.telegramId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, telegramId: event.target.value }))}
                    className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  />
                </label>
              ) : null}
            </div>
          </div>

          {/* Section: Role & Status */}
          <div>
            <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('users.modal.labels.role')} / {t('users.modal.labels.position')}
            </p>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {t('users.modal.labels.position')} <span className="text-rose-500">*</span>
                </span>
                <input
                  value={formState.position}
                  onChange={(event) => setFormState((prev) => ({ ...prev, position: event.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{t('users.modal.labels.role')}</span>
                <select
                  value={formState.role}
                  onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                  aria-label={t('users.modal.labels.role')}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{roleLabel(role, t)}</option>
                  ))}
                </select>
              </label>

              <label className="flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                <span className="text-sm">{t('users.modal.labels.activeAccount')}</span>
              </label>
            </div>
          </div>

          {/* Validation error */}
          {formError ? (
            <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{formError}</p>
          ) : null}
        </div>

        {/* Drawer footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <Button type="button" variant="outline" onClick={() => setShowModal(false)}>{t('users.actions.cancel')}</Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={14} className="animate-spin" /> : null}
            {isEditMode ? t('users.actions.save') : t('users.actions.addUser')}
          </Button>
        </div>
      </aside>
    </section>
  )
}
