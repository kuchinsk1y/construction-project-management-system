import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, ClipboardList, Clock, HardHat, LayoutDashboard, LogOut, Menu, MoreVertical, Phone, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { ThemeToggle } from '@/components/ui'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; soon?: boolean }

const NAV: Array<{ title?: string; items: NavItem[] }> = [
  { items: [{ to: '/', label: 'Pulpit', icon: LayoutDashboard }] },
  {
    title: 'Roboty',
    items: [
      { to: '/dziennik', label: 'Dziennik prac', icon: ClipboardList },
      { to: '/raport', label: 'Raport godzin', icon: BarChart3 },
    ],
  },
]

const TITLES: Record<string, string> = { '/': 'Pulpit', '/dziennik': 'Dziennik prac', '/raport': 'Raport godzin', '/dziennik/nowy': 'Dziennik prac' }

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }).format(new Date(iso))

/** Same layout as the ERP: sidebar 250 px (slides in on phones), header 56 px with the theme switch, page with 12 px padding */
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the phone menu after moving to another page
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)] md:border-x md:border-[var(--border)]">
        {open ? <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} /> : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[300px] flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-xl transition-transform md:hidden ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!open}
        >
          <Sidebar onClose={() => setOpen(false)} />
        </aside>

        <aside className="hidden h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:sticky md:top-0 md:flex md:flex-col">
          <Sidebar />
        </aside>

        <main className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] transition hover:bg-[var(--muted)] md:hidden"
                aria-label="Otwórz menu"
              >
                <Menu className="size-4" />
              </button>
              <h2 className="truncate text-base font-semibold">{TITLES[pathname] ?? ''}</h2>
            </div>
            <ThemeToggle />
          </header>
          <div className="min-w-0 flex-1 p-3">{children}</div>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--sidebar-border)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-sm">
            <HardHat className="size-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted-foreground)]">ISPIK · ERP</p>
            <h1 className="truncate text-[15px] font-semibold">Dziennik brygadzisty</h1>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]"
            aria-label="Zamknij menu"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
        {NAV.map((group, i) => (
          <div key={group.title ?? i} className="space-y-1">
            {group.title ? (
              <p className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{group.title}</p>
            ) : null}
            {group.items.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <ProfileMenu />
    </>
  )
}

function SidebarLink({ to, label, icon: Icon, soon }: NavItem) {
  const base = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors'
  if (soon) {
    return (
      <span className={`${base} cursor-default text-[var(--muted-foreground)]`} title="Wkrótce">
        <Icon className="size-4" />
        <span className="flex-1">{label}</span>
        <span className="rounded-full bg-[var(--sidebar-accent)] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider">Wkrótce</span>
      </span>
    )
  }
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
            : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
        }`
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </NavLink>
  )
}

/** Profile at the bottom of the sidebar: ⋮ opens the menu with the session and sign-out, as in the ERP */
function ProfileMenu() {
  const { user, session, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Brygadzista'
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={ref} className="relative shrink-0 border-t border-[var(--sidebar-border)] p-3">
      {open ? (
        <div className="rise-in absolute bottom-full left-3 right-3 z-50 mb-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
          <div className="mb-2 space-y-1 border-b border-[var(--border)] px-2 pb-2">
            <p className="text-sm font-semibold">{fullName}</p>
            {user?.phone ? (
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Phone className="size-3" />
                {user.phone}
              </p>
            ) : null}
            {session ? (
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Clock className="size-3" />
                Sesja do {timeLabel(session.expiresAt)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true)
              await signOut()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
          >
            <LogOut className="size-4" />
            Wyloguj
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-[var(--sidebar-accent)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-[11px] font-bold text-[var(--sidebar-primary-foreground)] shadow-sm">
            {initials || '•'}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold">{fullName}</span>
            <span className="block truncate text-xs text-[var(--muted-foreground)]">Brygadzista</span>
          </span>
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]">
          <MoreVertical className="size-4" />
        </span>
      </button>
    </div>
  )
}
