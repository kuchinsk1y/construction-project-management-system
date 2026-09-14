import { useTranslation } from 'react-i18next'
import { HardHat, User, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

type WorkerAttendance = {
  id: number
  firstName: string
  lastName: string
  role: string
  clockInTime: string
  isForeman: boolean
}

export function ProjectActiveWorkers() {
  const { t } = useTranslation()

  const { data: workers = [], isLoading, isError } = useQuery({
    queryKey: ['workers-attendance'],
    queryFn: async () => {
      const response = await fetch(`/mock/workers-attendance.json?t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json() as Promise<WorkerAttendance[]>
    },
  })

  return (
    <div className="flex flex-col h-full bg-[var(--background)]/30 min-h-0">
      <div className="flex-1 p-1 space-y-0.5 overflow-y-auto custom-scrollbar min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-20 text-[var(--muted-foreground)]">
            <Loader2 size={16} className="animate-spin mb-1" />
            <span className="text-[10px]">Ładowanie...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-20 text-rose-500">
            <AlertCircle size={16} className="mb-1" />
            <span className="text-[10px]">Błąd pobierania danych</span>
          </div>
        ) : workers.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-[var(--muted-foreground)]">
            Brak osób na budowie
          </div>
        ) : (
          workers.map((worker) => (
            <div
              key={worker.id}
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--card)] transition-colors border border-transparent hover:border-[var(--border)] group"
            >
              <div className="flex items-center gap-2">
                <div className={`size-5 rounded flex items-center justify-center shrink-0 shadow-sm ${worker.isForeman
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)]'
                  }`}>
                  {worker.isForeman ? <HardHat size={11} /> : <User size={11} />}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-[var(--foreground)]">
                    {worker.firstName} {worker.lastName}
                  </span>
                  <span className="text-[9px] font-semibold text-[var(--muted-foreground)]">
                    {worker.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] shadow-sm">
                <Clock size={10} className="text-[var(--sidebar-primary)]" />
                <span className="font-mono text-[10px] font-bold text-[var(--foreground)]">
                  {worker.clockInTime}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
