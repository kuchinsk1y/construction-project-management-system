import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import type { ApiDepartment, CreateDepartmentPayload, UpdateDepartmentPayload } from './types'

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<ApiDepartment[]>('/departments'),
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDepartmentPayload) => apiPost<ApiDepartment>('/departments', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDepartmentPayload }) =>
      apiPatch<ApiDepartment>(`/departments/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['departments'] })
      const previous = queryClient.getQueryData<ApiDepartment[]>(['departments'])

      if (previous) {
        queryClient.setQueryData<ApiDepartment[]>(['departments'], (old) => {
          if (!old) return old
          return old.map(dept =>
            dept.id === id
              ? { ...dept, ...data } as ApiDepartment
              : dept
          )
        })
      }
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['departments'], context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/departments/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })
}
