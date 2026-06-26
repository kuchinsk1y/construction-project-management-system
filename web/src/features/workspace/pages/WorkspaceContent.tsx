import { useMemo } from 'react'

import type { WorkspaceSection } from '@/features/workspace/types'
import { ContractorsPage } from './ContractorsPage'
import { ProjectsPage } from '@/features/workspace/pages/ProjectsPage'
import { SettingsPage } from '@/features/workspace/pages/SettingsPage'
import { UsersPage } from '@/features/workspace/pages/UsersPage'
import { WorksPage } from './WorksPage'
import { ResourcesPage } from './ResourcesPage'
import type { ThemeMode, ThemePreset, UserProfile } from '@/types/auth'

type WorkspaceContentProps = {
  section: WorkspaceSection
  isAdmin: boolean
  profile: UserProfile | null
  theme: ThemeMode
  themePreset: ThemePreset
  onThemePresetChange: (preset: ThemePreset) => void
}

export function WorkspaceContent({ section, isAdmin, profile, theme, themePreset, onThemePresetChange }: WorkspaceContentProps) {
  const isAdminOrDirector = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase()
    const roles = (profile?.roles ?? []).map((entry) => entry.toLowerCase())
    return (
      role === 'admin' ||
      role === 'administrator' ||
      roles.includes('admin') ||
      roles.includes('administrator') ||
      role === 'operational_director' ||
      roles.includes('operational_director')
    )
  }, [profile?.role, profile?.roles])

  const isProjectManager = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase()
    const roles = (profile?.roles ?? []).map((entry) => entry.toLowerCase())
    return role === 'project_manager' || roles.includes('project_manager')
  }, [profile?.role, profile?.roles])

  const canEditWorks = isAdminOrDirector || isProjectManager

  if (section === 'users') return <UsersPage canManage={isAdmin} />
  if (section === 'contractors') return <ContractorsPage canManage={isAdminOrDirector} />
  if (section === 'works') return <WorksPage canManage={canEditWorks} />
  if (section === 'resources') return <ResourcesPage canManage={canEditWorks} />
  if (section === 'settings') return <SettingsPage theme={theme} themePreset={themePreset} onThemePresetChange={onThemePresetChange} />
  return <ProjectsPage profile={profile} />
}

