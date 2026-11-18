import { useState, type InputHTMLAttributes, type ReactNode } from 'react'

/**
 * Label inside the field that floats onto the border line (outlined style):
 * empty and not focused — it sits inside like a placeholder; focused or filled — it moves up and cuts the border.
 * Its background is half card / half field, so the border is cut cleanly on the card in both themes.
 */
export function FloatLabel({
  label,
  floated,
  focused,
  invalid,
  disabled,
  htmlFor,
  fieldBg = 'var(--background)',
  withIcon = false,
}: {
  label: string
  floated: boolean
  focused?: boolean
  invalid?: boolean
  disabled?: boolean
  htmlFor?: string
  /** Fill of the field under the label (the lower half of its background) */
  fieldBg?: string
  /** The field has an arrow on the right: the resting label leaves room for it */
  withIcon?: boolean
}) {
  const color = invalid ? 'text-[var(--destructive)]' : focused ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
  return (
    <label
      htmlFor={htmlFor}
      className={`pointer-events-none absolute left-2 z-[1] truncate rounded-sm px-1 leading-none transition-all duration-150 ease-out ${
        withIcon && !floated ? 'max-w-[calc(100%-2.5rem)]' : 'max-w-[calc(100%-1rem)]'
      } ${
        floated ? 'top-0 -translate-y-1/2 text-[11px] font-semibold tracking-wide' : 'top-1/2 -translate-y-1/2 text-base sm:text-sm'
      } ${color} ${disabled ? 'opacity-60' : ''}`}
      style={floated ? { background: `linear-gradient(to bottom, var(--card) 50%, ${fieldBg} 50%)` } : undefined}
    >
      {label}
    </label>
  )
}

type FloatInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> & {
  label: string
  invalid?: boolean
  /** Shown inside only while focused and empty */
  hint?: string
  wrapperClassName?: string
}

/** Text field with a floating label */
export function FloatInput({ label, invalid, hint, wrapperClassName = '', className = '', id, onFocus, onBlur, value, disabled, ...rest }: FloatInputProps) {
  const [focused, setFocused] = useState(false)
  const filled = value !== undefined && value !== null && String(value) !== ''
  return (
    <div className={`relative min-w-0 ${wrapperClassName}`}>
      <input
        {...rest}
        id={id}
        value={value}
        disabled={disabled}
        placeholder={focused ? hint : undefined}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        aria-label={label}
        className={`h-11 w-full min-w-0 rounded-lg border bg-[var(--background)] px-3 text-base outline-none transition placeholder:text-[var(--muted-foreground)]/70 focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-2.5 sm:text-sm ${
          invalid ? 'border-[var(--destructive)]' : 'border-[var(--border)]'
        } ${className}`}
      />
      <FloatLabel label={label} floated={focused || filled} focused={focused} invalid={invalid} disabled={disabled} htmlFor={id} />
    </div>
  )
}

/** Read-only box with a floating label (always floated) */
export function FloatBox({
  label,
  invalid,
  title,
  fieldBg,
  children,
}: {
  label: string
  invalid?: boolean
  title?: string
  fieldBg?: string
  children: ReactNode
}) {
  return (
    <div className="relative min-w-0" title={title}>
      {children}
      <FloatLabel label={label} floated invalid={invalid} fieldBg={fieldBg} />
    </div>
  )
}
