import type { LucideIcon } from 'lucide-react'
import { BriefcaseBusiness, Building2, Settings2, UsersRound, LayoutDashboard, Network } from 'lucide-react'

import type { WorkspaceSection } from '@/features/workspace/types'

export type WorkspaceNavItem = {
  key: WorkspaceSection
  label: string
  icon: LucideIcon
}

export const workspaceNavigation: WorkspaceNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projekty', icon: BriefcaseBusiness },
  // { key: 'works', label: 'Zakres prac', icon: ClipboardList },
  // { key: 'resources', label: 'Zasoby', icon: CalendarDays },
  { key: 'contractors', label: 'Kontrahenci', icon: Building2 },
  { key: 'departments', label: 'Działy', icon: Network },
  { key: 'users', label: 'Użytkownicy', icon: UsersRound },
  { key: 'settings', label: 'Ustawienia', icon: Settings2 },
]
