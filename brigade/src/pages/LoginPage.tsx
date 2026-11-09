import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarClock, ClipboardList, Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { CodeInput } from '@/components/CodeInput'
import { COUNTRIES, PhoneField } from '@/components/PhoneField'
import { Button, ErrorNote, Logo, ThemeToggle } from '@/components/ui'
import { ApiError, authApi } from '@/lib/api'
import type { Country } from '@/lib/countries'

const RESEND_SECONDS = 45

function fullNumber(country: Country, national: string) {
  return `+${country.dial}${national.replace(/\D/g, '')}`
}

/** "+48 123 456 789" for display */
function pretty(country: Country, national: string) {
  const digits = national.replace(/\D/g, '')
  return `+${country.dial} ${digits.replace(/(\d{3})(?=\d)/g, '$1 ')}`
}

export function LoginPage() {
  const { signIn } = useAuth()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [country, setCountry] = useState<Country>(COUNTRIES[0])
  const [national, setNational] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const digits = national.replace(/\D/g, '')
  const phoneOk = digits.length >= 4 && country.dial.length + digits.length <= 15

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!phoneOk) return setError('Wpisz poprawny numer telefonu.')
    setError('')
    setLoading(true)
    try {
      await authApi.sendCode(fullNumber(country, national))
      setStep('code')
      setCode('')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError((err as Error).message)
      // The server tells how long to wait
      const wait = err instanceof ApiError && err.status === 429 ? Number(/(\d+) s/.exec(err.message)?.[1]) : 0
      if (wait) setCooldown(wait)
    } finally {
      setLoading(false)
    }
  }

  const verify = async (value = code) => {
    if (value.length !== 6) return setError('Wpisz cały kod (6 znaków).')
    setError('')
    setLoading(true)
    try {
      signIn(await authApi.verifyCode(fullNumber(country, national), value))
    } catch (err) {
      setError((err as Error).message)
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side (desktop) */}
      <aside className="brand-panel relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="brand-grid pointer-events-none absolute inset-0" />
        <div className="glow-orb pointer-events-none absolute -left-24 top-24 size-80 rounded-full bg-white/20" />
        <div className="glow-orb pointer-events-none absolute -bottom-28 right-0 size-96 rounded-full bg-cyan-300/20 [animation-delay:-4s]" />

        <div className="relative">
          <Logo light size="lg" />
        </div>

        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight">
            Raport dnia
            <br />
            w kilka minut.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Godziny, rodzaje robót i postęp na budowie — wpisane prosto z placu, od razu widoczne w ERP.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: ClipboardList, title: 'Karta pracownika', text: 'Obiekt, rodzaj roboty i godziny dla każdej osoby z brygady.' },
              { icon: CalendarClock, title: 'Na bieżąco', text: 'Dane trafiają do ERP i do rozliczeń bez przepisywania.' },
              { icon: ShieldCheck, title: 'Bezpieczne logowanie', text: 'Jednorazowy kod przez Telegram, sesja do końca dnia.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20 backdrop-blur">
                  <Icon className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 text-xs text-white/50">© {new Date().getFullYear()} ISPIK · ERP</p>
      </aside>

      {/* Form side */}
      <main className="relative flex min-h-screen min-w-0 flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:invisible">
            <Logo />
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          {step === 'phone' ? (
            <form key="phone" onSubmit={requestCode} className="rise-in space-y-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Logowanie</p>
                <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Witaj, brygadzisto</h2>
                <p className="mt-2 text-[15px] text-[var(--muted-foreground)]">
                  Podaj numer telefonu. Wyślemy jednorazowy kod na Twój Telegram.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Numer telefonu</label>
                <PhoneField
                  country={country}
                  onCountryChange={(c) => {
                    setCountry(c)
                    setError('')
                  }}
                  number={national}
                  onNumberChange={(v) => {
                    setNational(v)
                    setError('')
                  }}
                  invalid={!!error}
                  autoFocus
                />
              </div>

              {error ? <ErrorNote>{error}</ErrorNote> : null}

              <Button type="submit" loading={loading} disabled={!phoneOk || cooldown > 0} className="w-full">
                {cooldown > 0 ? `Wyślij ponownie za ${cooldown} s` : 'Wyślij kod'}
                {!loading && cooldown <= 0 ? <ArrowRight className="size-4" /> : null}
              </Button>

              <p className="text-center text-xs text-[var(--muted-foreground)]">
                Nie masz dostępu? Skontaktuj się z kierownikiem projektu.
              </p>
            </form>
          ) : (
            <div key="code" className="rise-in space-y-7">
              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setError('')
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                <ArrowLeft className="size-4" />
                Zmień numer
              </button>

              <div>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--primary)_14%,transparent)] text-[var(--primary)]">
                  <Send className="size-5" />
                </span>
                <h2 className="mt-5 text-[28px] font-semibold leading-tight tracking-tight">Sprawdź Telegram</h2>
                <p className="mt-2 text-[15px] text-[var(--muted-foreground)]">
                  Wysłaliśmy 6-znakowy kod dla numeru{' '}
                  <span className="whitespace-nowrap font-semibold text-[var(--foreground)]">{pretty(country, national)}</span>.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void verify()
                }}
                className="space-y-6"
              >
                <CodeInput
                  value={code}
                  onChange={(v) => {
                    setCode(v)
                    if (error) setError('')
                  }}
                  onComplete={(v) => void verify(v)}
                  invalid={!!error}
                  disabled={loading}
                />

                {error ? <ErrorNote>{error}</ErrorNote> : null}

                <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
                  Zaloguj się
                </Button>
              </form>

              <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                <span className="text-[var(--muted-foreground)]">Kod nie dotarł?</span>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => void requestCode()}
                  className="font-semibold text-[var(--primary)] transition hover:underline disabled:pointer-events-none disabled:text-[var(--muted-foreground)]"
                >
                  {cooldown > 0 ? `Wyślij ponownie (${cooldown} s)` : 'Wyślij ponownie'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)]">Sesja jest ważna do 23:59 dnia logowania.</p>
      </main>
    </div>
  )
}
