import { useQuery } from '@tanstack/react-query'

import { fetchProjectsFromGoogleSheets } from '@/features/projects/googleSheets'

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects', 'google-sheets'],
    queryFn: fetchProjectsFromGoogleSheets,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  })
}
