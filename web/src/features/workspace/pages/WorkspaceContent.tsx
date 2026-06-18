import type { WorkspaceSection } from '@/features/workspace/types'
import { FinancePage } from '@/features/workspace/pages/FinancePage'
import { ProjectsPage } from '@/features/workspace/pages/ProjectsPage'
import { ReportsPage } from '@/features/workspace/pages/ReportsPage'
import { ResourcesPage } from '@/features/workspace/pages/ResourcesPage'
import { SettingsPage } from '@/features/workspace/pages/SettingsPage'
import { UsersPage } from '@/features/workspace/pages/UsersPage'
import type { ThemeMode, ThemePreset } from '@/types/auth'

type WorkspaceContentProps = {
  section: WorkspaceSection
  isAdmin: boolean
  theme: ThemeMode
  themePreset: ThemePreset
  onThemePresetChange: (preset: ThemePreset) => void
}

export function WorkspaceContent({ section, isAdmin, theme, themePreset, onThemePresetChange }: WorkspaceContentProps) {
  if (section === 'resources') return <ResourcesPage />
  if (section === 'reports') return <ReportsPage />
  if (section === 'finance') return <FinancePage />
  if (section === 'users') return <UsersPage canManage={isAdmin} />
  if (section === 'settings') return <SettingsPage theme={theme} themePreset={themePreset} onThemePresetChange={onThemePresetChange} />
  return <ProjectsPage />
}
