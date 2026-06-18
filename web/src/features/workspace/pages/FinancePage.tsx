import { PageBlueprintPanel } from '@/features/workspace/components/PageBlueprintPanel'
import { pageBlueprints } from '@/features/workspace/config/pageBlueprints'

export function FinancePage() {
  return <PageBlueprintPanel blueprint={pageBlueprints.finance} />
}
