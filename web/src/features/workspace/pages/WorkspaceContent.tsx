import type { WorkspaceSection } from '@/features/workspace/types'
import { FinancePage } from '@/features/workspace/pages/FinancePage'
import { ProjectsPage } from '@/features/workspace/pages/ProjectsPage'
import { ReportsPage } from '@/features/workspace/pages/ReportsPage'
import { ResourcesPage } from '@/features/workspace/pages/ResourcesPage'
import { SettingsPage } from '@/features/workspace/pages/SettingsPage'

export function WorkspaceContent({ section }: { section: WorkspaceSection }) {
  if (section === 'resources') return <ResourcesPage />
  if (section === 'reports') return <ReportsPage />
  if (section === 'finance') return <FinancePage />
  if (section === 'settings') return <SettingsPage />
  return <ProjectsPage />
}
