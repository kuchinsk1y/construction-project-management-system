import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { HardHat, Loader2, Moon, Sun } from 'lucide-react'

export function Logo({ light = false, size = 'md' }: { light?: boolean; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-11 rounded-2xl' : 'size-9 rounded-xl'
  return (
    <div className="flex items-center gap-3">
      <span
        className={`${box} flex items-center justify-center shadow-lg ${
          light
            ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur'
            : 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_color-mix(in_oklch,var(--primary),transparent_70%)]'
        }`}
      >
        <HardHat className={size === 'lg' ? 'size-6' : 'size-5'} strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${light ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
          ISPIK · ERP
        </span>
        <span className={`block font-semibold tracking-tight ${size === 'lg' ? 'text-lg' : 'text-[15px]'} ${light ? 'text-white' : ''}`}>
          Dziennik brygadzisty
        </span>
      </span>
    </div>
  )
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('brigade_theme', dark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])
  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] transition hover:bg-[var(--muted)] active:translate-y-px"
      title={dark ? 'Jasny motyw' : 'Ciemny motyw'}
      aria-label={dark ? 'Jasny motyw' : 'Ciemny motyw'}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'outline'; children: ReactNode }

export function Button({ loading, variant = 'primary', className = '', children, disabled, ...rest }: ButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_28px_-10px_color-mix(in_oklch,var(--primary),transparent_20%)] hover:bg-[color-mix(in_oklch,var(--primary)_88%,black)]'
      : 'border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]'
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-55 ${look} ${className}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rise-in rounded-xl border border-[color-mix(in_oklch,var(--destructive)_30%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_9%,transparent)] px-3.5 py-2.5 text-sm text-[var(--destructive)]">
      {children}
    </div>
  )
}
