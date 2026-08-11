import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Edit, Trash2, Layers, Users, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchDepartments,
  fetchWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
  fetchForemen,
  fetchForemenAssignments,
  bulkAssignForemen,
} from '@/features/projects/api'
import type { ApiMilestone, CreateWorkTypePayload, ApiWorkType } from '@/features/projects/types'
import { WorkTypeFormDrawer } from './WorkTypeFormDrawer'
import { DepartmentForemenDrawer } from './DepartmentForemenDrawer'

type WorksTabProps = {
  projectId: string
  milestones: ApiMilestone[]
  formatBudget: (val: number, currency?: string) => string
  canEditProject: boolean
}

function parseDateValue(value: string): Date | null {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return null

  const gvizMatch = value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,[^)]*)?\)$/)
  const date = gvizMatch ? new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3])) : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateLocal(value: string | undefined | null, fallback = '-'): string {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return fallback
  const date = parseDateValue(value)
  if (!date) return fallback
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}.${month}.${year}`
}

export function WorksTab({ projectId, milestones, canEditProject }: WorksTabProps) {
  const queryClient = useQueryClient()

  const [showAddForm, setShowAddForm] = useState(false)
  const [showForemenDrawer, setShowForemenDrawer] = useState(false)

  const [editingWorkTypeId, setEditingWorkTypeId] = useState<string | null>(null)
  const [workTypeError, setWorkTypeError] = useState('')
  const [workTypeForm, setWorkTypeForm] = useState<CreateWorkTypePayload>({
    milestoneId: '',
    departmentId: 0,
    name: '',
    unit: '',
    totalQuantity: 0,
    plannedStart: '',
    plannedEnd: '',
  })

  // Data queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 15,
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

  const bulkAssignForemenMutation = useMutation({
    mutationFn: (payload: { departmentId: number; foremanIds: number[] }[]) => bulkAssignForemen(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['foremen-assignments', projectId] })
      setShowForemenDrawer(false)
    },
  })

  const createWorkTypeMutation = useMutation({
    mutationFn: (payload: CreateWorkTypePayload) => createWorkType(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['work-types', projectId] })
      resetForm()
    },
    onError: (err: Error) => setWorkTypeError(err.message),
  })

  const updateWorkTypeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateWorkTypePayload> }) =>
      updateWorkType(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['work-types', projectId] })
      resetForm()
    },
    onError: (err: Error) => setWorkTypeError(err.message),
  })

  const deleteWorkTypeMutation = useMutation({
    mutationFn: (id: string) => deleteWorkType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['work-types', projectId] })
    },
  })

  const resetForm = () => {
    setWorkTypeForm({ milestoneId: '', departmentId: 0, name: '', unit: '', totalQuantity: 0, plannedStart: '', plannedEnd: '' })
    setEditingWorkTypeId(null)
    setWorkTypeError('')
    setShowAddForm(false)
  }

  const handleEditWorkType = (wt: ApiWorkType) => {
    setWorkTypeForm({
      milestoneId: wt.milestoneId,
      departmentId: Number(wt.departmentId),
      name: wt.name,
      unit: wt.unit || '',
      totalQuantity: wt.totalQuantity ? Number(wt.totalQuantity) : 0,
      plannedStart: wt.plannedStart || '',
      plannedEnd: wt.plannedEnd || '',
    })
    setEditingWorkTypeId(wt.id)
    setShowAddForm(true)
    setWorkTypeError('')
  }

  const handleWorkTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workTypeForm.milestoneId) return setWorkTypeError('Należy wybrać kamień milowy')
    if (!workTypeForm.departmentId) return setWorkTypeError('Należy wybrać dział')
    if (!workTypeForm.name.trim()) return setWorkTypeError('Nazwa rodzaju robót jest wymagana')

    const payload: CreateWorkTypePayload = {
      milestoneId: workTypeForm.milestoneId,
      departmentId: Number(workTypeForm.departmentId),
      name: workTypeForm.name.trim(),
      unit: workTypeForm.unit || undefined,
      totalQuantity: workTypeForm.totalQuantity ? Number(workTypeForm.totalQuantity) : undefined,
      plannedStart: workTypeForm.plannedStart || undefined,
      plannedEnd: workTypeForm.plannedEnd || undefined,
    }

    if (editingWorkTypeId) {
      updateWorkTypeMutation.mutate({ id: editingWorkTypeId, payload })
    } else {
      createWorkTypeMutation.mutate(payload)
    }
  }

  // Derived state
  const tableData = useMemo(() => {
    // Map workTypes into array linking with their milestone and department
    return workTypes.map((wt) => {
      const milestone = milestones.find((m) => m.id === wt.milestoneId)
      const department = departments.find((d) => d.id === Number(wt.departmentId))
      return {
        ...wt,
        milestoneNo: milestone?.milestoneNo || '?',
        milestoneDesc: milestone?.description || 'Nieznany KM',
        milestonePercentage: milestone?.percentage || 0,
        departmentName: department?.name || '?',
      }
    }).sort((a, b) => {
      // Sort by Milestone No then Work Type Name
      if (a.milestoneNo === b.milestoneNo) return a.name.localeCompare(b.name)
      return a.milestoneNo.localeCompare(b.milestoneNo)
    })
  }, [workTypes, milestones, departments])

  // Derive which departments to show in the foremen cards
  const activeDepartments = useMemo(() => {
    const depsToDisplay = new Set<number>()
    // Include departments that have an assigned foreman
    foremenAssignments.forEach(a => depsToDisplay.add(a.departmentId))
    // Include departments that have a work type defined
    workTypes.forEach(w => depsToDisplay.add(Number(w.departmentId)))

    return Array.from(depsToDisplay)
      .map(id => departments.find(d => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [workTypes, foremenAssignments, departments])

  return (
    <div className="w-full space-y-5 animate-tab-content">
      {/* 1. Department Foremen Section */}
      <div className="w-full rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--background)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <div className="p-1.5 rounded-md bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
              <Users size={16} />
            </div>
            <span>Kierownictwo Działów</span>
          </div>
          {canEditProject && (
            <Button
              onClick={() => setShowForemenDrawer(true)}
              variant="outline"
              className="text-[11px] h-8 px-4 rounded-xl font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-[var(--sidebar-primary)] transition-colors"
            >
              Zarządzaj przypisaniami
            </Button>
          )}
        </div>

        {assignmentsLoading || workTypesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : activeDepartments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
            <p className="text-xs text-[var(--muted-foreground)] mb-2 font-medium">Brak przypisanych działów do tego projektu.</p>
            {canEditProject && (
              <p className="text-[10px] text-[var(--muted-foreground)]">Dodaj roboty poniżej lub użyj "Zarządzaj przypisaniami" aby wstępnie przydzielić brygadzistów.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {activeDepartments.map(dep => {
              const depsAssignments = foremenAssignments.filter(a => a.departmentId === dep.id)
              const hasWorks = workTypes.some(wt => Number(wt.departmentId) === dep.id)
              const needsForeman = hasWorks && depsAssignments.length === 0

              return (
                <div key={dep.id} className={`flex flex-col gap-2 p-3 rounded-xl border bg-[var(--background)] shadow-sm min-w-[200px] flex-1 max-w-[280px] transition-colors ${needsForeman ? 'border-orange-500/40 bg-orange-500/5' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Dział: <span className="text-[var(--foreground)]">{dep.name}</span>
                    </span>
                    {needsForeman && (
                      <span title="Dział ma roboty, ale brakuje przypisanego brygadzisty">
                        <ShieldAlert size={14} className="text-orange-500" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {depsAssignments.length === 0 ? (
                      <span className="text-xs text-[var(--muted-foreground)] italic opacity-70">
                        Brak przypisanych
                      </span>
                    ) : (
                      depsAssignments.map(a => (
                        <div key={a.id} className="inline-flex items-center gap-1.5 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm">
                          <Users size={12} className="opacity-70" />
                          {a.foremanName}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. Works Table Section */}
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-5 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="p-1.5 rounded-md bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                <Layers size={16} />
              </div>
              <span>Rodzaje robót / zakres prac</span>
            </div>

            {canEditProject && (
              <Button
                onClick={() => {
                  if (showAddForm) resetForm()
                  else setShowAddForm(true)
                }}
                className={`text-[11px] h-8 px-4 rounded-xl flex items-center gap-1.5 transition font-bold shadow-sm ${showAddForm
                  ? 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
                  : 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]'
                  }`}
              >
                <Plus size={14} className={showAddForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                <span>{showAddForm ? 'Anuluj' : 'Dodaj robotę'}</span>
              </Button>
            )}
          </div>

          {/* Form Error in table view if needed, but drawer has its own */}
          {workTypeError && !showAddForm && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-500">
              {workTypeError}
            </div>
          )}

          {/* Table View */}
          <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--card)] shadow-xs">
            <div className="max-h-[600px] overflow-auto custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-[var(--background)]/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-2 py-2 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">KM</th>
                    <th className="px-3 py-2 border-r border-zinc-200/70 dark:border-zinc-800/70 w-full">Etap</th>
                    <th className="px-3 py-2 border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Rodz. rb.</th>
                    <th className="px-2 py-2 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">%</th>
                    <th className="px-3 py-2 border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Start</th>
                    <th className="px-3 py-2 border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Koniec</th>
                    <th className="px-2 py-2 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Jm.</th>
                    <th className="px-3 py-2 text-right border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Ilość</th>
                    <th className="px-3 py-2 border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">Dział</th>
                    {canEditProject && <th className="px-2 py-2 text-center w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 font-medium">
                  {workTypesLoading ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-[var(--muted-foreground)]">
                        <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                        Wczytywanie robót...
                      </td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-[var(--muted-foreground)]">
                        Brak zdefiniowanych robót.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row) => (
                      <tr key={row.id} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 align-middle cursor-default">
                        <td className="px-2 py-2 text-center text-zinc-500 font-bold border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{row.milestoneNo}</td>
                        <td className="px-3 py-2 text-[var(--foreground)] border-r border-zinc-200/70 dark:border-zinc-800/70 text-[11px] truncate max-w-[150px]" title={row.milestoneDesc}>{row.milestoneDesc}</td>
                        <td className="px-3 py-2 font-bold text-[var(--sidebar-primary)] border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{row.name}</td>
                        <td className="px-2 py-2 text-zinc-500 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{row.milestonePercentage}%</td>
                        <td className="px-3 py-2 text-[var(--muted-foreground)] border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{formatDateLocal(row.plannedStart)}</td>
                        <td className="px-3 py-2 text-[var(--muted-foreground)] border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{formatDateLocal(row.plannedEnd)}</td>
                        <td className="px-2 py-2 text-zinc-500 text-center border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{row.unit || '-'}</td>
                        <td className="px-3 py-2 font-bold text-[var(--foreground)] text-right border-r border-zinc-200/70 dark:border-zinc-800/70 whitespace-nowrap">{row.totalQuantity ? Number(row.totalQuantity).toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 border-r border-zinc-200/70 dark:border-zinc-800/70">
                          <span className="inline-flex items-center rounded-md bg-[var(--sidebar-primary)]/10 px-2 py-1 text-[10px] font-bold text-[var(--sidebar-primary)] whitespace-nowrap shadow-sm">
                            {row.departmentName}
                          </span>
                        </td>
                        {canEditProject && (
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditWorkType(row)}
                                className="p-1.5 rounded-md text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 transition-colors"
                                title="Edytuj robotę"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Czy na pewno chcesz usunąć robotę: ${row.name}?`)) {
                                    deleteWorkTypeMutation.mutate(row.id)
                                  }
                                }}
                                disabled={deleteWorkTypeMutation.isPending}
                                className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                                title="Usuń robotę"
                              >
                                {deleteWorkTypeMutation.isPending && editingWorkTypeId === row.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Works Drawer */}
      <WorkTypeFormDrawer
        isOpen={showAddForm}
        onClose={resetForm}
        milestones={milestones}
        departments={departments}
        workTypeForm={workTypeForm}
        setWorkTypeForm={setWorkTypeForm}
        editingWorkTypeId={editingWorkTypeId}
        workTypeError={workTypeError}
        setWorkTypeError={setWorkTypeError}
        handleWorkTypeSubmit={handleWorkTypeSubmit}
        isPending={createWorkTypeMutation.isPending || updateWorkTypeMutation.isPending}
      />

      {/* Foremen Assignments Drawer */}
      <DepartmentForemenDrawer
        isOpen={showForemenDrawer}
        onClose={() => setShowForemenDrawer(false)}
        departments={departments}
        users={foremenUsers}
        initialAssignments={foremenAssignments}
        onSubmit={(assignments) => bulkAssignForemenMutation.mutate(assignments)}
        isPending={bulkAssignForemenMutation.isPending}
      />
    </div>
  )
}
