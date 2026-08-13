import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Loader2, Users, Folder, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiDepartment, ApiForemanUser, ApiWorkType } from '@/features/projects/types'

export type DepartmentFormRow = {
  uid: string
  departmentId: number | ''
  foremanId: number | ''
  works: { id?: string; name: string; uid: string }[]
}

type ManageDepartmentsDrawerProps = {
  isOpen: boolean
  onClose: () => void
  availableDepartments: ApiDepartment[]
  users: ApiForemanUser[]
  currentAssignments: { departmentId: number; foremanId: number | null }[]
  currentWorks: ApiWorkType[]
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
  currentWorks,
  onSubmit,
  isPending,
}: ManageDepartmentsDrawerProps) {
  const [rows, setRows] = useState<DepartmentFormRow[]>([])
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      // Initialize rows based on current assignments
      const activeDepartments = Array.from(new Set([...currentAssignments.map(a => a.departmentId), ...currentWorks.map(w => Number(w.departmentId))]))

      const initialRows: DepartmentFormRow[] = activeDepartments.map(depId => {
        const foreman = currentAssignments.find(a => a.departmentId === depId)
        const worksForDep = currentWorks.filter(w => Number(w.departmentId) === depId)

        return {
          uid: generateUid(),
          departmentId: depId,
          foremanId: foreman?.foremanId || '',
          works: worksForDep.map(w => ({ id: w.id, name: w.name, uid: generateUid() }))
        }
      })

      if (initialRows.length === 0) {
        initialRows.push({
          uid: generateUid(),
          departmentId: '',
          foremanId: '',
          works: []
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
        foremanId: '',
        works: []
      }
    ])
  }

  const handleRemoveRow = (uid: string) => {
    setRows(prev => prev.filter(r => r.uid !== uid))
  }

  const handleUpdateRow = <K extends keyof DepartmentFormRow>(uid: string, field: K, value: DepartmentFormRow[K]) => {
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, [field]: value } : r))
  }

  const handleAddWork = (rowUid: string) => {
    setRows(prev => prev.map(r => {
      if (r.uid === rowUid) {
        return {
          ...r,
          works: [...r.works, { name: '', uid: generateUid() }]
        }
      }
      return r
    }))
  }

  const handleUpdateWork = (rowUid: string, workUid: string, name: string) => {
    setRows(prev => prev.map(r => {
      if (r.uid === rowUid) {
        return {
          ...r,
          works: r.works.map(w => w.uid === workUid ? { ...w, name } : w)
        }
      }
      return r
    }))
  }

  const handleRemoveWork = (rowUid: string, workUid: string) => {
    setRows(prev => prev.map(r => {
      if (r.uid === rowUid) {
        return {
          ...r,
          works: r.works.filter(w => w.uid !== workUid)
        }
      }
      return r
    }))
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
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl transition-transform duration-300 ease-out w-full max-w-[800px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-5 bg-[var(--card)]">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
              <Folder size={20} className="text-[var(--sidebar-primary)]" />
              Zarządzaj przypisaniami
            </h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Dodawaj działy do projektu, przypisuj brygadzistów i określaj roboty zbiorczo.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
          >
            <X size={18} />
          </Button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 bg-[var(--background)]/40">

            {rows.map((row, index) => (
              <div key={row.uid} className="p-3 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm relative group">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.uid)}
                    className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-[var(--background)] text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md border border-[var(--border)]"
                    title="Usuń ten dział z konfiguracji"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3 pb-3 border-b border-[var(--border)]/50">
                  <div className="w-7 h-7 rounded-lg bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1">Dział <span className="text-rose-500">*</span></label>
                    <select
                      value={row.departmentId}
                      onChange={(e) => handleUpdateRow(row.uid, 'departmentId', e.target.value === '' ? '' : Number(e.target.value))}
                      className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer font-medium"
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

                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1">Brygadzista</label>
                    <div className="relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Users size={12} />
                      </div>
                      <select
                        value={row.foremanId}
                        onChange={(e) => handleUpdateRow(row.uid, 'foremanId', e.target.value === '' ? '' : Number(e.target.value))}
                        className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-2.5 text-xs outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer font-medium"
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
                                <div className="pl-2 sm:pl-12 pt-2">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Briefcase size={13} className="text-[var(--sidebar-primary)]" />
                    <span className="text-[11px] font-bold text-[var(--foreground)]">Lista robót (prace)</span>
                  </div>
                  
                  {row.works.length === 0 ? (
                    <div className="text-center py-4 px-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)]/30">
                      <p className="text-[10px] text-[var(--muted-foreground)] font-medium">Brak zdefiniowanych robót.</p>
                      <Button
                        type="button"
                        onClick={() => handleAddWork(row.uid)}
                        variant="ghost"
                        size="sm"
                        className="h-6 mt-1.5 text-[10px] font-bold text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 px-2"
                      >
                        <Plus size={12} className="mr-1" />
                        Zacznij dodawać
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {row.works.map(work => (
                        <div key={work.uid} className="group/work flex items-center bg-[var(--background)] border border-[var(--border)] rounded-full shadow-sm hover:border-[var(--sidebar-primary)]/40 transition-colors focus-within:border-[var(--sidebar-primary)] focus-within:ring-2 focus-within:ring-[var(--sidebar-primary)]/10 overflow-hidden pr-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--sidebar-primary)] ml-3 opacity-70" />
                          <input 
                            type="text"
                            value={work.name}
                            onChange={(e) => handleUpdateWork(row.uid, work.uid, e.target.value)}
                            placeholder="Nazwa..."
                            className="bg-transparent border-none outline-none text-[11px] px-2 py-1.5 font-semibold placeholder:text-[var(--muted-foreground)]/60 placeholder:font-normal w-[90px] focus:w-[140px] transition-all"
                            autoFocus={!work.name && !work.id}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveWork(row.uid, work.uid)}
                            className="w-5 h-5 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors opacity-0 group-hover/work:opacity-100 focus:opacity-100 shrink-0"
                            title="Usuń robotę"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => handleAddWork(row.uid)}
                        className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-[var(--sidebar-primary)]/40 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 hover:border-[var(--sidebar-primary)] transition-colors"
                        title="Dodaj kolejną robotę"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
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

          <footer className="shrink-0 border-t border-[var(--border)] p-5 bg-[var(--card)] flex items-center justify-between">
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm leading-relaxed">
              Upewnij się, że poprawnie zapisałeś zmiany. Usunięcie działu spowoduje również usunięcie przypisanych robót.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl px-5">
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 font-bold shadow-md">
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Zapisywanie...
                  </>
                ) : (
                  'Zapisz wszystkie zmiany'
                )}
              </Button>
            </div>
          </footer>
        </form>
      </aside>
    </>,
    document.body
  )
}
