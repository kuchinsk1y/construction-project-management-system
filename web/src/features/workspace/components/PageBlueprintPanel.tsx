import type { PageBlueprint } from '@/features/workspace/config/pageBlueprints'

export function PageBlueprintPanel({ blueprint }: { blueprint: PageBlueprint }) {
  return (
    <section className="p-4 md:p-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold">{blueprint.title}</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{blueprint.subtitle}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Goals</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {blueprint.goals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Main blocks</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {blueprint.primaryBlocks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Data sources</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {blueprint.dataSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
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
