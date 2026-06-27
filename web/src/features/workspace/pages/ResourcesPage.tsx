import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Loader2, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  fetchProjects,
  fetchWorkTypes,
  fetchResourcePlans,
  createResourcePlan,
  deleteResourcePlan,
} from '@/features/projects/api'
import type {
  ApiProject,
  CreateResourcePlanPayload,
} from '@/features/projects/types'

type ResourcesPageProps = {
  canManage: boolean
}

function parseDateValue(value: string | null): Date | null {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return null

  const gvizMatch = value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,[^)]*)?\)$/)
  const date = gvizMatch ? new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3])) : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(value: string | null, noDeadlineLabel: string): string {
  if (!value || value === 'No deadline' || value === 'Brak terminu') return noDeadlineLabel

  const date = parseDateValue(value)
  if (!date) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}.${month}.${year}`
}

// function formatTickDate(date: Date): string {
//   const day = String(date.getDate()).padStart(2, '0')
//   const month = String(date.getMonth() + 1).padStart(2, '0')
//   return `${day}.${month}`
// }

function formatRangeDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

export function ResourcesPage({ canManage }: ResourcesPageProps) {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<string>('')

  // Form states
  const [resourcePlanForm, setResourcePlanForm] = useState<CreateResourcePlanPayload>({
    plannedWorkers: 0,
    dateFrom: '',
    dateTo: '',
  })
  const [resourcePlanError, setResourcePlanError] = useState('')

  // Fetch all projects for dropdown
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ApiProject[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  // Fetch project-specific work types
  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types', selectedProjectId],
    queryFn: () => fetchWorkTypes(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  // Fetch resource plans for the selected work type
  const { data: resourcePlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['resource-plans', selectedWorkTypeId],
    queryFn: () => fetchResourcePlans(selectedWorkTypeId),
    enabled: !!selectedWorkTypeId,
  })

  const headcountTimeline = useMemo(() => {
    if (resourcePlans.length === 0) return null

    const plansWithDates = resourcePlans.map(plan => {
      const from = parseDateValue(plan.dateFrom)
      const to = parseDateValue(plan.dateTo)
      return {
        ...plan,
        fromDate: from,
        toDate: to,
      }
    }).filter(p => p.fromDate && p.toDate) as Array<typeof resourcePlans[0] & { fromDate: Date, toDate: Date }>

    if (plansWithDates.length === 0) return null

    // Find overall start and end dates
    const times = plansWithDates.flatMap(p => [p.fromDate.getTime(), p.toDate.getTime()])
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    // const minDate = new Date(minTime)
    // const maxDate = new Date(maxTime)

    // Calculate headcount for each day
    const dayMs = 1000 * 60 * 60 * 24
    const totalDays = Math.round((maxTime - minTime) / dayMs) + 1

    const dailyHeadcount: Array<{ date: Date, headcount: number }> = []
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(minTime + i * dayMs)
      let headcount = 0
      plansWithDates.forEach(plan => {
        const dTime = currentDate.getTime()
        const planStartTime = new Date(plan.fromDate.getTime()).setHours(0, 0, 0, 0)
        const planEndTime = new Date(plan.toDate.getTime()).setHours(23, 59, 59, 999)
        if (dTime >= planStartTime && dTime <= planEndTime) {
          headcount += plan.plannedWorkers
        }
      })
      dailyHeadcount.push({ date: currentDate, headcount })
    }

    // Group daily headcounts into contiguous intervals with the same headcount
    const intervals: Array<{ dateFrom: Date, dateTo: Date, headcount: number }> = []
    if (dailyHeadcount.length === 0) return null

    let currentInterval = {
      dateFrom: dailyHeadcount[0].date,
      dateTo: dailyHeadcount[0].date,
      headcount: dailyHeadcount[0].headcount
    }

    for (let i = 1; i < dailyHeadcount.length; i++) {
      const day = dailyHeadcount[i]
      if (day.headcount === currentInterval.headcount) {
        currentInterval.dateTo = day.date
      } else {
        intervals.push({ ...currentInterval })
        currentInterval = {
          dateFrom: day.date,
          dateTo: day.date,
          headcount: day.headcount
        }
      }
    }
    intervals.push({ ...currentInterval })

    const totalDuration = maxTime - minTime || 1

    return {
      intervals,
      minTime,
      maxTime,
      totalDuration,
      maxHeadcount: Math.max(...intervals.map(i => i.headcount), 1),
    }
  }, [resourcePlans])

  // Mutations
  const createResourcePlanMutation = useMutation({
    mutationFn: (payload: CreateResourcePlanPayload) => createResourcePlan(selectedWorkTypeId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['resource-plans', selectedWorkTypeId] })
      setResourcePlanForm({ plannedWorkers: 0, dateFrom: '', dateTo: '' })
      setResourcePlanError('')
    },
    onError: (err: Error) => {
      setResourcePlanError(err.message)
    },
  })

  const deleteResourcePlanMutation = useMutation({
    mutationFn: (id: string) => deleteResourcePlan(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['resource-plans', selectedWorkTypeId] })
    },
  })

  const handleResourcePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkTypeId) {
      setResourcePlanError('Wybierz rodzaj roboty')
      return
    }
    if (Number(resourcePlanForm.plannedWorkers) <= 0) {
      setResourcePlanError('Liczba pracowników musi być większa od 0')
      return
    }

    const payload: CreateResourcePlanPayload = {
      plannedWorkers: Number(resourcePlanForm.plannedWorkers),
      dateFrom: resourcePlanForm.dateFrom || undefined,
      dateTo: resourcePlanForm.dateTo || undefined,
    }

    createResourcePlanMutation.mutate(payload)
  }

  return (
    <div className="p-3">
      <div className="space-y-2 animate-fade-in pb-10">
        {/* Title block */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
              Zasoby i Obsada
            </h2>
          </div>
        </div>

        {/* Selectors card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Project selector */}
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Krok 1: Wybierz projekt</span>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-xs py-2">
                  <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={14} />
                  <span>Ładowanie projektów...</span>
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    setSelectedWorkTypeId('')
                    setResourcePlanForm({ plannedWorkers: 0, dateFrom: '', dateTo: '' })
                    setResourcePlanError('')
                  }}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
                >
                  <option value="">-- Wybierz projekt --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </label>

            {/* Work type selector */}
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Krok 2: Wybierz rodzaj roboty</span>
              {workTypesLoading ? (
                <div className="flex items-center gap-2 text-xs py-2">
                  <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={14} />
                  <span>Ładowanie robót...</span>
                </div>
              ) : (
                <select
                  value={selectedWorkTypeId}
                  disabled={!selectedProjectId}
                  onChange={(e) => {
                    setSelectedWorkTypeId(e.target.value)
                    setResourcePlanForm({ plannedWorkers: 0, dateFrom: '', dateTo: '' })
                    setResourcePlanError('')
                  }}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/20 disabled:opacity-50"
                >
                  <option value="">-- Wybierz rodzaj roboty / dział --</option>
                  {workTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {wt.milestoneNo}: {wt.name} ({wt.departmentName})
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        </div>

        {!selectedWorkTypeId ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] mb-4">
              <CalendarDays size={22} />
            </div>
            <h3 className="text-sm font-semibold">Brak wybranego rodzaju roboty</h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--muted-foreground)]">
              Wybierz projekt, a następnie konkretny rodzaj roboty, aby zarządzać planem obsady.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {/* Form container */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-sm">Zaplanuj obsadę</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Określ liczbę planowanych pracowników oraz ramy czasowe dla tej pracy.
                  </p>
                </div>

                {resourcePlanError && (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                    {resourcePlanError}
                  </div>
                )}

                {canManage ? (
                  <form onSubmit={handleResourcePlanSubmit} className="space-y-2">
                    <label className="block space-y-1">
                      <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Liczba pracowników <span className="text-rose-500">*</span></span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={resourcePlanForm.plannedWorkers || ''}
                        onChange={(e) => setResourcePlanForm((f) => ({ ...f, plannedWorkers: e.target.value ? Number(e.target.value) : 0 }))}
                        placeholder="np. 5"
                        className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs outline-none focus:border-[var(--sidebar-primary)]"
                      />
                    </label>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Data od</span>
                      <DatePicker
                        value={resourcePlanForm.dateFrom || ''}
                        onChange={(v) => setResourcePlanForm((f) => ({ ...f, dateFrom: v }))}
                        placeholder="dd.mm.rrrr"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Data do</span>
                      <DatePicker
                        value={resourcePlanForm.dateTo || ''}
                        onChange={(v) => setResourcePlanForm((f) => ({ ...f, dateTo: v }))}
                        min={resourcePlanForm.dateFrom || undefined}
                        placeholder="dd.mm.rrrr"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] text-xs h-9 hover:bg-[var(--sidebar-primary)]/90"
                      disabled={createResourcePlanMutation.isPending}
                    >
                      Dodaj plan obsady
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/20 p-3 rounded-lg border border-[var(--border)]">
                    Nie masz uprawnień do edycji planów zasobów.
                  </p>
                )}
              </div>
            </div>

            {/* List container */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-sm">Harmonogram obsady</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Lista zaplanowanych zasobów i okresów ich zatrudnienia na tym etapie prac.
                  </p>
                </div>

                {/* Headcount Chart Area */}
                {headcountTimeline && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/25 p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[var(--sidebar-primary)] animate-pulse"></span>
                          Wykres zapotrzebowania (headcount)
                        </h4>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          Łączna liczba pracowników na budowie w poszczególnych okresach.
                        </p>
                      </div>
                      <div className="text-[10px] bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] font-extrabold px-2 py-0.5 rounded-lg border border-[var(--sidebar-primary)]/15">
                        Maks: {headcountTimeline.maxHeadcount} {headcountTimeline.maxHeadcount === 1 ? 'osoba' : 'osób'}
                      </div>
                    </div>

                    <div className="h-28 flex items-end w-full border-b border-[var(--border)]/70 pb-1 relative pt-6 px-1">
                      {/* Grid background lines */}
                      <div className="absolute inset-x-0 bottom-1/2 border-b border-dashed border-[var(--border)]/15 pointer-events-none" />
                      <div className="absolute inset-x-0 top-6 border-b border-dashed border-[var(--border)]/15 pointer-events-none" />

                      {/* Columns */}
                      {headcountTimeline.intervals.map((interval, idx) => {
                        const intervalDuration = interval.dateTo.getTime() - interval.dateFrom.getTime() + 1000 * 60 * 60 * 24
                        const widthPercent = (intervalDuration / (headcountTimeline.totalDuration + 1000 * 60 * 60 * 24)) * 100
                        const heightPercent = interval.headcount > 0
                          ? (interval.headcount / headcountTimeline.maxHeadcount) * 80 + 20
                          : 0

                        const isZero = interval.headcount === 0

                        return (
                          <div
                            key={idx}
                            className="group/bar relative flex flex-col justify-end h-full transition-all duration-200"
                            style={{ width: `${widthPercent}%` }}
                          >
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[var(--foreground)] text-[var(--background)] text-[10px] font-semibold px-2.5 py-1 rounded shadow-md pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 text-center">
                              Okres: {formatDate(interval.dateFrom.toISOString(), '')} - {formatDate(interval.dateTo.toISOString(), '')} <br />
                              Obsada: {interval.headcount} {interval.headcount === 1 ? 'pracownik' : 'pracowników'}
                            </div>

                            {/* Headcount Label above the bar */}
                            {!isZero && (
                              <span className="absolute bottom-[calc(var(--bar-height)+4px)] left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-[var(--sidebar-primary)] opacity-90 group-hover/bar:scale-110 transition-transform" style={{ '--bar-height': `${heightPercent}%` } as React.CSSProperties}>
                                {interval.headcount} os.
                              </span>
                            )}

                            {/* The Bar */}
                            <div
                              className={`w-full rounded-t-lg transition-all duration-300 ${isZero
                                ? 'h-[2px] bg-[var(--border)]'
                                : 'bg-gradient-to-t from-[var(--sidebar-primary)]/5 to-[var(--sidebar-primary)]/20 hover:from-[var(--sidebar-primary)]/15 hover:to-[var(--sidebar-primary)]/35 border-t-2 border-x border-[var(--sidebar-primary)]/40 hover:border-[var(--sidebar-primary)]/80 shadow-sm'
                                }`}
                              style={{ height: `${heightPercent}%` }}
                            />

                            {/* Date range label under the X axis */}
                            <div className="absolute top-full pt-1.5 left-0 right-0 text-center text-[9px] font-bold text-[var(--muted-foreground)] truncate px-0.5 select-none">
                              {formatRangeDate(interval.dateFrom)} - {formatRangeDate(interval.dateTo)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {plansLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin text-[var(--sidebar-primary)]" size={24} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resourcePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] group transition hover:border-[var(--sidebar-primary)]/45"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--foreground)] bg-[var(--sidebar-primary)]/10 px-2 py-0.5 rounded text-[var(--sidebar-primary)]">
                                {plan.plannedWorkers} {plan.plannedWorkers === 1 ? 'pracownik' : plan.plannedWorkers < 5 ? 'pracowników' : 'pracowników'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">
                              Okres: <strong>{plan.dateFrom ? formatDate(plan.dateFrom, '-') : ''} - {plan.dateTo ? formatDate(plan.dateTo, '-') : ''}</strong>
                            </div>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => deleteResourcePlanMutation.mutate(plan.id)}
                              disabled={deleteResourcePlanMutation.isPending}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                              title="Usuń plan"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}

                      {resourcePlans.length === 0 && (
                        <div className="text-center py-8 text-xs text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]/20">
                          Brak zaplanowanej obsady dla tej pracy.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
