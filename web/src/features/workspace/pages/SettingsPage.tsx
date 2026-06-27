import { Check, Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageBlueprintPanel } from '@/features/workspace/components/PageBlueprintPanel'
import { pageBlueprints } from '@/features/workspace/config/pageBlueprints'
import type { ThemeMode, ThemePreset } from '@/types/auth'

type SettingsPageProps = {
  theme: ThemeMode
  themePreset: ThemePreset
  onThemePresetChange: (preset: ThemePreset) => void
}

type ThemeCard = {
  id: ThemePreset
}

const cards: ThemeCard[] = [
  { id: 'lime' },
  { id: 'mono' },
  { id: 'ocean' },
]

export function SettingsPage({ theme, themePreset, onThemePresetChange }: SettingsPageProps) {
  const { t } = useTranslation()

  return (
    <>
      <section className="p-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                <Palette size={14} />
                {t('settings.theme.eyebrow')}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{t('settings.theme.title')}</h3>
              <p className="mt-1 max-w-2xl text-xs text-[var(--muted-foreground)]">{t('settings.theme.subtitle')}</p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/65 px-3 py-2 text-xs text-[var(--muted-foreground)]">
              {t('settings.theme.currentMode')}: <span className="font-semibold text-[var(--foreground)]">{theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.light')}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 md:grid-cols-3">
            {cards.map((card) => {
              const active = themePreset === card.id

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onThemePresetChange(card.id)}
                  className={[
                    'group relative overflow-hidden rounded-2xl border p-2.5 text-left transition-all duration-200',
                    active
                      ? 'border-[var(--sidebar-primary)] bg-[var(--sidebar-primary)]/10 shadow-[0_10px_30px_color-mix(in_oklch,var(--sidebar-primary),transparent_75%)]'
                      : 'border-[var(--border)] bg-[var(--background)]/50 hover:border-[var(--sidebar-primary)]/45 hover:bg-[var(--sidebar-accent)]/45',
                  ].join(' ')}
                >
                  <div className={`absolute inset-0 opacity-80 theme-preview-glow theme-preview-glow--${card.id}`} />

                  <div className={`relative rounded-xl border border-black/10 p-1.5 theme-preview-surface theme-preview-surface--${card.id}`}>
                    <div className={`mb-2 h-2 w-16 rounded-full theme-preview-primary theme-preview-primary--${card.id}`} />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <div className="space-y-1">
                        <div className={`h-2 rounded-full theme-preview-accent theme-preview-accent--${card.id}`} />
                        <div className={`h-2 w-4/5 rounded-full theme-preview-accent theme-preview-accent--${card.id}`} />
                      </div>
                      <div className={`h-7 w-7 rounded-lg theme-preview-primary theme-preview-primary--${card.id}`} />
                    </div>
                    <div className="mt-2 flex gap-1">
                      <span className={`h-2 w-2 rounded-full theme-preview-primary theme-preview-primary--${card.id}`} />
                      <span className={`h-2 w-2 rounded-full theme-preview-accent theme-preview-accent--${card.id}`} />
                      <span className="h-2 w-2 rounded-full border border-black/15 bg-white" />
                    </div>
                  </div>

                  <div className="relative mt-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{t(`settings.theme.presets.${card.id}.name`)}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{t(`settings.theme.presets.${card.id}.desc`)}</p>
                    </div>

                    {active ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]">
                        <Check size={14} />
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <PageBlueprintPanel blueprint={pageBlueprints.settings!} />
    </>
  )
}
