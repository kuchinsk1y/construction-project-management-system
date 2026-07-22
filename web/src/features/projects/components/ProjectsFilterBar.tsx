import { Search, ListFilter, UserRound, X, LayoutList, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import type { ProjectStatus } from '@/features/projects/types'

export type ViewMode = 'table' | 'gantt'

type ProjectsFilterBarProps = {
  searchQuery: string
  setSearchQuery: (val: string) => void
  statusFilter: 'all' | ProjectStatus
  setStatusFilter: (val: 'all' | ProjectStatus) => void
  managerFilter: string
  setManagerFilter: (val: string) => void
  dateFilter: string
  setDateFilter: (val: string) => void
  managerOptions: string[]
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  onReset: () => void
}

export function ProjectsFilterBar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  managerFilter,
  setManagerFilter,
  dateFilter,
  setDateFilter,
  managerOptions,
  viewMode,
  setViewMode,
  onReset,
}: ProjectsFilterBarProps) {
  const { t } = useTranslation()

  const isFiltered = Boolean(searchQuery || statusFilter !== 'all' || managerFilter !== 'all' || dateFilter)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
        {/* Search */}
        <label className="relative min-w-[160px] flex-1">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('projects.filters.searchPlaceholder')}
            aria-label={t('projects.filters.searchAria')}
            className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
          />
        </label>

        {/* Status */}
        <label className="relative shrink-0">
          <ListFilter size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
            aria-label={t('projects.filters.statusAria')}
            className="h-8 w-[148px] appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-6 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer"
          >
            <option value="all">{t('projects.filters.allStatuses')}</option>
            <option value="active">{t('projects.status.active')}</option>
            <option value="planning">{t('projects.status.planning')}</option>
            <option value="blocked">{t('projects.status.blocked')}</option>
            <option value="done">{t('projects.status.done')}</option>
          </select>
        </label>

        {/* Manager */}
        <label className="relative shrink-0">
          <UserRound size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <select
            value={managerFilter}
            onChange={(event) => setManagerFilter(event.target.value)}
            aria-label={t('projects.filters.managerAria')}
            className="h-8 w-[148px] appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-6 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer"
          >
            {managerOptions.map((manager) => (
              <option key={manager} value={manager}>
                {manager === 'all' ? t('projects.filters.allManagers') : manager}
              </option>
            ))}
          </select>
        </label>

        {/* Single Date filter */}
        <div className="flex shrink-0 items-center gap-1.5">
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            title={t('projects.filters.dateTitle')}
            ariaLabel={t('projects.filters.dateAria')}
            placeholder={t('projects.filters.datePlaceholder')}
            size="sm"
            className="w-[200px]"
          />
        </div>

        {/* View Mode Switcher Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            title="Tabela projektów"
          >
            <LayoutList size={13} />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gantt')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'gantt'
                ? 'bg-[var(--card)] text-[var(--sidebar-primary)] shadow-2xs border border-[var(--border)]/60'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            title="Wykres Gantta"
          >
            <BarChart3 size={13} />
            <span className="hidden sm:inline">Wykres Gantta</span>
          </button>
        </div>

        {/* Reset */}
        <Button
          type="button"
          disabled={!isFiltered}
          onClick={onReset}
          variant="outline"
          className="ml-auto shrink-0 gap-1.5 rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 hover:text-[var(--sidebar-primary)] disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--muted-foreground)]/50 disabled:opacity-50 transition-all duration-200"
        >
          <X size={13} />
          {t('projects.filters.reset')}
        </Button>
      </div>
    </div>
  )
}
