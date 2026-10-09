import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Clock, Percent, Info, Edit2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiWorkType } from '@/features/projects/types'
import { fetchHoursPlan, updateHoursPlan } from '@/features/projects/api'

type HoursPlanTabProps = {
  projectId: string
  works: ApiWorkType[]
  canEditProject: boolean
}

export function HoursPlanTab({ projectId, works, canEditProject }: HoursPlanTabProps) {
  const queryClient = useQueryClient()

  const { data: plan, isLoading } = useQuery({
    queryKey: ['project-hours-plan', projectId],
    queryFn: () => fetchHoursPlan(projectId),
  })

  const [hourlyRate, setHourlyRate] = useState<string>('')
  const [distributions, setDistributions] = useState<Record<string, number>>({})
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (plan) {
      setHourlyRate(plan.averageHourlyRate ? String(plan.averageHourlyRate) : '')
      const dist: Record<string, number> = {}
      plan.distributions.forEach((d) => {
        dist[d.workTypeId] = d.percentage
      })
      setDistributions(dist)
    }
  }, [plan])

  const mutation = useMutation({
    mutationFn: ({ projectId: pId, payload }: { projectId: string; payload: any }) => updateHoursPlan(pId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-hours-plan', projectId] })
      setIsEditMode(false)
    },
  })

  const totalPercentage = useMemo(() => {
    return Object.values(distributions).reduce((acc, val) => acc + (val || 0), 0)
  }, [distributions])

  const isDirty = useMemo(() => {
    if (!plan) return false
    const currentRate = parseFloat(hourlyRate.replace(',', '.')) || 0
    const originalRate = plan.averageHourlyRate || 0
    if (Math.abs(currentRate - originalRate) > 0.01) return true

    for (const w of works) {
      const currentPerc = distributions[w.id] || 0
      const originalDist = plan.distributions.find(d => d.workTypeId === w.id)
      const originalPerc = originalDist ? originalDist.percentage : 0
      if (Math.abs(currentPerc - originalPerc) > 0.01) return true
    }
    return false
  }, [plan, hourlyRate, distributions, works])

  // Dynamically calculate total hours based on input rate, otherwise fallback to DB value
  const parsedRate = parseFloat(hourlyRate.replace(',', '.')) || 0
  const totalHours = parsedRate > 0 && plan?.totalSalaryBudget ? (plan.totalSalaryBudget / parsedRate) : (plan?.plannedHoursTotal || 0)

  const handlePercentageChange = (workTypeId: string, val: string) => {
    let num = parseFloat(val.replace(',', '.'))
    if (isNaN(num)) num = 0
    setDistributions((prev) => ({ ...prev, [workTypeId]: num }))
  }

  const handleSave = () => {
    const rate = parseFloat(hourlyRate.replace(',', '.')) || 0
    const payloadDistributions = works.map(w => ({
      workTypeId: w.id,
      percentage: distributions[w.id] || 0
    }))

    mutation.mutate({
      projectId,
      payload: {
        averageHourlyRate: rate,
        distributions: payloadDistributions
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="animate-spin text-[var(--sidebar-primary)]" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-3 animate-tab-content">
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 md:p-4 shadow-sm space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <div className="p-1.5 rounded-md bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]">
                <Clock size={16} />
              </div>
              <span>Planowanie godzin dla robót</span>
            </div>
            <p className="text-[11px] font-medium text-[var(--muted-foreground)] max-w-lg">
              Wpisz stawkę godzinową. System podzieli budżet wynagrodzeń z karty "Planowane Wydatki" przez tę stawkę.
            </p>
          </div>

          {canEditProject && (
            <div className="flex items-center gap-2 shrink-0">
              {isEditMode ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={mutation.isPending || totalPercentage > 100.01 || !isDirty}
                    className={`text-[11px] h-8 px-4 rounded-md flex items-center gap-1.5 font-bold shadow-sm transition ${(!isDirty || totalPercentage > 100.01)
                      ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_14px_color-mix(in_oklch,#10b981,transparent_55%)]'
                      }`}
                  >
                    {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Zapisz</span>
                  </Button>
                  <Button
                    onClick={() => {
                      if (plan) {
                        setHourlyRate(plan.averageHourlyRate ? String(plan.averageHourlyRate) : '')
                        const dist: Record<string, number> = {}
                        plan.distributions.forEach((d) => { dist[d.workTypeId] = d.percentage })
                        setDistributions(dist)
                      }
                      setIsEditMode(false)
                    }}
                    disabled={mutation.isPending}
                    className="text-[11px] h-8 px-4 rounded-md flex items-center gap-1.5 font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                  >
                    <X size={13} />
                    <span>Anuluj</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditMode(true)}
                  className="text-[11px] h-8 px-4 rounded-md flex items-center gap-1.5 font-bold shadow-sm transition bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90"
                >
                  <Edit2 size={13} />
                  <span>Edytuj</span>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Średnia Stawka Godzinowa (PLN)</label>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <input
                  type="text"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  disabled={!canEditProject}
                  placeholder="np. 45"
                  className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-bold shadow-inner focus:border-[var(--sidebar-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-primary)] disabled:opacity-50"
                />
              ) : (
                <div className="flex-1 px-3 py-1.5 text-sm font-bold text-[var(--foreground)]">
                  {hourlyRate ? Number(hourlyRate.replace(',', '.')).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </div>
              )}
              <div className="px-2 py-1.5 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] rounded-md text-xs font-bold">
                PLN / h
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[var(--sidebar-primary)]/30 bg-[var(--sidebar-primary)]/5 p-3 shadow-sm flex flex-col justify-center gap-1 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 opacity-10">
              <Clock size={64} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-primary)] relative z-10">Całkowita ilość godzin (Budżet / Stawka)</span>
            <div className="flex items-baseline gap-1.5 relative z-10">
              <span className="text-2xl font-black tabular-nums text-[var(--foreground)] tracking-tight">
                {Math.round(totalHours).toLocaleString('pl-PL')}
              </span>
              <span className="text-xs font-bold text-[var(--muted-foreground)]">godz.</span>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-x-auto">
          <div className="min-w-[600px] flex flex-col">
            <div className="bg-[var(--sidebar-primary)]/5 px-3 py-2 border-b border-[var(--border)] grid grid-cols-12 gap-4 items-center">
              <div className="col-span-6 lg:col-span-7 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] border-r border-[var(--border)]">
                Roboty główne
              </div>
              <div className="col-span-3 lg:col-span-2 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] flex flex-col gap-0.5 px-2">
                <span>Udział (%)</span>
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className={`px-1 py-0.5 rounded font-black ${totalPercentage > 100.01 ? 'bg-red-500/20 text-red-500' : totalPercentage > 99.9 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                    Razem: {totalPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="col-span-3 lg:col-span-3 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-primary)] px-2">
                Godz. (Wyliczone)
              </div>
            </div>

            <div className="flex flex-col divide-y divide-[var(--border)]">
              {works.length === 0 ? (
                <div className="p-6 text-center text-[11px] text-[var(--muted-foreground)]">
                  Brak przypisanych robót głównych. Przejdź do zakładki "Roboty", aby je dodać.
                </div>
              ) : (
                works.map((w, idx) => {
                  const perc = distributions[w.id] || 0
                  const calculatedHours = Math.round(totalHours * (perc / 100))

                  return (
                    <div key={w.id} className="grid grid-cols-12 gap-4 items-center px-3 py-2 hover:bg-[var(--sidebar-primary)]/5 transition-colors group">
                      <div className="col-span-6 lg:col-span-7 border-r border-[var(--border)] pr-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--foreground)]">{idx + 1}. {w.name}</span>
                          {w.departments?.name && (
                            <span className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider mt-0.5">{w.departments.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="col-span-3 lg:col-span-2 relative px-2">
                        {isEditMode ? (
                          <input
                            type="number"
                            value={perc || ''}
                            onChange={(e) => handlePercentageChange(w.id, e.target.value)}
                            disabled={!canEditProject}
                            step="0.1"
                            min="0"
                            max="100"
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-center text-xs font-bold tabular-nums focus:border-[var(--sidebar-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-primary)] disabled:opacity-50"
                          />
                        ) : (
                          <div className="w-full text-center text-xs font-bold tabular-nums text-[var(--foreground)]">
                            {perc ? `${perc}%` : '-'}
                          </div>
                        )}
                      </div>

                      <div className="col-span-3 lg:col-span-3 px-2">
                        <div className="inline-flex min-w-[60px] justify-center items-center gap-1 rounded-md bg-[var(--sidebar-primary)]/10 px-2 py-1 font-bold text-[11px] text-[var(--sidebar-primary)] tabular-nums group-hover:bg-[var(--sidebar-primary)]/20 transition-colors">
                          {calculatedHours.toLocaleString('pl-PL')}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
