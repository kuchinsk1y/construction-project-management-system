import { PageBlueprintPanel } from '@/features/workspace/components/PageBlueprintPanel'
import { pageBlueprints } from '@/features/workspace/config/pageBlueprints'

export function ReportsPage() {
  return <PageBlueprintPanel blueprint={pageBlueprints.reports} />
}
