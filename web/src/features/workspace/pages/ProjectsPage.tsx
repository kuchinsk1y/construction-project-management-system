import { ProjectsShowcase } from '@/features/projects/ProjectsShowcase'
import type { UserProfile } from '@/types/auth'

type ProjectsPageProps = {
  profile: UserProfile | null
}

export function ProjectsPage({ profile }: ProjectsPageProps) {
  return <ProjectsShowcase profile={profile} />
}
