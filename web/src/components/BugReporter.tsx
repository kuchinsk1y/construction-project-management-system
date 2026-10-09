import { useState, useRef } from 'react'
import { Wrench, X, Loader2, Send } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useTranslation } from 'react-i18next'
import type { UserProfile } from '@/types/auth'

export function BugReporter({ profile }: { profile: UserProfile | null }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleCapture = async () => {
    setIsCapturing(true)
    setError('')
    try {
      const dataUrl = await toPng(document.body, {
        filter: (node) => {
          if (node.id === 'bug-reporter-widget' || node.id === 'bug-reporter-modal') {
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

      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/feedback`, {
        method: 'POST',
        body: formData,
        // Let the browser set the Content-Type to multipart/form-data with boundary
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to send feedback')
      }

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
      <button
        id="bug-reporter-widget"
        type="button"
        onClick={handleCapture}
        disabled={isCapturing}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
        title="Zgłoś problem / Pomysł"
      >
        {isCapturing ? <Loader2 size={20} className="animate-spin" /> : <Wrench size={20} />}
      </button>

      {isOpen && (
        <div id="bug-reporter-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
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
