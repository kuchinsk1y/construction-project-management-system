import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  description?: ReactNode
  icon: typeof X
  confirmLabel: string
  cancelLabel?: string
  /** "danger" colours the icon and the confirm button red */
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation window in the app style (instead of the browser's confirm) */
export function ConfirmDialog({ open, title, description, icon: Icon, confirmLabel, cancelLabel = 'Anuluj', tone = 'primary', onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null

  const color = tone === 'danger' ? 'var(--destructive)' : 'var(--primary)'
  // The button keeps a deep shade in both themes, so white text stays readable
  const buttonColor = tone === 'danger' ? 'oklch(0.577 0.245 27.325)' : 'var(--primary-strong)'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <div className="dialog-backdrop absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="dialog-panel relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        {/* Soft colour wash behind the icon */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: `radial-gradient(120% 100% at 50% 0%, color-mix(in oklch, ${color} 14%, transparent) 0%, transparent 70%)` }}
        />
        <button
          type="button"
          onClick={onCancel}
          aria-label="Zamknij"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="size-4" />
        </button>

        <div className="relative px-6 pb-5 pt-7 text-center">
          <span
            className="mx-auto flex size-12 items-center justify-center rounded-2xl ring-1"
            style={{
              color,
              background: `color-mix(in oklch, ${color} 12%, transparent)`,
              boxShadow: `0 10px 24px -12px color-mix(in oklch, ${color} 60%, transparent)`,
              // ring colour via CSS variable so it follows the tone
              ['--tw-ring-color' as string]: `color-mix(in oklch, ${color} 25%, transparent)`,
            }}
          >
            <Icon className="size-5" />
          </span>
          <h2 id="confirm-title" className="mt-4 text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <div className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{description}</div> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--background)] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium transition hover:bg-[var(--muted)]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-4"
            style={{ background: buttonColor, ['--tw-ring-color' as string]: `color-mix(in oklch, ${color} 25%, transparent)` }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
