
import { createPortal } from 'react-dom'
import { X, Loader2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import type { ApiDepartment, CreateWorkTypePayload } from '@/features/projects/types'

type WorkTypeFormDrawerProps = {
  isOpen: boolean
  onClose: () => void
  departments: ApiDepartment[]
  workTypeForm: CreateWorkTypePayload
  setWorkTypeForm: React.Dispatch<React.SetStateAction<CreateWorkTypePayload>>
  editingWorkTypeId: string | null
  workTypeError: string
  setWorkTypeError: (err: string) => void
  handleWorkTypeSubmit: (e: React.FormEvent) => void
  isPending: boolean
}

export function WorkTypeFormDrawer({
  isOpen,
  onClose,
  departments,
  workTypeForm,
  setWorkTypeForm,
  editingWorkTypeId,
  workTypeError,
  setWorkTypeError,
  handleWorkTypeSubmit,
  isPending,
}: WorkTypeFormDrawerProps) {
  const handleClose = () => {
    setWorkTypeError('')
    onClose()
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
          'fixed inset-y-0 right-0 z-[70] flex flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl transition-transform duration-300 ease-out w-full max-w-[500px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--card)]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <Layers size={18} className="text-[var(--sidebar-primary)]" />
              {editingWorkTypeId ? 'Edytuj rodzaj roboty' : 'Dodaj rodzaj roboty'}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Uzupełnij szczegóły dotyczące prac dla działu.</p>
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
          {workTypeError && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
              {workTypeError}
            </div>
          )}

          <form id="workTypeForm" onSubmit={handleWorkTypeSubmit} className="space-y-4">

            
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">
                Dział <span className="text-rose-500">*</span>
              </span>
              <select
                value={workTypeForm.departmentId || ''}
                onChange={(e) => setWorkTypeForm((f) => ({ ...f, departmentId: Number(e.target.value) }))}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer"
              >
                <option value="">-- Wybierz dział --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">
                Rodzaj roboty (Nazwa) <span className="text-rose-500">*</span>
              </span>
              <input
                value={workTypeForm.name}
                onChange={(e) => setWorkTypeForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="np. Wbijanie pali"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Jednostka</span>
                <select
                  value={workTypeForm.unit || ''}
                  onChange={(e) => setWorkTypeForm((f) => ({ ...f, unit: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] cursor-pointer"
                >
                  <option value="">-- Brak --</option>
                  <option value="szt.">szt.</option>
                  <option value="m">m</option>
                  <option value="m²">m²</option>
                  <option value="%">%</option>
                  <option value="kg">kg</option>
                  <option value="kpl">kpl</option>
                </select>
              </label>
              
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Ilość</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={workTypeForm.totalQuantity || ''}
                  onChange={(e) => setWorkTypeForm((f) => ({ ...f, totalQuantity: e.target.value ? Number(e.target.value) : 0 }))}
                  placeholder="0.00"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Data rozpoczęcia</span>
                <DatePicker
                  value={workTypeForm.plannedStart || ''}
                  onChange={(v) => setWorkTypeForm((f) => ({ ...f, plannedStart: v }))}
                  placeholder="Wybierz..."
                />
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Data zakończenia</span>
                <DatePicker
                  value={workTypeForm.plannedEnd || ''}
                  onChange={(v) => setWorkTypeForm((f) => ({ ...f, plannedEnd: v }))}
                  min={workTypeForm.plannedStart || undefined}
                  placeholder="Wybierz..."
                />
              </div>
            </div>
          </form>
        </div>

        <footer className="border-t border-[var(--border)] p-4 bg-[var(--card)] flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
            Anuluj
          </Button>
          <Button 
            form="workTypeForm"
            type="submit" 
            disabled={isPending}
            className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
          >
            {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            {editingWorkTypeId ? 'Zapisz zmiany' : 'Dodaj robotę'}
          </Button>
        </footer>
      </aside>
    </>,
    document.body
  )
}
