import { BriefcaseBusiness, CalendarClock, CalendarPlus, Check, Copy, Hash, Mail, Phone, Send, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiUser } from '@/features/users/types'

type UserDetailsViewProps = {
  user: ApiUser
  fullName: string
  roleLabel: string
}

function initials(user: ApiUser): string {
  return `${user.firstName.trim().charAt(0)}${user.lastName.trim().charAt(0)}`.toUpperCase() || '?'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{title}</p>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]/40">
        {children}
      </div>
    </section>
  )
}

type InfoRowProps = {
  icon: ReactNode
  label: string
  value?: string | null
  href?: string
  copyable?: boolean
  children?: ReactNode
}

function InfoRow({ icon, label, value, href, copyable, children }: InfoRowProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const isEmpty = !children && !value

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = () => {
    if (!value) return
    void navigator.clipboard?.writeText(value).then(() => setCopied(true))
  }

  return (
    <div className="group flex items-center gap-3 px-3.5 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{label}</p>
        {children ?? (
          isEmpty ? (
            <p className="text-sm italic text-[var(--muted-foreground)]/70">{t('users.view.notProvided')}</p>
          ) : href ? (
            <a href={href} className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--sidebar-primary)] hover:underline underline-offset-2">
              {value}
            </a>
          ) : (
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{value}</p>
          )
        )}
      </div>
      {copyable && !isEmpty ? (
        <button
          type="button"
          onClick={handleCopy}
          title={t('users.view.copy')}
          aria-label={`${t('users.view.copy')}: ${label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] opacity-0 transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      ) : null}
    </div>
  )
}

export function UserDetailsView({ user, fullName, roleLabel }: UserDetailsViewProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--sidebar-primary)]/12 via-[var(--sidebar-primary)]/5 to-transparent p-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--sidebar-primary)]/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--sidebar-primary)] text-xl font-bold text-[var(--sidebar-primary-foreground)] shadow-[0_6px_18px_color-mix(in_oklch,var(--sidebar-primary),transparent_60%)]">
            {initials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-lg font-bold leading-tight text-[var(--foreground)]" title={fullName}>{fullName}</h4>
            <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">{user.position || '—'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sidebar-primary)]/25 bg-[var(--sidebar-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--sidebar-primary)]">
                <ShieldCheck size={12} />
                {roleLabel}
              </span>
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  user.isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                    : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-500',
                ].join(' ')}
              >
                {user.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                {user.isActive ? t('users.statuses.active') : t('users.statuses.inactive')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Section title={t('users.view.contactSection')}>
        <InfoRow icon={<Mail size={15} />} label={t('users.modal.labels.email')} value={user.email} href={`mailto:${user.email}`} copyable />
        <InfoRow
          icon={<Phone size={15} />}
          label={t('users.modal.labels.phone')}
          value={user.phoneNumber}
          href={user.phoneNumber ? `tel:${user.phoneNumber.replace(/\s+/g, '')}` : undefined}
          copyable
        />
        <InfoRow icon={<Send size={15} />} label={t('users.modal.labels.telegramId')} value={user.telegramId} copyable />
      </Section>

      <Section title={t('users.view.roleSection')}>
        <InfoRow icon={<BriefcaseBusiness size={15} />} label={t('users.modal.labels.position')} value={user.position} />
        <InfoRow icon={<ShieldCheck size={15} />} label={t('users.modal.labels.role')} value={roleLabel} />
      </Section>

      <Section title={t('users.view.accountSection')}>
        <InfoRow icon={user.isActive ? <UserCheck size={15} /> : <UserX size={15} />} label={t('users.modal.labels.status')}>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {user.isActive ? t('users.view.activeDesc') : t('users.view.inactiveDesc')}
          </p>
        </InfoRow>
        <InfoRow icon={<CalendarPlus size={15} />} label={t('users.view.createdAt')} value={formatDate(user.createdAt)} />
        <InfoRow icon={<CalendarClock size={15} />} label={t('users.view.updatedAt')} value={formatDate(user.updatedAt)} />
        <InfoRow icon={<Hash size={15} />} label={t('users.table.idLabel')} value={String(user.id)} />
      </Section>
    </div>
  )
}
