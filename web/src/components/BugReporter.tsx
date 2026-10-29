import { useEffect, useRef, useState } from 'react'
import { Wrench, X, Loader2, Send } from 'lucide-react'
import { toPng } from 'html-to-image'
import type { UserProfile } from '@/types/auth'
import { apiPostForm } from '@/lib/api-client'

const REVEAL_MS = 6000
const SHAKE_FLIPS = 4 // direction changes…
const SHAKE_WINDOW_MS = 900 // …within this time
const SHAKE_MIN_SWING_PX = 40 // each swing at least this far

export function BugReporter({ profile }: { profile: UserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  // The button stays tucked behind the right edge until summoned
  const [isRevealed, setIsRevealed] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const isHovered = useRef(false)

  const reveal = () => {
    setIsRevealed(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (!isHovered.current) setIsRevealed(false)
    }, REVEAL_MS)
  }

  // A quick left-right "shake" of the mouse slides the button in
  useEffect(() => {
    let lastX: number | null = null
    let direction = 0
    let travel = 0
    let flips: number[] = []

    const onMove = (event: MouseEvent) => {
      if (lastX === null) {
        lastX = event.clientX
        return
      }
      const dx = event.clientX - lastX
      lastX = event.clientX
      if (dx === 0) return
      const dir = Math.sign(dx)
      if (dir === direction) {
        travel += Math.abs(dx)
        return
      }
      // Count a direction change only after a real swing, not jitter
      if (direction !== 0 && travel >= SHAKE_MIN_SWING_PX) {
        const now = performance.now()
        flips = [...flips.filter((t) => now - t < SHAKE_WINDOW_MS), now]
        if (flips.length >= SHAKE_FLIPS) {
          flips = []
          reveal()
        }
      }
      direction = dir
      travel = Math.abs(dx)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.clearTimeout(hideTimer.current)
    }
  }, [])

  const handleCapture = async () => {
    setIsCapturing(true)
    setError('')
    try {
      const dataUrl = await toPng(document.body, {
        filter: (node) => {
          if (node.id === 'bug-reporter-widget' || node.id === 'bug-reporter-modal' || node.id === 'bug-reporter-handle') {
            return false
          }
          return true
        },
        pixelRatio: 1,
      })
      setScreenshot(dataUrl)
      setIsOpen(true)
    } catch (err) {
      console.error('Failed to capture screen', err)
      setError('Nie udało się zrobić zrzutu ekranu')
      setIsOpen(true)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Proszę opisać problem.')
      return
    }

    setIsSending(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('description', description)
      formData.append('url', window.location.href)
      const userName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Nieznany Użytkownik'
      formData.append('user', userName)

      if (screenshot) {
        // Convert base64 to blob
        const res = await fetch(screenshot)
        const blob = await res.blob()
        formData.append('image', blob, 'screenshot.png')
      }

      // Same client as the rest of the app: correct API address and a fresh access token
      await apiPostForm('/feedback', formData)

      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
        setDescription('')
        setScreenshot(null)
      }, 3000)
    } catch (err) {
      console.error(err)
      setError('Błąd podczas wysyłania zgłoszenia. Spróbuj ponownie później.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {/* Thin edge handle: discoverable on hover / tap (touch screens can't shake a mouse) */}
      <button
        id="bug-reporter-handle"
        type="button"
        onMouseEnter={reveal}
        onClick={reveal}
        aria-label="Pokaż przycisk zgłaszania problemu"
        title="Zgłoś problem — lub potrząśnij myszką"
        // Wide enough to stick out from under overlay scrollbars (Firefox on Windows 11, macOS)
        className={`fixed bottom-24 right-0 z-[9999] h-16 w-4 rounded-l-full bg-[var(--sidebar-primary)] shadow-sm transition-all duration-300 hover:w-5 hover:opacity-100 ${
          isRevealed || isOpen ? 'pointer-events-none translate-x-full opacity-0' : 'opacity-60'
        }`}
      />

      <button
        id="bug-reporter-widget"
        type="button"
        onClick={handleCapture}
        onMouseEnter={() => { isHovered.current = true; reveal() }}
        onMouseLeave={() => { isHovered.current = false; reveal() }}
        onFocus={reveal}
        disabled={isCapturing}
        tabIndex={isRevealed ? 0 : -1}
        aria-hidden={!isRevealed}
        className={`fixed bottom-20 right-4 z-[9999] flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-white shadow-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 disabled:opacity-70 disabled:pointer-events-none ${
          isRevealed && !isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+2rem)] opacity-0'
        }`}
        title="Zgłoś problem / Pomysł"
      >
        {isCapturing ? <Loader2 size={20} className="animate-spin" /> : <Wrench size={20} />}
      </button>

      {isOpen && (
        <div id="bug-reporter-modal" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">Zgłoś problem</h3>
              <button 
                type="button" 
                onClick={() => { setIsOpen(false); setSuccess(false) }}
                className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-primary)]/10 hover:text-[var(--sidebar-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <Send size={24} className="ml-1" />
                </div>
                <h4 className="text-lg font-bold text-[var(--foreground)]">Dziękujemy!</h4>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Zgłoszenie zostało wysłane. Pomoże to nam w ulepszaniu systemu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {screenshot && (
                  <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-zinc-100 dark:bg-zinc-900/50 relative group">
                    <img src={screenshot} alt="Screenshot" className="w-full max-h-[250px] object-cover object-top opacity-90" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-xs font-semibold uppercase tracking-wider">Zrzut ekranu dołączony</span>
                    </div>
                  </div>
                )}

                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)] mb-1 block">Opisz problem (lub pomysł na ulepszenie)</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisz dokładnie z czym masz problem, na jakiej stronie, lub co chciałbyś ulepszyć..."
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 custom-scrollbar resize-none"
                  />
                </label>

                {error && (
                  <p className="text-sm text-rose-500 font-medium">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-[var(--sidebar-primary)]/10 transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSending}
                    className="flex items-center gap-2 rounded-xl bg-[var(--sidebar-primary)] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[var(--sidebar-primary)]/90 transition-colors disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Wyślij
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
