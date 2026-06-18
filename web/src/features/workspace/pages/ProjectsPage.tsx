import { PageBlueprintPanel } from '@/features/workspace/components/PageBlueprintPanel'
import { pageBlueprints } from '@/features/workspace/config/pageBlueprints'
import { ProjectsShowcase } from '@/features/projects/ProjectsShowcase'

export function ProjectsPage() {
  return (
    <>
      <ProjectsShowcase />
      <PageBlueprintPanel blueprint={pageBlueprints.projects} />
    </>
  )
}
