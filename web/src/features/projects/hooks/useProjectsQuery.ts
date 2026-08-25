import { useQuery } from '@tanstack/react-query'
import { fetchProjects } from '@/features/projects/api'

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  })
}
