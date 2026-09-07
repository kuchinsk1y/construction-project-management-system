import { useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { ContractorsPage } from './ContractorsPage'
import { DepartmentsPage } from './DepartmentsPage'
import { DashboardPage } from './DashboardPage'
import { ProjectsPage } from '@/features/workspace/pages/ProjectsPage'
import { SettingsPage } from '@/features/workspace/pages/SettingsPage'
import { UsersPage } from '@/features/workspace/pages/UsersPage'
import { WorksPage } from './WorksPage'
import { ResourcesPage } from './ResourcesPage'
import type { ThemeMode, ThemePreset, UserProfile } from '@/types/auth'

type WorkspaceContentProps = {
  isAdmin: boolean
  profile: UserProfile | null
  theme: ThemeMode
  themePreset: ThemePreset
  onThemePresetChange: (preset: ThemePreset) => void
}

export function WorkspaceContent({ isAdmin, profile, theme, themePreset, onThemePresetChange }: WorkspaceContentProps) {
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

  const canViewUsers = isAdminOrDirector
  const canEditWorks = isAdminOrDirector || isProjectManager

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/projects/*" element={<ProjectsPage profile={profile} />} />
      
      {canViewUsers && (
        <Route path="/users" element={<UsersPage canView={canViewUsers} canAdd={isAdmin} canEdit={isAdminOrDirector} />} />
      )}
      
      {isAdminOrDirector && (
        <Route path="/contractors" element={<ContractorsPage canManage={isAdminOrDirector} />} />
      )}

      {(isAdminOrDirector || isProjectManager) && (
        <Route path="/departments" element={<DepartmentsPage canManage={isAdminOrDirector || isProjectManager} />} />
      )}

      {canEditWorks && (
        <>
          <Route path="/works" element={<WorksPage canManage={canEditWorks} />} />
          <Route path="/resources" element={<ResourcesPage canManage={canEditWorks} />} />
        </>
      )}

      <Route path="/settings" element={<SettingsPage theme={theme} themePreset={themePreset} onThemePresetChange={onThemePresetChange} />} />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}
