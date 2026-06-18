import { PageBlueprintPanel } from '@/features/workspace/components/PageBlueprintPanel'
import { pageBlueprints } from '@/features/workspace/config/pageBlueprints'

export function ResourcesPage() {
  return <PageBlueprintPanel blueprint={pageBlueprints.resources} />
}
