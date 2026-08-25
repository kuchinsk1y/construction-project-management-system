import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Loader2, Users, Folder } from 'lucide-react' // Briefcase
import { Button } from '@/components/ui/button'
import type { ApiDepartment, ApiForemanUser } from '@/features/projects/types' // ApiWorkType

export type DepartmentFormRow = {
  uid: string
  departmentId: number | ''
  foremanId: number | ''
}

type ManageDepartmentsDrawerProps = {
  isOpen: boolean
  onClose: () => void
  availableDepartments: ApiDepartment[]
  users: ApiForemanUser[]
  currentAssignments: { departmentId: number; foremanId: number | null }[]
  onSubmit: (rows: DepartmentFormRow[]) => void
  isPending: boolean
}

function generateUid() {
  return Math.random().toString(36).substring(2, 9)
}

export function ManageDepartmentsDrawer({
  isOpen,
  onClose,
  availableDepartments,
  users,
  currentAssignments,
  onSubmit,
  isPending,
}: ManageDepartmentsDrawerProps) {
  const [rows, setRows] = useState<DepartmentFormRow[]>([])
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      // Initialize rows based on current assignments
      const activeDepartments = Array.from(new Set(currentAssignments.map(a => a.departmentId)))

      const initialRows: DepartmentFormRow[] = activeDepartments.map(depId => {
        const foreman = currentAssignments.find(a => a.departmentId === depId)

        return {
          uid: generateUid(),
          departmentId: depId,
          foremanId: foreman?.foremanId || ''
        }
      })

      if (initialRows.length === 0) {
        initialRows.push({
          uid: generateUid(),
          departmentId: '',
          foremanId: ''
        })
      }

      setRows(initialRows)
    }
  }

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        uid: generateUid(),
        departmentId: '',
        foremanId: ''
      }
    ])
  }

  const handleRemoveRow = (uid: string) => {
    setRows(prev => prev.filter(r => r.uid !== uid))
  }

  const handleUpdateRow = <K extends keyof DepartmentFormRow>(uid: string, field: K, value: DepartmentFormRow[K]) => {
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, [field]: value } : r))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate
    const validRows = rows.filter(r => r.departmentId !== '')
    onSubmit(validRows)
  }

  return createPortal(
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
          onClick={() => !isPending && onClose()}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl transition-transform duration-300 ease-out w-full max-w-[600px] select-none',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <Folder size={16} className="text-[var(--sidebar-primary)]" />
              Zarządzaj przypisaniami
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Dodawaj działy do projektu i przypisuj st. brygadzistów.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
          >
            <X size={15} />
          </Button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 bg-[var(--card)]">

            {rows.map((row) => (
              <div key={row.uid} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/35 shadow-sm flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1">Dział <span className="text-rose-500">*</span></label>
                      <select
                        value={row.departmentId}
                        onChange={(e) => handleUpdateRow(row.uid, 'departmentId', e.target.value === '' ? '' : Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer font-medium"
                        required
                      >
                        <option value="">-- Wybierz dział --</option>
                        {availableDepartments.map(d => {
                          const isUsed = rows.some(r => r.uid !== row.uid && r.departmentId === d.id)
                          return (
                            <option key={d.id} value={d.id} disabled={isUsed}>{d.name}</option>
                          )
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1">St. Brygadzista</label>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                          <Users size={14} />
                        </div>
                        <select
                          value={row.foremanId}
                          onChange={(e) => handleUpdateRow(row.uid, 'foremanId', e.target.value === '' ? '' : Number(e.target.value))}
                          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer font-medium"
                        >
                          <option value="">-- Brak --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  {rows.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveRow(row.uid)}
                      className="h-9 w-9 border-rose-500/50 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
                      title="Usuń ten dział"
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : (
                    <div className="h-9 w-9 shrink-0 hidden sm:block" />
                  )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddRow}
              className="w-full h-12 border-dashed border-[var(--sidebar-primary)]/40 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/5 hover:border-[var(--sidebar-primary)] font-semibold rounded-xl mt-4"
            >
              <Plus size={16} className="mr-2" />
              Dodaj kolejny dział do projektu
            </Button>
          </div>

          <footer className="shrink-0 border-t border-[var(--border)] px-5 py-5 bg-[var(--card)] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl">
              Anuluj
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </footer>
        </form>
      </aside>
    </>,
    document.body
  )
}
