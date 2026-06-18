import type { PageBlueprint } from '@/features/workspace/config/pageBlueprints'
import { useTranslation } from 'react-i18next'

export function PageBlueprintPanel({ blueprint }: { blueprint: PageBlueprint }) {
  const { t } = useTranslation()

  return (
    <section className="p-3 md:p-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <h3 className="text-base font-semibold">{blueprint.title}</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{blueprint.subtitle}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-[var(--border)] bg-[var(--background)]/55 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('workspace.blueprints.goals')}</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {blueprint.goals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--background)]/55 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('workspace.blueprints.blocks')}</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {blueprint.primaryBlocks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--background)]/55 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('workspace.blueprints.sources')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {blueprint.dataSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]"
                >
                  {source}
                </span>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
