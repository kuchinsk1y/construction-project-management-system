import { ProjectsShowcase } from '@/features/projects/pages/ProjectsShowcase/ProjectsShowcase'
import type { UserProfile } from '@/types/auth'

type ProjectsPageProps = {
  profile: UserProfile | null
}

export function ProjectsPage({ profile }: ProjectsPageProps) {
  return <ProjectsShowcase profile={profile} />
}
