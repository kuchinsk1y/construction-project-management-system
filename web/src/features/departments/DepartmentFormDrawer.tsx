import { useEffect } from 'react' // useState
import { X, Loader2, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { IconPicker } from '@/components/IconPicker'

type DepartmentFormState = {
  name: string
  description: string
  icon: string
  is_active: boolean
}

type DepartmentFormDrawerProps = {
  isOpen: boolean
  onClose: () => void
  formState: DepartmentFormState
  setFormState: React.Dispatch<React.SetStateAction<DepartmentFormState>>
  editingDepartmentId: number | null
  error: string
  setError: React.Dispatch<React.SetStateAction<string>>
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
}

export function DepartmentFormDrawer({
  isOpen,
  onClose,
  formState,
  setFormState,
  editingDepartmentId,
  error,
  setError,
  onSubmit,
  isPending,
}: DepartmentFormDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Network size={18} className="text-[var(--sidebar-primary)]" />
              {editingDepartmentId ? 'Edytuj dział' : 'Nowy dział'}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {editingDepartmentId ? 'Zmień dane wybranego działu' : 'Dodaj nowy dział do systemu'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            <X size={15} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-[var(--background)]/20">
          <form id="department-form" onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Nazwa działu i ikona *</label>
              <div className="flex gap-2">
                <IconPicker 
                  value={formState.icon} 
                  onChange={(icon) => setFormState({ ...formState, icon })} 
                />
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => {
                    setFormState({ ...formState, name: e.target.value })
                    setError('')
                  }}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                  placeholder="Np. Elektryka, Kafar..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Opis (opcjonalnie)</label>
              <textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 min-h-[100px] resize-y"
                placeholder="Krótki opis czym zajmuje się ten dział..."
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Aktywny</label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Czy ten dział może być przypisywany do nowych robót?
                </p>
              </div>
              <Switch
                checked={formState.is_active}
                onCheckedChange={(checked) => setFormState({ ...formState, is_active: checked })}
              />
            </div>
          </form>
        </div>

        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] p-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl">
            Anuluj
          </Button>
          <Button
            type="submit"
            form="department-form"
            disabled={isPending}
            className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 min-w-[120px]"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : editingDepartmentId ? (
              'Zapisz zmiany'
            ) : (
              'Dodaj dział'
            )}
          </Button>
        </div>
      </aside>
    </>
  )
}
