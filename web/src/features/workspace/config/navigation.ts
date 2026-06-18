import type { LucideIcon } from 'lucide-react'
import { Banknote, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList, Settings2, UsersRound } from 'lucide-react'

import type { WorkspaceSection } from '@/features/workspace/types'

export type WorkspaceNavItem = {
  key: WorkspaceSection
  label: string
  icon: LucideIcon
}

export const workspaceNavigation: WorkspaceNavItem[] = [
  { key: 'projects', label: 'Projekty', icon: BriefcaseBusiness },
  { key: 'resources', label: 'Zasoby', icon: ClipboardList },
  { key: 'reports', label: 'Raporty', icon: ChartNoAxesCombined },
  { key: 'finance', label: 'Finanse', icon: Banknote },
  { key: 'users', label: 'Uzytkownicy', icon: UsersRound },
  { key: 'settings', label: 'Ustawienia', icon: Settings2 },
]
