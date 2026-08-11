import { useState, useMemo } from 'react'
import { Plus, Search, Edit2, Network, Loader2, Trash2, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/features/departments/api'
import { DepartmentFormDrawer } from '@/features/departments/DepartmentFormDrawer'
import type { ApiDepartment } from '@/features/departments/types'

type DepartmentsPageProps = {
  canManage: boolean
}

export function DepartmentsPage({ canManage }: DepartmentsPageProps) {
  const { data: departments, isLoading } = useDepartments()
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const [search, setSearch] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [departmentToDelete, setDepartmentToDelete] = useState<ApiDepartment | null>(null)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState({ name: '', description: '', is_active: true })

  const filteredDepartments = useMemo(() => {
    if (!departments) return []
    if (!search.trim()) return departments
    const lowerSearch = search.toLowerCase()
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerSearch) ||
        (d.description && d.description.toLowerCase().includes(lowerSearch)),
    )
  }, [departments, search])

  const handleOpenAdd = () => {
    if (!canManage) return
    setEditingId(null)
    setFormState({ name: '', description: '', is_active: true })
    setFormError('')
    setShowDrawer(true)
  }

  const handleOpenEdit = (dept: ApiDepartment) => {
    if (!canManage) return
    setEditingId(dept.id)
    setFormState({ name: dept.name, description: dept.description || '', is_active: dept.is_active })
    setFormError('')
    setShowDrawer(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formState.name.trim()) {
      setFormError('Nazwa działu jest wymagana.')
      return
    }

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: formState },
        {
          onSuccess: () => setShowDrawer(false),
          onError: (err: Error) => setFormError(err?.message || 'Wystąpił błąd podczas aktualizacji'),
        },
      )
    } else {
      createMutation.mutate(formState, {
        onSuccess: () => setShowDrawer(false),
        onError: (err: Error) => setFormError(err?.message || 'Wystąpił błąd podczas dodawania'),
      })
    }
  }

  const handleToggleActive = (dept: ApiDepartment, checked: boolean) => {
    if (!canManage) return
    updateMutation.mutate({
      id: dept.id,
      data: { is_active: checked },
    })
  }

  const handleDeleteClick = (dept: ApiDepartment) => {
    if (!canManage) return
    setDepartmentToDelete(dept)
  }

  const confirmDelete = () => {
    if (!departmentToDelete) return

    deleteMutation.mutate(departmentToDelete.id, {
      onSuccess: () => {
        setDepartmentToDelete(null)
      },
      onError: (err: Error) => {
        alert(err?.message || 'Wystąpił błąd podczas usuwania działu.')
        setDepartmentToDelete(null)
      },
    })
  }

  return (
    <div className="flex flex-col h-full bg-[var(--background)] relative">
      <div className="p-3">
        <div className="space-y-3 animate-fade-in pb-2">
          {/* Title block */}
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent flex items-center gap-2">
                {/* <Network className="text-[var(--sidebar-primary)]" size={20} /> */}
                Działy
              </h2>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 sm:p-3 shadow-2xs md:flex-row md:items-center md:flex-wrap">
            <label className="relative w-full md:w-auto md:min-w-[300px] md:flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj działu..."
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
              />
            </label>

            {canManage && (
              <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
                <Button
                  onClick={handleOpenAdd}
                  className="h-9 w-full md:w-auto rounded-xl bg-[var(--sidebar-primary)] px-4 text-xs font-bold text-[var(--sidebar-primary-foreground)] shadow-sm hover:bg-[var(--sidebar-primary)]/90 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Dodaj dział</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={32} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--muted-foreground)] gap-3">
            <Network size={40} className="opacity-20" />
            <p>{search ? 'Nie znaleziono działów pasujących do wyszukiwania.' : 'Brak działów w systemie.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="group relative flex flex-col p-3.5 bg-[var(--card)] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] rounded-xl group-hover:scale-105 transition-transform">
                    <Network size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          className="p-1.5 text-zinc-400 hover:text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Edytuj dział"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(dept)}
                          disabled={deleteMutation.isPending && departmentToDelete?.id === dept.id}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Usuń dział"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-3 flex-1">
                  <h3 className="font-semibold text-sm text-[var(--foreground)] truncate" title={dept.name}>
                    {dept.name}
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-0.5 min-h-[32px]" title={dept.description || ''}>
                    {dept.description || 'Brak opisu'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/50 mt-auto">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${dept.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                    {dept.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                  {canManage && (
                    <Switch
                      checked={dept.is_active}
                      onCheckedChange={(checked) => handleToggleActive(dept, checked)}
                      disabled={updateMutation.isPending && updateMutation.variables?.id === dept.id}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DepartmentFormDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        formState={formState}
        setFormState={setFormState}
        editingDepartmentId={editingId}
        error={formError}
        setError={setFormError}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      {departmentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setDepartmentToDelete(null)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded-md hover:bg-[var(--muted)]/50"
              disabled={deleteMutation.isPending}
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Potwierdź usunięcie</h3>
              <p className="text-[var(--muted-foreground)] text-sm">
                Czy na pewno chcesz usunąć dział <span className="font-bold text-[var(--foreground)]">"{departmentToDelete.name}"</span>?
                <br /> Ta akcja usunie również wszystkie powiązane dane i jest nieodwracalna.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setDepartmentToDelete(null)}
                className="flex-1 rounded-xl font-semibold bg-transparent"
                disabled={deleteMutation.isPending}
              >
                Anuluj
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-semibold shadow-lg shadow-rose-500/20"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Usuwanie...
                  </>
                ) : (
                  'Tak, usuń'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
