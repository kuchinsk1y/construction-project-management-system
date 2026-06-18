import { Bell, CircleUserRound, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { workspaceNavigation } from '@/features/workspace/config/navigation'
import { WorkspaceContent } from '@/features/workspace/pages/WorkspaceContent'
import type { WorkspaceSection } from '@/features/workspace/types'
import type { ThemeMode, ThemePreset, UserProfile } from '@/types/auth'

type WorkspaceShellProps = {
  onLogout: () => void
  theme: ThemeMode
  themePreset: ThemePreset
  onThemePresetChange: (preset: ThemePreset) => void
  onToggleTheme: () => void
  profile: UserProfile | null
}

function titleForSection(section: WorkspaceSection): string {
  const item = workspaceNavigation.find((entry) => entry.key === section)
  return item?.label ?? 'Projekty'
}

export function WorkspaceShell({ onLogout, theme, themePreset, onThemePresetChange, onToggleTheme, profile }: WorkspaceShellProps) {
  const { t, i18n } = useTranslation()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('projects')

  const isAdmin = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase()
    const roles = (profile?.roles ?? []).map((entry) => entry.toLowerCase())
    return role === 'admin' || role === 'administrator' || roles.includes('admin') || roles.includes('administrator')
  }, [profile?.role, profile?.roles])

  const navigationItems = useMemo(
    () => workspaceNavigation.filter((item) => (item.key === 'users' ? isAdmin : true)),
    [isAdmin],
  )

  useEffect(() => {
    if (!isAdmin && activeSection === 'users') setActiveSection('projects')
  }, [activeSection, isAdmin])

  const profileName = useMemo(
    () => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || t('workspace.userFallback'),
    [profile?.firstName, profile?.lastName, t],
  )

  const SidebarContent = (
    <>
      <div className="h-14 border-b border-[var(--sidebar-border)] px-4 py-2.5">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">ERP</p>
        <h1 className="text-lg font-semibold leading-tight">{t('workspace.brand')}</h1>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
        {navigationItems.map(({ key, label, icon: Icon }) => {
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
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
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

      <div className="shrink-0 border-t border-[var(--sidebar-border)] p-2.5">
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]/60 p-2">
          <div className="flex items-center gap-2 rounded-lg px-1 py-0.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]">
              <CircleUserRound size={16} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-[var(--sidebar-foreground)]">{profileName}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{profile?.email || t('workspace.signedIn')}</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="mt-1.5 w-full justify-start border border-[var(--sidebar-border)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-foreground)]"
            onClick={() => {
              setIsMobileSidebarOpen(false)
              onLogout()
            }}
          >
            <LogOut size={15} />
            {t('workspace.logout')}
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
        {isMobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
        ) : null}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[300px] flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-xl transition-transform md:hidden',
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex h-14 items-center justify-end border-b border-[var(--sidebar-border)] px-4 py-2.5">
            <Button size="icon-sm" variant="outline" onClick={() => setIsMobileSidebarOpen(false)} aria-label={t('workspace.closeMenu')}>
              <X size={16} />
            </Button>
          </div>
          {SidebarContent}
        </aside>

        <aside className="hidden h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] md:sticky md:top-0 md:flex md:flex-col">
          {SidebarContent}
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-3 backdrop-blur md:px-4">
            <div className="flex items-center gap-3">
              <Button size="icon-sm" variant="outline" className="md:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                <Menu size={16} />
              </Button>
              <h2 className="text-base font-semibold">{titleForSection(activeSection)}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t('workspace.language.switchToPolish')}
                title={t('workspace.language.switchToPolish')}
                onClick={() => {
                  void i18n.changeLanguage('pl')
                }}
                className="group inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)]/70 px-2.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--sidebar-primary)] hover:bg-[var(--sidebar-accent)]"
              >
                <span className="relative inline-block h-3.5 w-5 overflow-hidden rounded-[3px] border border-black/10 shadow-sm">
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-white" />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[#dc143c]" />
                </span>
                <span className="leading-none">PL</span>
              </button>

              <Button variant="outline" size="icon-sm" aria-label={t('workspace.notifications')}>
                <Bell size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t('workspace.toggleTheme')}
                onClick={onToggleTheme}
                title={theme === 'dark' ? t('workspace.switchToLight') : t('workspace.switchToDark')}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </header>

          <WorkspaceContent
            section={activeSection}
            isAdmin={isAdmin}
            theme={theme}
            themePreset={themePreset}
            onThemePresetChange={onThemePresetChange}
          />
        </main>
      </div>
    </div>
  )
}
