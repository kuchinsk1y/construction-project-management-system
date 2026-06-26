import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Edit,
  Loader2,
  Plus,
  Trash2,
  ClipboardList,
  UserRound,
  Building2,
  CalendarRange,
  CircleDollarSign,
  ChevronUp,
  FolderOpen,
  UserCheck,
  CalendarDays,
  Layers,
} from 'lucide-react'
import { useState, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  fetchProjects,
  fetchMilestones,
  fetchDepartments,
  fetchForemen,
  fetchWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
  fetchForemenAssignments,
  assignForeman,
} from '@/features/projects/api'
import type {
  ApiProject,
  CreateWorkTypePayload,
  ApiWorkType,
} from '@/features/projects/types'

type WorksPageProps = {
  canManage: boolean
}

function parseDateValue(value: string): Date | null {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return null

  const gvizMatch = value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,[^)]*)?\)$/)
  const date = gvizMatch ? new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3])) : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(value: string, noDeadlineLabel: string): string {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return noDeadlineLabel

  const date = parseDateValue(value)
  if (!date) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}.${month}.${year}`
}

function formatBudget(value: number, currencyCode = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currencyCode || 'PLN',
    maximumFractionDigits: 0,
  }).format(value)
}

function getDeptColorClass(deptName: string): { border: string; bg: string; text: string } {
  const name = deptName.toLowerCase()
  if (name.includes('kafar')) return { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-500' }
  if (name.includes('montaż')) return { border: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-500' }
  if (name.includes('elektryka')) return { border: 'border-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-500' }
  if (name.includes('maszyny')) return { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-500' }
  if (name.includes('kable') || name.includes('ac')) return { border: 'border-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-500' }
  return { border: 'border-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-500' }
}

export function WorksPage({ canManage }: WorksPageProps) {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Form states
  const [workTypeForm, setWorkTypeForm] = useState<CreateWorkTypePayload>({
    milestoneId: '',
    departmentId: 0,
    name: '',
    unit: '',
    totalQuantity: 0,
    plannedStart: '',
    plannedEnd: '',
  })
  const [editingWorkTypeId, setEditingWorkTypeId] = useState<string | null>(null)
  const [workTypeError, setWorkTypeError] = useState('')

  // Fetch all projects for dropdown
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ApiProject[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  // Find active project details
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId)
  }, [projects, selectedProjectId])

  // Fetch project-specific data
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', selectedProjectId],
    queryFn: () => fetchMilestones(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types', selectedProjectId],
    queryFn: () => fetchWorkTypes(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  const { data: foremenAssignments = [], isLoading: foremenLoading } = useQuery({
    queryKey: ['foremen-assignments', selectedProjectId],
    queryFn: () => fetchForemenAssignments(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  // Reference data
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 15,
  })

  const { data: foremenUsers = [] } = useQuery({
    queryKey: ['foremen-users'],
    queryFn: fetchForemen,
    staleTime: 1000 * 60 * 15,
  })

  // Group work types by Milestone
  const groupedWorkTypes = useMemo(() => {
    const groups: Record<string, { milestoneId: string; milestoneNo: string; description: string; items: ApiWorkType[] }> = {}
    
    workTypes.forEach((wt) => {
      if (!groups[wt.milestoneId]) {
        const milestone = milestones.find((m) => m.id === wt.milestoneId)
        groups[wt.milestoneId] = {
          milestoneId: wt.milestoneId,
          milestoneNo: wt.milestoneNo,
          description: milestone?.description || '',
          items: [],
        }
      }
      groups[wt.milestoneId].items.push(wt)
    })
    
    return Object.values(groups)
  }, [workTypes, milestones])

  // Mutations
  const createWorkTypeMutation = useMutation({
    mutationFn: (payload: CreateWorkTypePayload) => createWorkType(selectedProjectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['work-types', selectedProjectId] })
      setWorkTypeForm({ milestoneId: '', departmentId: 0, name: '', unit: '', totalQuantity: 0, plannedStart: '', plannedEnd: '' })
      setWorkTypeError('')
      setShowAddForm(false)
    },
    onError: (err: Error) => {
      setWorkTypeError(err.message)
    },
  })

  const updateWorkTypeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateWorkTypePayload> }) =>
      updateWorkType(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['work-types', selectedProjectId] })
      setWorkTypeForm({ milestoneId: '', departmentId: 0, name: '', unit: '', totalQuantity: 0, plannedStart: '', plannedEnd: '' })
      setEditingWorkTypeId(null)
      setWorkTypeError('')
      setShowAddForm(false)
    },
    onError: (err: Error) => {
      setWorkTypeError(err.message)
    },
  })

  const deleteWorkTypeMutation = useMutation({
    mutationFn: (id: string) => deleteWorkType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['work-types', selectedProjectId] })
    },
    onError: (err: Error) => {
      setWorkTypeError(err.message)
    },
  })

  const assignForemanMutation = useMutation({
    mutationFn: ({ departmentId, foremanId }: { departmentId: number; foremanId: number }) =>
      assignForeman(selectedProjectId, departmentId, foremanId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['foremen-assignments', selectedProjectId] })
    },
  })

  const handleWorkTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workTypeForm.milestoneId) {
      setWorkTypeError('Należy wybrać kamień milowy')
      return
    }
    if (!workTypeForm.departmentId) {
      setWorkTypeError('Należy wybrać dział')
      return
    }
    if (!workTypeForm.name.trim()) {
      setWorkTypeError('Nazwa wewnętrzna jest wymagana')
      return
    }

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

  return (
    <div className="p-3">
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Title block */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
              Zakres prac i Brygadziści
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Krok 4: Definiowanie zakresu robót, terminów oraz przypisywanie starszych brygadzistów do działów.
            </p>
          </div>
        </div>

        {/* Modern selector card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-md transition-all hover:shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-sm space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Wybierz projekt do edycji
              </label>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-xs py-2 bg-[var(--background)]/50 rounded-xl px-3 border border-[var(--border)]">
                  <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={14} />
                  <span>Ładowanie listy projektów...</span>
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    setWorkTypeForm({ milestoneId: '', departmentId: 0, name: '', unit: '', totalQuantity: 0, plannedStart: '', plannedEnd: '' })
                    setEditingWorkTypeId(null)
                    setWorkTypeError('')
                    setShowAddForm(false)
                  }}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/10 font-medium cursor-pointer"
                >
                  <option value="">-- Wybierz projekt z listy --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Context details card when project is selected */}
            {selectedProject && (
              <div className="flex-1 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] p-4 flex flex-wrap gap-x-6 gap-y-3.5 text-xs text-[var(--muted-foreground)] animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                    <UserRound size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]/80">Kierownik</p>
                    <p className="font-semibold text-[var(--foreground)] mt-0.5">
                      {selectedProject.manager ? `${selectedProject.manager.firstName} ${selectedProject.manager.lastName}` : 'Nie przypisano'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Building2 size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]/80">Kontrahent</p>
                    <p className="font-semibold text-[var(--foreground)] mt-0.5">
                      {selectedProject.contractors?.name || 'Brak'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <CalendarRange size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]/80">Terminy kontraktu</p>
                    <p className="font-semibold text-[var(--foreground)] mt-0.5">
                      {selectedProject.start_date_contract ? formatDate(selectedProject.start_date_contract, '-') : ''} – {selectedProject.end_date_contract ? formatDate(selectedProject.end_date_contract, '-') : ''}
                    </p>
                  </div>
                </div>

                {selectedProject.contract_net_value && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <CircleDollarSign size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]/80">Wartość netto</p>
                      <p className="font-semibold text-[var(--foreground)] mt-0.5">
                        {formatBudget(Number(selectedProject.contract_net_value), selectedProject.currency || 'PLN')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form and list grid layout */}
        {!selectedProjectId ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)]/30 py-24 text-center shadow-inner">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] mb-5 shadow-sm animate-pulse">
              <ClipboardList size={26} />
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Brak wybranego projektu</h3>
            <p className="mt-1.5 max-w-sm text-xs text-[var(--muted-foreground)] font-medium">
              Wybierz projekt z menu powyżej, aby załadować strukturę organizacyjną, kamienie milowe oraz zdefiniować rodzaje robót.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Left panel: Foreman Assignments (1/3 width) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-md space-y-5">
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-[var(--foreground)] flex items-center gap-2">
                    <UserCheck size={16} className="text-[var(--sidebar-primary)]" />
                    Starsi Brygadziści (Działy)
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)] font-medium mt-1">
                    Przypisz starszego brygadzistę odpowiedzialnego za dany dział w tym projekcie.
                  </p>
                </div>

                {foremenLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={24} />
                    <span className="text-[11px] text-[var(--muted-foreground)]">Wczytywanie brygadzistów...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {departments.map((dept) => {
                      const assigned = foremenAssignments.find((a) => a.departmentId === dept.id)
                      const isAssigned = !!assigned?.foremanId
                      return (
                        <div
                          key={dept.id}
                          className={`flex flex-col gap-2 p-3.5 rounded-xl border transition ${
                            isAssigned
                              ? 'bg-[var(--sidebar-primary)]/[0.02] border-[var(--sidebar-primary)]/20'
                              : 'bg-[var(--background)]/30 border-[var(--border)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--foreground)]">{dept.name}</span>
                            <span
                              className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isAssigned
                                  ? 'bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]'
                                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                              }`}
                            >
                              {isAssigned ? 'Przypisany' : 'Brak'}
                            </span>
                          </div>
                          
                          <select
                            value={assigned?.foremanId || ''}
                            disabled={!canManage || assignForemanMutation.isPending}
                            onChange={(e) => {
                              if (e.target.value) {
                                assignForemanMutation.mutate({
                                  departmentId: dept.id,
                                  foremanId: Number(e.target.value),
                                })
                              }
                            }}
                            className={`h-9 w-full rounded-lg border px-2.5 text-xs outline-none transition font-medium cursor-pointer ${
                              isAssigned
                                ? 'border-[var(--sidebar-primary)]/30 bg-[var(--background)] text-[var(--foreground)]'
                                : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]/30'
                            } disabled:opacity-50`}
                          >
                            <option value="">-- Przypisz brygadzistę --</option>
                            {foremenUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Work Types Management (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-md space-y-5">
                
                {/* Header inside Panel */}
                <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-4">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-[var(--foreground)] flex items-center gap-2">
                      <Layers size={16} className="text-[var(--sidebar-primary)]" />
                      Rodzaje robót / zakres prac
                    </h3>
                    <p className="text-[11px] text-[var(--muted-foreground)] font-medium mt-1">
                      Zdefiniuj zakres prac powiązany z kamieniami milowymi oraz przypisz odpowiednie działy.
                    </p>
                  </div>
                  
                  {canManage && (
                    <Button
                      onClick={() => {
                        setShowAddForm(!showAddForm)
                        setWorkTypeError('')
                        if (editingWorkTypeId) {
                          setEditingWorkTypeId(null)
                          setWorkTypeForm({ milestoneId: '', departmentId: 0, name: '', unit: '', totalQuantity: 0, plannedStart: '', plannedEnd: '' })
                        }
                      }}
                      className={`text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 transition font-bold shadow-sm ${
                        showAddForm
                          ? 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
                          : 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90'
                      }`}
                    >
                      {showAddForm ? (
                        <>
                          <ChevronUp size={14} />
                          <span>Ukryj formularz</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Dodaj robotę</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {workTypeError && (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-500 animate-fade-in flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    {workTypeError}
                  </div>
                )}

                {/* Expandable addition/edit form */}
                {canManage && showAddForm && (
                  <form
                    onSubmit={handleWorkTypeSubmit}
                    className="bg-[var(--muted)]/20 p-5 rounded-2xl border border-[var(--border)] space-y-4 animate-slide-down shadow-inner"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]/80 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-[var(--sidebar-primary)]"></span>
                      {editingWorkTypeId ? 'Edytuj rodzaj roboty' : 'Dodaj nowy rodzaj roboty'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block space-y-1.5">
                        <span className="text-[11px] font-bold text-[var(--muted-foreground)]">KM / Etap <span className="text-rose-500">*</span></span>
                        {milestonesLoading ? (
                          <div className="h-9 flex items-center text-xs text-[var(--muted-foreground)] bg-[var(--background)] px-3 rounded-lg border border-[var(--border)]">Ładowanie...</div>
                        ) : (
                          <select
                            value={workTypeForm.milestoneId}
                            onChange={(e) => setWorkTypeForm((f) => ({ ...f, milestoneId: e.target.value }))}
                            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] font-medium cursor-pointer"
                          >
                            <option value="">-- Wybierz kamień milowy --</option>
                            {milestones.map((m) => (
                              <option key={m.id} value={m.id}>{m.milestoneNo} – {m.description}</option>
                            ))}
                          </select>
                        )}
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-[11px] font-bold text-[var(--muted-foreground)]">Dział <span className="text-rose-500">*</span></span>
                        <select
                          value={workTypeForm.departmentId || ''}
                          onChange={(e) => setWorkTypeForm((f) => ({ ...f, departmentId: Number(e.target.value) }))}
                          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] font-medium cursor-pointer"
                        >
                          <option value="">-- Wybierz dział --</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)]">Nazwa wewnętrzna zakresu <span className="text-rose-500">*</span></span>
                      <input
                        value={workTypeForm.name}
                        onChange={(e) => setWorkTypeForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="np. Wbijanie pali kafarowych, Układanie kabli DC"
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs outline-none transition focus:border-[var(--sidebar-primary)] font-medium"
                      />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block space-y-1.5">
                        <span className="text-[11px] font-bold text-[var(--muted-foreground)]">Jednostka obmiaru</span>
                        <select
                          value={workTypeForm.unit || ''}
                          onChange={(e) => setWorkTypeForm((f) => ({ ...f, unit: e.target.value }))}
                          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] font-medium cursor-pointer"
                        >
                          <option value="">-- Brak jednostki --</option>
                          <option value="szt.">szt.</option>
                          <option value="m">m</option>
                          <option value="m²">m²</option>
                          <option value="%">%</option>
                          <option value="kg">kg</option>
                          <option value="kpl">kpl</option>
                      </select>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)]">Ilość całkowita</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={workTypeForm.totalQuantity || ''}
                        onChange={(e) => setWorkTypeForm((f) => ({ ...f, totalQuantity: e.target.value ? Number(e.target.value) : 0 }))}
                        placeholder="np. 150"
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs outline-none transition focus:border-[var(--sidebar-primary)] font-medium"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)]">Planowany start prac</span>
                      <DatePicker
                        value={workTypeForm.plannedStart || ''}
                        onChange={(v) => setWorkTypeForm((f) => ({ ...f, plannedStart: v }))}
                        placeholder="dd.mm.rrrr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)]">Planowany koniec prac</span>
                      <DatePicker
                        value={workTypeForm.plannedEnd || ''}
                        onChange={(v) => setWorkTypeForm((f) => ({ ...f, plannedEnd: v }))}
                        min={workTypeForm.plannedStart || undefined}
                        placeholder="dd.mm.rrrr"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingWorkTypeId(null)
                        setWorkTypeForm({ milestoneId: '', departmentId: 0, name: '', unit: '', totalQuantity: 0, plannedStart: '', plannedEnd: '' })
                        setWorkTypeError('')
                        setShowAddForm(false)
                      }}
                      className="rounded-xl h-9 px-4 font-bold text-xs"
                    >
                      Anuluj
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createWorkTypeMutation.isPending || updateWorkTypeMutation.isPending}
                      className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] text-xs h-9 px-4 hover:bg-[var(--sidebar-primary)]/90 rounded-xl font-bold transition shadow-sm"
                    >
                      {editingWorkTypeId ? 'Zapisz zmiany' : 'Dodaj do projektu'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Work Types List grouped by Milestone */}
              <div className="space-y-6 pt-2">
                {workTypesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={28} />
                    <span className="text-xs text-[var(--muted-foreground)]">Wczytywanie zakresu prac...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedWorkTypes.map((group) => (
                      <div key={group.milestoneId} className="space-y-3 animate-fade-in">
                        {/* Milestone header */}
                        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border)]/65">
                          <span className="inline-flex items-center justify-center bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] font-extrabold text-[10px] px-2.5 py-0.5 rounded-lg shadow-sm">
                            {group.milestoneNo}
                          </span>
                          <span className="text-xs font-bold text-[var(--foreground)]">
                            {group.description || 'Bez opisu kamienia milowego'}
                          </span>
                        </div>

                        {/* Work types list for this milestone */}
                        <div className="grid grid-cols-1 gap-3">
                          {group.items.map((wt) => {
                            const colors = getDeptColorClass(wt.departmentName)
                            return (
                              <div
                                key={wt.id}
                                className={`rounded-xl border-l-4 ${colors.border} border border-[var(--border)] bg-[var(--background)]/40 p-4 relative group transition-all duration-200 hover:bg-[var(--background)] hover:shadow-md hover:border-[var(--border)]/80`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pr-16">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-flex items-center rounded-md ${colors.bg} ${colors.text} px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide`}>
                                        {wt.departmentName}
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                                      {wt.name}
                                    </h4>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                                    {wt.totalQuantity > 0 && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">Ilość:</span>
                                        <span className="font-extrabold text-[var(--foreground)] bg-[var(--muted)]/50 px-2 py-0.5 rounded-md">
                                          {wt.totalQuantity} {wt.unit}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {(wt.plannedStart || wt.plannedEnd) && (
                                      <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                                        <CalendarDays size={13} className="text-[var(--sidebar-primary)]" />
                                        <span className="font-semibold text-[11px]">
                                          {wt.plannedStart ? formatDate(wt.plannedStart, '-') : ''} – {wt.plannedEnd ? formatDate(wt.plannedEnd, '-') : ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {canManage && (
                                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingWorkTypeId(wt.id)
                                        setWorkTypeForm({
                                          milestoneId: wt.milestoneId,
                                          departmentId: wt.departmentId,
                                          name: wt.name,
                                          unit: wt.unit || '',
                                          totalQuantity: wt.totalQuantity,
                                          plannedStart: wt.plannedStart || '',
                                          plannedEnd: wt.plannedEnd || '',
                                        })
                                        setWorkTypeError('')
                                        setShowAddForm(true)
                                      }}
                                      className="rounded-lg p-1.5 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 hover:text-[var(--sidebar-primary)] transition"
                                      title="Edytuj robotę"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm('Czy na pewno chcesz usunąć tę robotę ze słownika projektu?')) {
                                          deleteWorkTypeMutation.mutate(wt.id)
                                        }
                                      }}
                                      disabled={deleteWorkTypeMutation.isPending}
                                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition disabled:opacity-50"
                                      title="Usuń robotę"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {workTypes.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--muted)]/5 shadow-inner animate-fade-in">
                        <FolderOpen className="text-[var(--muted-foreground)]/60 mb-3" size={30} />
                        <h4 className="text-xs font-bold text-[var(--foreground)]">Brak zdefiniowanego zakresu prac</h4>
                        <p className="mt-1 max-w-xs text-[11px] text-[var(--muted-foreground)] font-medium">
                          Ten projekt nie ma jeszcze przypisanych zadań/rodzajów robót. Kliknij przycisk „Dodaj robotę” u góry, aby rozpocząć.
                        </p>
                      </div>
                    )}
                  </div>
                )}
          </div>
        </div>
      </div>
    </div>
  )}
      </div>
    </div>
  )
}

