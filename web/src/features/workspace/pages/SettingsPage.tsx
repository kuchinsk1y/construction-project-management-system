import { PageBlueprintPanel } from '@/features/workspace/components/PageBlueprintPanel'
import { pageBlueprints } from '@/features/workspace/config/pageBlueprints'

export function SettingsPage() {
  return <PageBlueprintPanel blueprint={pageBlueprints.settings} />
}
