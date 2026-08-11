import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiDepartment, ApiForemanUser, ApiForemanAssignment } from '@/features/projects/types'

type DepartmentForemenDrawerProps = {
  isOpen: boolean
  onClose: () => void
  departments: ApiDepartment[]
  users: ApiForemanUser[]
  initialAssignments: ApiForemanAssignment[]
  onSubmit: (assignments: { departmentId: number; foremanIds: number[] }[]) => void
  isPending: boolean
}

export function DepartmentForemenDrawer({
  isOpen,
  onClose,
  departments,
  users,
  initialAssignments,
  onSubmit,
  isPending,
}: DepartmentForemenDrawerProps) {
  // state maps departmentId -> single foremanId (or empty string if none)
  const [assignmentsState, setAssignmentsState] = useState<Record<number, number | ''>>({})

  useEffect(() => {
    if (isOpen) {
      const newState: Record<number, number | ''> = {}
      // Initialize all departments with empty string
      departments.forEach(d => {
        newState[d.id] = ''
      })
      
      // Override with existing assignments
      initialAssignments.forEach(a => {
        // If there are multiple assignments somehow, we just take the first one since it's a single select now
        if (newState[a.departmentId] === '') {
          newState[a.departmentId] = a.foremanId
        }
      })
      setAssignmentsState(newState)
    }
  }, [isOpen, initialAssignments, departments])

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert Record to Array payload
    const payload = Object.entries(assignmentsState).map(([depIdStr, fId]) => ({
      departmentId: Number(depIdStr),
      foremanIds: fId ? [Number(fId)] : [],
    }))
    onSubmit(payload)
  }

  return createPortal(
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out" 
          onClick={handleClose} 
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl transition-transform duration-300 ease-out w-full max-w-[450px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <Users size={18} className="text-[var(--sidebar-primary)]" />
              Zarządzaj przypisaniami
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Przypisz brygadzistów do działów w projekcie.</p>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="icon-sm" 
            onClick={handleClose} 
            className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
          >
            <X size={15} />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-[var(--background)]/20">
          <form id="foremenForm" onSubmit={handleSubmit} className="space-y-4">
            {departments.map(dep => {
              const selectedId = assignmentsState[dep.id] ?? ''
              return (
                <div key={dep.id} className="space-y-1.5">
                  <label className="block">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider ml-1">
                      {dep.name}
                    </span>
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => setAssignmentsState(s => ({ ...s, [dep.id]: e.target.value ? Number(e.target.value) : '' }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer"
                  >
                    <option value="">-- Wybierz brygadzistę --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </form>
        </div>

        <footer className="border-t border-[var(--border)] p-4 bg-[var(--card)] flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl px-5">
            Anuluj
          </Button>
          <Button 
            form="foremenForm"
            type="submit" 
            disabled={isPending}
            className="rounded-xl px-5 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
          >
            {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Zapisz zmiany
          </Button>
        </footer>
      </aside>
    </>,
    document.body
  )
}
