import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, CircleDot, UserRound, X, Calendar, Filter, FilterX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import type { ProjectStatus } from '@/features/projects/types'

type ProjectsFilterBarProps = {
  searchQuery: string
  setSearchQuery: (val: string) => void
  statusFilter: 'all' | ProjectStatus
  setStatusFilter: (val: 'all' | ProjectStatus) => void
  managerFilter: string
  setManagerFilter: (val: string) => void
  dateFilter: string
  setDateFilter: (val: string) => void
  yearFilter: string
  setYearFilter: (val: string) => void
  managerOptions: string[]
  yearOptions: string[]
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
  yearFilter,
  setYearFilter,
  managerOptions,
  yearOptions,
  onReset,
}: ProjectsFilterBarProps) {
  const { t } = useTranslation()
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const isFiltered = Boolean(
    searchQuery
      || statusFilter !== 'active'
      || managerFilter !== 'all'
      || dateFilter
      || yearFilter !== 'all'
  )

  const activeFiltersCount = [
    statusFilter !== 'active',
    managerFilter !== 'all',
    dateFilter !== '',
    yearFilter !== 'all'
  ].filter(Boolean).length

  return (
    <div className="w-full">
      <div className="flex flex-row gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 sm:p-3 shadow-2xs items-center md:flex-wrap">
        {/* Search Input - Full width on mobile, flexible on desktop */}
        <div className="relative flex-1 md:w-auto md:min-w-[200px] md:flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('projects.filters.searchPlaceholder')}
            aria-label={t('projects.filters.searchAria')}
            className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-9 pr-8 text-sm outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-full hover:bg-[var(--accent)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <Button
          type="button"
          variant="outline"
          className="relative h-9 w-9 p-0 md:hidden shrink-0 rounded-xl border-[var(--border)] text-[var(--foreground)]"
          onClick={() => setIsMobileFiltersOpen(true)}
        >
          <Filter size={16} />
          {activeFiltersCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-[9px] font-bold text-[var(--sidebar-primary-foreground)] shadow-sm">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {/* Desktop Filters Container */}
        <div className="hidden md:flex md:w-auto md:items-center md:flex-wrap md:gap-2">
          {/* Status Dropdown */}
          <label className="relative w-[150px] shrink-0">
            <CircleDot size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
              aria-label={t('projects.filters.statusAria')}
              className="h-9 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-8 pr-6 text-sm font-medium outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer text-ellipsis overflow-hidden"
            >
              <option value="all">{t('projects.filters.allStatuses')}</option>
              <option value="active">{t('projects.status.active')}</option>
              <option value="planning">{t('projects.status.planning')}</option>
              <option value="blocked">{t('projects.status.blocked')}</option>
              <option value="done">{t('projects.status.done')}</option>
            </select>
          </label>

          {/* Manager Dropdown */}
          <label className="relative w-[150px] shrink-0">
            <UserRound size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <select
              value={managerFilter}
              onChange={(event) => setManagerFilter(event.target.value)}
              aria-label={t('projects.filters.managerAria')}
              className="h-9 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-8 pr-6 text-sm font-medium outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer text-ellipsis overflow-hidden"
            >
              {managerOptions.map((manager) => (
                <option key={manager} value={manager}>
                  {manager === 'all' ? t('projects.filters.allManagers') : manager}
                </option>
              ))}
            </select>
          </label>

          {/* Year Dropdown */}
          <label className="relative w-[150px] shrink-0">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              aria-label={t('projects.filters.yearAria')}
              className="h-9 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-8 pr-6 text-sm font-medium outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer text-ellipsis overflow-hidden"
            >
              <option value="all">{t('projects.filters.allYears')}</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Date Filter & Reset Button Group (Desktop) */}
        <div className="hidden md:flex md:items-center md:gap-2 md:ml-auto">
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            title={t('projects.filters.dateTitle')}
            ariaLabel={t('projects.filters.dateAria')}
            placeholder={t('projects.filters.datePlaceholder')}
            size="sm"
            className="w-[190px]"
          />

          {/* Reset Button */}
          <Button
            type="button"
            disabled={!isFiltered}
            onClick={onReset}
            variant="outline"
            className="h-9 shrink-0 gap-1.5 rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 hover:text-[var(--sidebar-primary)] disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--muted-foreground)]/50 disabled:opacity-50 transition-all duration-200"
          >
            <FilterX size={14} />
            <span>{t('projects.filters.reset')}</span>
          </Button>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Overlay */}
          <div 
            className={`fixed inset-0 z-[100] bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
              isMobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsMobileFiltersOpen(false)}
          />
          
          {/* Drawer panel */}
          <aside 
            className={`fixed inset-y-0 right-0 z-[110] flex w-full max-w-[320px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
              isMobileFiltersOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
                <Filter size={16} className="text-[var(--sidebar-primary)]" />
                Filtry
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="h-8 w-8 rounded-xl p-0 border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
              >
                <X size={16} />
              </Button>
            </header>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-6">
              <div className="space-y-4">
                <label className="block w-full">
                  <span className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Status</span>
                  <div className="relative">
                    <CircleDot size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
                      className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-9 pr-6 text-sm font-medium outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer"
                    >
                      <option value="all">{t('projects.filters.allStatuses')}</option>
                      <option value="active">{t('projects.status.active')}</option>
                      <option value="planning">{t('projects.status.planning')}</option>
                      <option value="blocked">{t('projects.status.blocked')}</option>
                      <option value="done">{t('projects.status.done')}</option>
                    </select>
                  </div>
                </label>

                <label className="block w-full">
                  <span className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Manager</span>
                  <div className="relative">
                    <UserRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <select
                      value={managerFilter}
                      onChange={(event) => setManagerFilter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-9 pr-6 text-sm font-medium outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer text-ellipsis overflow-hidden"
                    >
                      {managerOptions.map((manager) => (
                        <option key={manager} value={manager}>
                          {manager === 'all' ? t('projects.filters.allManagers') : manager}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="block w-full">
                  <span className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Rok</span>
                  <div className="relative">
                    <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <select
                      value={yearFilter}
                      onChange={(event) => setYearFilter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] pl-9 pr-6 text-sm font-medium outline-none transition focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 cursor-pointer text-ellipsis overflow-hidden"
                    >
                      <option value="all">{t('projects.filters.allYears')}</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <div className="block w-full">
                  <span className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Data z harmonogramu</span>
                  <DatePicker
                    value={dateFilter}
                    onChange={setDateFilter}
                    title={t('projects.filters.dateTitle')}
                    ariaLabel={t('projects.filters.dateAria')}
                    placeholder={t('projects.filters.datePlaceholder')}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            <footer className="border-t border-[var(--border)] p-4 flex gap-3 shrink-0 bg-[var(--card)]">
               <Button 
                 variant="outline" 
                 className="flex-1 rounded-xl h-10 border-[var(--border)] hover:bg-[var(--accent)]"
                 onClick={() => {
                   onReset()
                   setIsMobileFiltersOpen(false)
                 }}
                 disabled={!isFiltered}
               >
                 Wyczyść
               </Button>
               <Button 
                 className="flex-1 rounded-xl h-10 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
                 onClick={() => setIsMobileFiltersOpen(false)}
               >
                 Zastosuj
               </Button>
            </footer>
          </aside>
        </>,
        document.body
      )}
    </div>
  )
}
