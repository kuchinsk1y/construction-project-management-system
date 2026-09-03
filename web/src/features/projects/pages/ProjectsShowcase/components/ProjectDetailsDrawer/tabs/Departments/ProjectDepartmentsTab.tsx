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
import type { ApiMilestone } from '@/features/projects/types' // ApiWorkType
import { AlertTriangle, Trash2 } from 'lucide-react'
import { getDepartmentIcon } from '@/constants/department-icons'
import { ManageDepartmentsDrawer, type DepartmentFormRow } from '@/features/projects/pages/ProjectsShowcase/components/ProjectDetailsDrawer/tabs/Departments/ManageDepartmentsDrawer'

type ProjectDepartmentsTabProps = {
  projectId: string
  milestones: ApiMilestone[]
  canEditProject: boolean
}

export function ProjectDepartmentsTab({ projectId, canEditProject }: ProjectDepartmentsTabProps) {
  const queryClient = useQueryClient()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [deletingDept, setDeletingDept] = useState<number | null>(null)

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
          foremanIds: r.foremanId ? [Number(r.foremanId)] : []
        }))
      }
      return batchSyncDepartments(projectId, payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-departments', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['foremen-assignments', projectId] })
      ])
      setIsDrawerOpen(false)
    },
  })

  const handleDrawerSubmit = (rows: DepartmentFormRow[]) => {
    batchSyncMutation.mutate(rows)
  }
  const executeDeletion = (departmentId: number) => {
    // Reconstruct current assignments without this department
    const newRows = projectDepartments
      .filter(d => d.departmentId !== departmentId)
      .map(d => {
        const foreman = foremenAssignments.find(a => a.departmentId === d.departmentId)
        return { 
          uid: d.departmentId.toString(),
          departmentId: d.departmentId, 
          foremanId: foreman?.foremanId || ('' as const)
        }
      })
    batchSyncMutation.mutate(newRows, {
      onSuccess: () => setDeletingDept(null)
    })
  }

  const isLoading = projectDepsLoading || assignmentsLoading || globalDepsLoading || workTypesLoading

  return (
    <div className="w-full space-y-3 animate-tab-content">
      <div className="flex items-center justify-between bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">Konfiguracja Działów</h3>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 max-w-lg">
            Przypisuj działy do projektu i wyznaczaj odpowiedzialnych kierowników.
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
                <th className="px-4 py-3 w-1/2">Dział</th>
                <th className="px-4 py-3 w-1/2">St. Brygadzista</th>
                {canEditProject && <th className="px-4 py-3 w-14 text-center">Akcje</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {projectDepartments.map(dep => {
                const depsAssignments = foremenAssignments.filter(a => a.departmentId === dep.departmentId)
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
                    {canEditProject && (
                      <td className="px-4 py-3 align-top text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDeletingDept(dep.departmentId)}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 border-rose-500/20"
                          title="Usuń ten dział"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    )}
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
          onSubmit={handleDrawerSubmit}
          isPending={batchSyncMutation.isPending}
        />
      )}

      {deletingDept && (() => {
        const isLinkedToWorks = workTypes.some(wt => wt.departmentId === deletingDept)
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl motion-safe:animate-[auth-rise_320ms_ease-out]">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Usuń dział z projektu</h4>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {isLinkedToWorks ? (
                      <>
                        Nie można usunąć tego działu.
                        <span className="block mt-1 font-bold text-rose-500">
                          Najpierw musisz odpiąć ten dział od robót, do których jest przypisany.
                        </span>
                      </>
                    ) : (
                      'Czy na pewno chcesz usunąć ten dział z projektu?'
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingDept(null)}
                  disabled={batchSyncMutation.isPending}
                  className="rounded-xl"
                >
                  {isLinkedToWorks ? 'Zamknij' : 'Anuluj'}
                </Button>
                {!isLinkedToWorks && (
                  <Button
                    type="button"
                    onClick={() => executeDeletion(deletingDept)}
                    disabled={batchSyncMutation.isPending}
                    className="rounded-xl bg-rose-500 text-white hover:bg-rose-600 shadow-md"
                  >
                    {batchSyncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Tak, usuń'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
