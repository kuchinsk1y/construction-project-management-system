import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronsUpDown, Loader2, Lock, PencilLine, Plus, Search, UserCheck, UserX, X } from 'lucide-react' /* ShieldCheck */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { createUser, fetchUsers, updateUser, deleteUser } from '@/features/users/api'
import { UserDetailsView } from '@/features/users/components/UserDetailsView'
import type { ApiUser, CreateUserPayload, UpdateUserPayload, UserRole } from '@/features/users/types'

type UsersPageProps = {
  canView: boolean
  canAdd: boolean
  canEdit: boolean
  isAdmin: boolean
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
  'contractor',
]

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  middleNames: '',
  email: '',
  position: '',
  phoneNumber: '',
  telegramId: '',
  role: 'contractor',
  isActive: true,
}

type SortKey = 'id' | 'name' | 'role' | 'position' | 'status'

function SortableTh({ label, sortKey, sort, onSort }: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-[var(--foreground)] ${active ? 'text-[var(--foreground)]' : ''}`}
      >
        {label}
        <Icon size={12} className={active ? 'text-[var(--sidebar-primary)]' : 'opacity-40'} />
      </button>
    </th>
  )
}

function roleLabel(role: string, t: (key: string) => string): string {
  if (role === 'admin') return t('users.roles.admin')
  if (role === 'operational_director') return t('users.roles.operationalDirector')
  if (role === 'financial_director') return t('users.roles.financialDirector')
  if (role === 'project_manager') return t('users.roles.projectManager')
  if (role === 'foreman') return t('users.roles.foreman')
  if (role === 'contractor') return t('users.roles.contractor')
  return role
}

function statusClassName(isActive: boolean): string {
  return isActive
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
    : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-500'
}

function primaryRole(user: ApiUser): UserRole {
  const role = (user.roles[0] ?? 'contractor').toLowerCase()
  if (
    role === 'admin'
    || role === 'operational_director'
    || role === 'financial_director'
    || role === 'project_manager'
    || role === 'foreman'
    || role === 'contractor'
  ) {
    return role
  }

  return 'contractor'
}

function fullName(user: ApiUser): string {
  const parts = [user.firstName, user.middleNames ?? '', user.lastName]
    .map((entry) => entry.trim())
    .filter(Boolean)
  return parts.join(' ')
}

function toFormState(user: ApiUser): UserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    middleNames: user.middleNames ?? '',
    email: user.email,
    position: user.position,
    phoneNumber: user.phoneNumber,
    telegramId: user.telegramId ?? '',
    role: primaryRole(user),
    isActive: user.isActive,
  }
}

function toCreatePayload(form: UserFormState): CreateUserPayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    middleNames: form.middleNames.trim() || null,
    email: form.email.trim().toLowerCase(),
    position: form.position.trim(),
    phoneNumber: form.phoneNumber.trim(),
    telegramId: form.telegramId.trim() || null,
    roles: [form.role],
    isActive: form.isActive,
  }
}

function toUpdatePayload(form: UserFormState): UpdateUserPayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    middleNames: form.middleNames.trim() || null,
    email: form.email.trim().toLowerCase(),
    position: form.position.trim(),
    phoneNumber: form.phoneNumber.trim(),
    telegramId: form.telegramId.trim() || null,
    roles: [form.role],
    isActive: form.isActive,
  }
}

export function UsersPage({ canView, canAdd, canEdit, isAdmin }: UsersPageProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  // Existing users open read-only first; "Edytuj" switches the drawer to the form
  const [isViewMode, setIsViewMode] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<UserFormState>(emptyForm)
  const [notice, setNotice] = useState<NoticeState>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
    onSuccess: async (createdUser) => {
      queryClient.setQueryData<ApiUser[]>(['users'], (oldUsers) => {
        if (!oldUsers) return [createdUser]
        return [createdUser, ...oldUsers]
      })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      // Foreman lists (project departments) are cached separately
      await queryClient.invalidateQueries({ queryKey: ['foremen'] })
      setShowModal(false)
      setIsEditMode(false)
      setEditingId(null)
      setFormState(emptyForm)
      setFormError('')
      showNotice('success', t('users.notices.addedTitle'), t('users.notices.addedMessage'))
    },
    onError: (mutationError) => {
      const message = mutationError?.message || t('users.notices.addErrorMessage')
      setFormError(message)
      showNotice('error', t('users.notices.addErrorTitle'), message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload, noticeTitle, noticeMessage }: { id: number; payload: UpdateUserPayload; noticeTitle: string; noticeMessage: string }) =>
      updateUser(id, payload).then((updated) => ({ updated, noticeTitle, noticeMessage })),
    onSuccess: async (data) => {
      const updatedUser = data.updated
      queryClient.setQueryData<ApiUser[]>(['users'], (oldUsers) => {
        if (!oldUsers) return [updatedUser]
        return oldUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['foremen'] })
      setIsViewMode(true)
      setFormError('')
      showNotice('success', data.noticeTitle, data.noticeMessage)
    },
    onError: (mutationError) => {
      const message = mutationError?.message || t('users.notices.updateErrorMessage')
      setFormError(message)
      showNotice('error', t('users.notices.updateErrorTitle'), message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['foremen'] })
      setShowModal(false)
      setShowDeleteConfirm(false)
      setIsEditMode(false)
      setEditingId(null)
      setFormState(emptyForm)
      setFormError('')
      showNotice('success', t('users.notices.deleteTitle', 'Użytkownik usunięty'), t('users.notices.deleteMessage', 'Konto zostało pomyślnie usunięte.'))
    },
    onError: (mutationError) => {
      const message = mutationError?.message || 'Nie można usunąć użytkownika.'
      setShowDeleteConfirm(false)
      showNotice('error', t('users.notices.deleteErrorTitle', 'Błąd usuwania'), message)
    },
  })

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    const matches = users.filter((user) => {
      const matchesQuery = !normalized
        || fullName(user).toLowerCase().includes(normalized)
        || user.email.toLowerCase().includes(normalized)
        || user.phoneNumber.toLowerCase().includes(normalized)

      if (!matchesQuery) return false
      if (roleFilter !== 'all' && primaryRole(user) !== roleFilter) return false
      return true
    })

    const value = (user: ApiUser): string | number => {
      switch (sort.key) {
        case 'id': return user.id
        case 'role': return roleLabel(primaryRole(user), t)
        case 'position': return user.position
        case 'status': return user.isActive ? 0 : 1
        default: return `${user.lastName} ${user.firstName}`
      }
    }
    const direction = sort.dir === 'asc' ? 1 : -1
    return [...matches].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pl', { numeric: true })
      return cmp * direction
    })
  }, [query, roleFilter, users, sort, t])

  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  // const activeCount = filteredUsers.filter((item) => item.isActive).length

  const openCreateModal = () => {
    setFormError('')
    setIsEditMode(false)
    setIsViewMode(false)
    setEditingId(null)
    setFormState(emptyForm)
    setShowModal(true)
  }

  const viewedUser = useMemo(
    () => (editingId === null ? null : users.find((user) => user.id === editingId) ?? null),
    [editingId, users],
  )
  const isViewing = isEditMode && isViewMode && viewedUser !== null

  const openViewModal = (user: ApiUser) => {
    setFormError('')
    setIsEditMode(true)
    setIsViewMode(true)
    setEditingId(user.id)
    setFormState(toFormState(user))
    setShowModal(true)
  }

  const startEditing = () => {
    if (!viewedUser) return
    setFormError('')
    setFormState(toFormState(viewedUser))
    setIsViewMode(false)
  }

  const closeModal = () => setShowModal(false)

  // Cancel while editing an existing user goes back to the details view
  const cancelForm = () => {
    if (isEditMode && !isViewMode) {
      setFormError('')
      setIsViewMode(true)
      return
    }
    closeModal()
  }

  useEffect(() => {
    if (!showModal || showDeleteConfirm) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelForm()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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

  if (!canView) {
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

        {canAdd ? (
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-9 rounded-xl bg-[var(--sidebar-primary)] px-3 text-[var(--sidebar-primary-foreground)] shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)] hover:bg-[var(--sidebar-primary)]/90"
          >
            <Plus size={16} />
            {t('users.hero.addButton')}
          </Button>
        ) : null}
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

        <div className="overflow-x-auto hide-scrollbar">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-[var(--muted-foreground)]">
              <Loader2 size={16} className="animate-spin" />
              {t('users.states.loading')}
            </div>
          ) : null}

          {isError ? (
            <div className="px-4 py-6 text-sm text-rose-500">
              {error?.message || t('users.states.loadError')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <table className="w-full whitespace-nowrap border-separate border-spacing-0 text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
                    {isAdmin ? (
                      <SortableTh label={t('users.table.idLabel')} sortKey="id" sort={sort} onSort={toggleSort} />
                    ) : null}
                    <SortableTh label={t('users.table.headers.user')} sortKey="name" sort={sort} onSort={toggleSort} />
                    <SortableTh label={t('users.table.headers.role')} sortKey="role" sort={sort} onSort={toggleSort} />
                    <SortableTh label={t('users.table.headers.position')} sortKey="position" sort={sort} onSort={toggleSort} />
                    <th className="border-b border-[var(--border)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('users.table.headers.contact')}</th>
                    <SortableTh label={t('users.table.headers.status')} sortKey="status" sort={sort} onSort={toggleSort} />
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      tabIndex={0}
                      title={t('users.table.openHint')}
                      onDoubleClick={() => openViewModal(user)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') openViewModal(user)
                      }}
                      // Prevent text selection flicker on double click
                      onMouseDown={(event) => {
                        if (event.detail > 1) event.preventDefault()
                      }}
                      className={[
                        'group cursor-pointer transition-colors odd:bg-[var(--background)]/25 hover:bg-[var(--sidebar-accent)]/35 animate-row-fade-in outline-none focus-visible:bg-[var(--sidebar-primary)]/10',
                        showModal && editingId === user.id ? 'bg-[var(--sidebar-primary)]/10' : '',
                      ].join(' ')}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      {isAdmin ? (
                        <td className="border-b border-[var(--border)] px-4 py-3 align-top tabular-nums text-[var(--muted-foreground)]">{user.id}</td>
                      ) : null}
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
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClassName(user.isActive)}`}
                        >
                          {user.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                          {user.isActive ? t('users.statuses.active') : t('users.statuses.inactive')}
                        </span>
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
        onClick={closeModal}
      />

      {/* Drawer panel */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          showModal ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label={isViewing ? t('users.modal.viewTitle') : isEditMode ? t('users.modal.editTitle') : t('users.modal.createTitle')}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">
              {isViewing ? t('users.modal.viewTitle') : isEditMode ? t('users.modal.editTitle') : t('users.modal.createTitle')}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {isViewing ? t('users.modal.viewSubtitle') : isEditMode ? t('users.modal.editSubtitle') : t('users.modal.createSubtitle')}
            </p>
          </div>
          <Button size="icon-sm" variant="outline" onClick={closeModal} aria-label={t('users.actions.closeModal')}>
            <X size={16} />
          </Button>
        </div>

        {/* Drawer body */}
        {isViewing && viewedUser ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
            <UserDetailsView user={viewedUser} fullName={fullName(viewedUser)} roleLabel={roleLabel(primaryRole(viewedUser), t)} />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">

          {/* Section: Personal */}
          <div>
            <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Dane osobiste
            </p>
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                    {t('users.modal.labels.firstName')} <span className="text-rose-500">*</span>
                  </span>
                  <input
                    value={formState.firstName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                    {t('users.modal.labels.lastName')} <span className="text-rose-500">*</span>
                  </span>
                  <input
                    value={formState.lastName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">{t('users.modal.labels.middleNames')}</span>
                <input
                  value={formState.middleNames}
                  onChange={(event) => setFormState((prev) => ({ ...prev, middleNames: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                />
              </label>
            </div>
          </div>

          {/* Section: Contact */}
          <div>
            <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Dane kontaktowe
            </p>
            <div className="space-y-3.5">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                  {t('users.modal.labels.email')} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                  {t('users.modal.labels.phone')} <span className="text-rose-500">*</span>
                </span>
                <input
                  value={formState.phoneNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                />
              </label>

              {isEditMode ? (
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">{t('users.modal.labels.telegramId')}</span>
                  <input
                    value={formState.telegramId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, telegramId: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                  />
                </label>
              ) : null}
            </div>
          </div>          {/* Section: Role & Status */}
          <div>
            <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Rola i stanowisko
            </p>
            <div className="space-y-3.5">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                  {t('users.modal.labels.position')} <span className="text-rose-500">*</span>
                </span>
                <input
                  value={formState.position}
                  onChange={(event) => setFormState((prev) => ({ ...prev, position: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors block mb-1">
                  {t('users.modal.labels.role')} <span className="text-rose-500">*</span>
                </span>
                <select
                  value={formState.role}
                  onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{roleLabel(role, t)}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-between p-4 mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">{t('users.modal.labels.status')}</label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('users.modal.labels.activeAccountDesc')}
                  </p>
                </div>
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Validation error */}
          {formError ? (
            <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{formError}</p>
          ) : null}
        </div>
        )}

        {/* Drawer footer */}
        {isViewing ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
            <Button type="button" variant="outline" onClick={closeModal}>{t('users.actions.close')}</Button>
            {canEdit ? (
              <Button type="button" onClick={startEditing} className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]">
                <PencilLine size={14} />
                {t('users.actions.edit')}
              </Button>
            ) : null}
          </div>
        ) : (
        <div className="flex shrink-0 justify-between gap-2 border-t border-[var(--border)] px-5 py-3">
          <div>
            {isEditMode && (
              viewedUser?.deleteBlockedReason ? (
                // Linked users can't be deleted at all — explain why instead of offering the button
                <p className="flex max-w-[260px] items-start gap-1.5 text-[11px] leading-snug text-[var(--muted-foreground)]">
                  <Lock size={13} className="mt-px shrink-0" />
                  {viewedUser.deleteBlockedReason}. Możesz go dezaktywować.
                </p>
              ) : (
                <Button type="button" onClick={() => setShowDeleteConfirm(true)} className="bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_14px_rgb(244_63_94/0.3)] disabled:bg-rose-500/40 disabled:shadow-none">
                  {t('users.actions.delete', 'Usuń')}
                </Button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={cancelForm}>{t('users.actions.cancel')}</Button>
            <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending} className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEditMode ? t('users.actions.save') : t('users.actions.addUser')}
            </Button>
          </div>
        </div>
        )}
      </aside>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--background)] p-6 shadow-xl border border-[var(--border)]">
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">{t('users.modal.deleteConfirmTitle', 'Potwierdź usunięcie')}</h3>
            <p className="mb-6 text-sm text-[var(--muted-foreground)]">
              {t('users.modal.deleteConfirmMessage', 'Czy na pewno chcesz usunąć tego użytkownika? Tej operacji nie można cofnąć.')}
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                {t('users.actions.cancel', 'Anuluj')}
              </Button>
              <Button
                type="button"
                className="bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_14px_rgb(244_63_94/0.3)] disabled:bg-rose-500/40 disabled:shadow-none"
                onClick={() => {
                  if (editingId) deleteMutation.mutate(editingId)
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                {t('users.actions.confirmDelete', 'Usuń bezpowrotnie')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
