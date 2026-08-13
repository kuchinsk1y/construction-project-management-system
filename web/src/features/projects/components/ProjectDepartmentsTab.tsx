import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Folder, Users } from 'lucide-react' // Briefcase
import { Button } from '@/components/ui/button'
import {
  fetchDepartments,
  fetchProjectDepartments,
  fetchForemen,
  fetchForemenAssignments,
  fetchWorkTypes,
  batchSyncDepartments,
} from '@/features/projects/api'
import type { ApiMilestone } from '@/features/projects/types'
import { getDepartmentIcon } from '@/constants/department-icons'
import { ManageDepartmentsDrawer, type DepartmentFormRow } from './ManageDepartmentsDrawer'

type ProjectDepartmentsTabProps = {
  projectId: string
  milestones: ApiMilestone[]
  canEditProject: boolean
}

export function ProjectDepartmentsTab({ projectId, canEditProject }: ProjectDepartmentsTabProps) {
  const queryClient = useQueryClient()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Queries
  const { data: globalDepartments = [], isLoading: globalDepsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 15,
  })

  const { data: projectDepartments = [], isLoading: projectDepsLoading } = useQuery({
    queryKey: ['project-departments', projectId],
    queryFn: () => fetchProjectDepartments(projectId),
    enabled: !!projectId,
  })

  const { data: foremenUsers = [] } = useQuery({
    queryKey: ['foremen'],
    queryFn: fetchForemen,
    staleTime: 1000 * 60 * 15,
  })

  const { data: foremenAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['foremen-assignments', projectId],
    queryFn: () => fetchForemenAssignments(projectId),
    enabled: !!projectId,
  })

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types', projectId],
    queryFn: () => fetchWorkTypes(projectId),
    enabled: !!projectId,
  })

  const batchSyncMutation = useMutation({
    mutationFn: (rows: DepartmentFormRow[]) => {
      const payload = {
        assignments: rows.map(r => ({
          departmentId: Number(r.departmentId),
          foremanIds: r.foremanId ? [Number(r.foremanId)] : [],
          works: r.works.map(w => ({ id: w.id, name: w.name }))
        }))
      }
      return batchSyncDepartments(projectId, payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-departments', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['foremen-assignments', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['work-types', projectId] }),
      ])
      setIsDrawerOpen(false)
    },
  })

  const handleDrawerSubmit = (rows: DepartmentFormRow[]) => {
    batchSyncMutation.mutate(rows)
  }

  const isLoading = projectDepsLoading || assignmentsLoading || workTypesLoading || globalDepsLoading

  return (
    <div className="w-full space-y-3 animate-tab-content">
      <div className="flex items-center justify-between bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">Konfiguracja Działów</h3>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 max-w-lg">
            Przypisuj działy do projektu, wyznaczaj odpowiedzialnych kierowników oraz dodawaj prace (roboty) dedykowane dla danego działu.
          </p>
        </div>
        {canEditProject && (
          <Button
            onClick={() => setIsDrawerOpen(true)}
            className="text-[11px] h-8 px-4 rounded-xl flex items-center gap-1.5 transition font-bold shadow-sm bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
          >
            <Plus size={14} />
            <span>Dodaj / Edytuj</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : projectDepartments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-8 text-center bg-[var(--muted)]/20">
          <div className="p-4 rounded-full bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] mb-3">
            <Folder size={24} />
          </div>
          <p className="text-sm text-[var(--foreground)] font-semibold mb-1">Brak działów w projekcie</p>
          {canEditProject && (
            <p className="text-xs text-[var(--muted-foreground)]">Kliknij "Dodaj / Edytuj", aby rozpocząć konfigurację.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)] shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--muted)]/30 border-b border-[var(--border)] text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-1/4">Dział</th>
                <th className="px-4 py-3 w-1/4">Brygadzista</th>
                <th className="px-4 py-3 w-1/2">Roboty (Prace)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {projectDepartments.map(dep => {
                const depsAssignments = foremenAssignments.filter(a => a.departmentId === dep.departmentId)
                const depsWorks = workTypes.filter(wt => Number(wt.departmentId) === dep.departmentId)
                const Icon = getDepartmentIcon(dep.departmentIcon || 'Folder').icon

                return (
                  <tr key={dep.departmentId} className="hover:bg-[var(--muted)]/10 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                          <Icon size={14} />
                        </div>
                        <span className="font-bold text-[var(--foreground)]">{dep.departmentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {depsAssignments.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {depsAssignments.map(a => (
                            <div key={a.id} className="inline-flex items-center gap-1.5 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] px-2 py-1 rounded text-[11px] font-bold w-fit shadow-sm">
                              <Users size={12} />
                              {a.foremanName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--muted-foreground)] italic opacity-70">Brak</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {depsWorks.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {depsWorks.map(wt => (
                            <div key={wt.id} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-[var(--background)] border border-[var(--border)] shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--sidebar-primary)] opacity-70" />
                              <span className="text-[10px] font-semibold text-[var(--foreground)]">{wt.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--muted-foreground)] italic opacity-70">Brak przypisanych robót</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {canEditProject && (
        <ManageDepartmentsDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          availableDepartments={globalDepartments}
          users={foremenUsers}
          currentAssignments={projectDepartments.map(d => {
            const foreman = foremenAssignments.find(a => a.departmentId === d.departmentId)
            return { departmentId: d.departmentId, foremanId: foreman?.foremanId || null }
          })}
          currentWorks={workTypes}
          onSubmit={handleDrawerSubmit}
          isPending={batchSyncMutation.isPending}
        />
      )}
    </div>
  )
}
