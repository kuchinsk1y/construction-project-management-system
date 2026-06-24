import { useQuery } from '@tanstack/react-query'

import { fetchProjects } from '@/features/projects/api'
import { mapApiProjectToItem } from '@/features/projects/types'

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects', 'db'],
    queryFn: async () => {
      const rows = await fetchProjects()
      return rows.map(mapApiProjectToItem)
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  })
}
