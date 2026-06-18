import type { LucideIcon } from 'lucide-react'
import { Banknote, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList, Settings2 } from 'lucide-react'

import type { WorkspaceSection } from '@/features/workspace/types'

export type WorkspaceNavItem = {
  key: WorkspaceSection
  label: string
  icon: LucideIcon
}

export const workspaceNavigation: WorkspaceNavItem[] = [
  { key: 'projects', label: 'Projects', icon: BriefcaseBusiness },
  { key: 'resources', label: 'Resources', icon: ClipboardList },
  { key: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
  { key: 'finance', label: 'Finance', icon: Banknote },
  { key: 'settings', label: 'Settings', icon: Settings2 },
]
