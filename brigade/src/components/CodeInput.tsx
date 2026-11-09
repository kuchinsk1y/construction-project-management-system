import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const LENGTH = 6
const clean = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

type CodeInputProps = {
  value: string
  onChange: (value: string) => void
  /** Called when all 6 characters are entered */
  onComplete?: (value: string) => void
  invalid?: boolean
  disabled?: boolean
}

/** Six boxes for the code from Telegram: letters and digits, upper case, paste fills all boxes */
export function CodeInput({ value, onChange, onComplete, invalid, disabled }: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')

  const update = (next: string) => {
    const v = clean(next).slice(0, LENGTH)
    onChange(v)
    if (v.length === LENGTH) onComplete?.(v)
    return v
  }

  const onInput = (index: number, raw: string) => {
    const typed = clean(raw)
    if (!typed) return
    const next = (value.slice(0, index) + typed + value.slice(index + typed.length)).slice(0, LENGTH)
    const v = update(next)
    refs.current[Math.min(index + typed.length, LENGTH - 1)]?.focus()
    if (v.length === LENGTH) refs.current[LENGTH - 1]?.blur()
  }

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (chars[index]) update(value.slice(0, index) + value.slice(index + 1))
      else if (index > 0) {
        update(value.slice(0, index - 1) + value.slice(index))
        refs.current[index - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus()
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const v = update(e.clipboardData.getData('text'))
    refs.current[Math.min(v.length, LENGTH - 1)]?.focus()
  }

  return (
    <div className={`flex justify-between gap-2 sm:gap-2.5 ${invalid ? 'shake' : ''}`}>
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={ch}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoFocus={i === 0}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          aria-label={`Znak ${i + 1} z ${LENGTH}`}
          className={`h-14 w-full min-w-0 rounded-2xl border bg-[var(--card)] text-center text-2xl font-semibold uppercase tracking-wider outline-none transition focus:ring-4 sm:h-16 ${
            invalid
              ? 'border-[var(--destructive)] text-[var(--destructive)] focus:ring-[color-mix(in_oklch,var(--destructive)_15%,transparent)]'
              : ch
                ? 'border-[color-mix(in_oklch,var(--primary)_55%,var(--border))] focus:border-[var(--primary)] focus:ring-[color-mix(in_oklch,var(--primary)_15%,transparent)]'
                : 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[color-mix(in_oklch,var(--primary)_15%,transparent)]'
          }`}
        />
      ))}
    </div>
  )
}
