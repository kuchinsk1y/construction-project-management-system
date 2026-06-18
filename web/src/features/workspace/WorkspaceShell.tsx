import { Bell, CircleUserRound, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { workspaceNavigation } from '@/features/workspace/config/navigation'
import { WorkspaceContent } from '@/features/workspace/pages/WorkspaceContent'
import type { WorkspaceSection } from '@/features/workspace/types'
import type { ThemeMode, UserProfile } from '@/types/auth'

type WorkspaceShellProps = {
  onLogout: () => void
  theme: ThemeMode
  onToggleTheme: () => void
  profile: UserProfile | null
}

function titleForSection(section: WorkspaceSection): string {
  const item = workspaceNavigation.find((entry) => entry.key === section)
  return item?.label ?? 'Projects'
}

export function WorkspaceShell({ onLogout, theme, onToggleTheme, profile }: WorkspaceShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('projects')

  const profileName = useMemo(
    () => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'User',
    [profile?.firstName, profile?.lastName],
  )

  const SidebarContent = (
    <>
      <div className="h-16 border-b border-[var(--sidebar-border)] px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">ERP</p>
        <h1 className="text-xl font-semibold">Projects</h1>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {workspaceNavigation.map(({ key, label, icon: Icon }) => {
          const active = key === activeSection
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveSection(key)
                setIsMobileSidebarOpen(false)
              }}
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                active
                  ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                  : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
              ].join(' ')}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--sidebar-border)] p-3">
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]/60 p-2">
          <div className="flex items-center gap-2 rounded-lg px-1 py-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]">
              <CircleUserRound size={16} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-[var(--sidebar-foreground)]">{profileName}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{profile?.email || 'Signed in'}</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="mt-2 w-full justify-start border border-[var(--sidebar-border)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-foreground)]"
            onClick={() => {
              setIsMobileSidebarOpen(false)
              onLogout()
            }}
          >
            <LogOut size={15} />
            Wyloguj
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
        {isMobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
        ) : null}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[320px] flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-xl transition-transform md:hidden',
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex h-16 items-center justify-end border-b border-[var(--sidebar-border)] px-5 py-3">
            <Button size="icon-sm" variant="outline" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close menu">
              <X size={16} />
            </Button>
          </div>
          {SidebarContent}
        </aside>

        <aside className="hidden h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] md:sticky md:top-0 md:flex md:flex-col">
          {SidebarContent}
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <Button size="icon-sm" variant="outline" className="md:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                <Menu size={16} />
              </Button>
              <h2 className="text-lg font-semibold">{titleForSection(activeSection)}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Notifications">
                <Bell size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Toggle theme"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </header>

          <WorkspaceContent section={activeSection} />
        </main>
      </div>
    </div>
  )
}
