import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  Clock,
  Coffee,
  HardHat,
  Loader2,
  QrCode,
  User,
  Users,
  WifiOff,
} from 'lucide-react'
import { isOnSite, type AttendanceLive, type AttendanceMember, type AttendanceStatus } from '@/features/projects/api'

export type WorkersViewMode = 'brigade' | 'position' | 'list'

type ProjectActiveWorkersProps = {
  viewMode: WorkersViewMode
  data: AttendanceLive | undefined
  isLoading: boolean
  error: Error | null
}

type Row = AttendanceMember & { key: string; brigadeName: string; isForeman: boolean }

const PRIMARY_SOFT = 'bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,transparent)] text-[var(--sidebar-primary)]'
const FOREMAN_SOFT = 'bg-[color-mix(in_oklch,#f59e0b_15%,transparent)] text-amber-500'

/** Order inside a group: on site first, then finished, not marked, absent */
const STATUS_ORDER: Record<AttendanceStatus, number> = {
  open: 0,
  close_requested: 1,
  closed: 2,
  auto_closed: 3,
  not_marked: 4,
  absent: 5,
}

const MANUAL_REASONS: Record<string, string> = {
  no_smartphone: 'brak smartfona',
  dead_battery: 'rozładowany telefon',
  telegram_unavailable: 'Telegram niedostępny',
  other: 'inny powód',
}

const timeFormat = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Warsaw',
})

function formatTime(iso: string | null) {
  return iso ? timeFormat.format(new Date(iso)) : null
}

function checkInHint(m: AttendanceMember) {
  const parts: string[] = []
  if (m.checkInMethod === 'qr') parts.push('Odbicie kodem QR')
  if (m.checkInMethod === 'self') parts.push('Brygadzista otworzył dzień swoją sesją')
  if (m.checkInMethod === 'manual') {
    parts.push(`Odbity ręcznie przez brygadzistę${m.manualReason ? ` (${MANUAL_REASONS[m.manualReason] ?? m.manualReason})` : ''}`)
  }
  if (m.distanceToSiteM != null) parts.push(`${m.distanceToSiteM} m od budowy`)
  if (m.workDescription) parts.push(m.workDescription)
  return parts.join(' · ')
}

function StatusBadge({ member }: { member: AttendanceMember }) {
  const start = formatTime(member.checkInAt)
  const pill = 'flex items-center gap-1 px-1.5 py-0.5 rounded border shadow-sm text-[10px] font-semibold whitespace-nowrap'

  switch (member.status) {
    case 'open':
    case 'close_requested':
      return (
        <div className={`${pill} bg-[var(--background)] border-[var(--border)]`} title={checkInHint(member)}>
          {member.checkInMethod === 'qr' ? (
            <QrCode size={10} className="text-[var(--sidebar-primary)]" />
          ) : (
            <Clock size={10} className={member.checkInMethod === 'manual' ? 'text-amber-500' : 'text-[var(--sidebar-primary)]'} />
          )}
          <span className="font-mono text-[var(--foreground)]">{start}</span>
          {member.status === 'close_requested' ? <span className="text-amber-500">· kończy</span> : null}
        </div>
      )
    case 'closed':
    case 'auto_closed':
      return (
        <div
          className={`${pill} bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)]`}
          title={member.status === 'auto_closed' ? 'Dzień zamknięty automatycznie' : 'Dzień zakończony'}
        >
          <span className="font-mono">
            {start ?? '—'}–{formatTime(member.closedAt) ?? '—'}
          </span>
        </div>
      )
    case 'absent':
      return (
        <div
          className={`${pill} border-[color-mix(in_oklch,#f43f5e_25%,transparent)] bg-[color-mix(in_oklch,#f43f5e_10%,transparent)] text-rose-500`}
          title={member.absenceComment ?? undefined}
        >
          {member.absenceReason?.name ?? 'Nieobecny'}
        </div>
      )
    default:
      return (
        <div className={`${pill} border-dashed border-[var(--border)] text-[var(--muted-foreground)]`}>
          brak odbicia
        </div>
      )
  }
}

export function ProjectActiveWorkers({ viewMode, data, isLoading, error }: ProjectActiveWorkersProps) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

  const rows = useMemo<Row[]>(() => {
    const list = (data?.brigades ?? []).flatMap((b) =>
      b.members.map((m) => ({
        ...m,
        key: `${b.id}-${m.externalId}`,
        brigadeName: b.name,
        isForeman: b.foreman?.externalId === m.externalId,
      })),
    )
    return list.sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, 'pl'),
    )
  }, [data])

  const groups = useMemo(() => {
    if (viewMode === 'list') return []
    if (viewMode === 'brigade') {
      return (data?.brigades ?? []).map((b) => ({
        key: `b-${b.id}`,
        label: b.name,
        sub: b.foreman?.name ?? null,
        rows: rows.filter((r) => r.key.startsWith(`${b.id}-`)),
      }))
    }
    const byPosition = new Map<string, Row[]>()
    for (const r of rows) {
      const key = r.position || 'Bez stanowiska'
      byPosition.set(key, [...(byPosition.get(key) ?? []), r])
    }
    return [...byPosition.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'pl'))
      .map(([label, groupRows]) => ({ key: `p-${label}`, label, sub: null as string | null, rows: groupRows }))
  }, [data, rows, viewMode])

  // A few groups start open, a long list starts collapsed
  const isExpanded = (key: string) => {
    const byDefault = groups.length <= 3
    return toggled[key] === undefined ? byDefault : toggled[key]
  }

  const totals = data?.totals
  const onSiteCount = rows.filter((r) => isOnSite(r.status)).length

  const renderRow = (r: Row, showSub: boolean) => (
    <div
      key={r.key}
      className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-transparent hover:border-[var(--border)] hover:bg-[var(--card)] transition-colors ${
        r.status === 'absent' || r.status === 'not_marked' ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`size-5 rounded flex items-center justify-center shrink-0 ${r.isForeman ? FOREMAN_SOFT : PRIMARY_SOFT}`}>
          {r.isForeman ? <HardHat size={11} /> : <User size={11} />}
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[11px] font-semibold text-[var(--foreground)] truncate">{r.name}</span>
          {showSub ? (
            <span className="text-[9px] font-medium text-[var(--muted-foreground)] truncate">
              {viewMode === 'position'
                ? r.brigadeName
                : viewMode === 'brigade'
                  ? r.position
                  : [r.position, r.brigadeName].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </div>
      </div>
      <StatusBadge member={r} />
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-[var(--muted-foreground)]">
        <Loader2 size={16} className="animate-spin mb-1" />
        <span className="text-[10px]">Ładowanie obecności…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2 p-4 text-center text-[var(--muted-foreground)]">
        <AlertCircle size={18} className="text-rose-500" />
        <span className="text-[11px] font-semibold text-[var(--foreground)]">Nie udało się pobrać obecności</span>
        <span className="text-[10px] max-w-[240px]">{error?.message ?? 'Spróbuj ponownie za chwilę.'}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Summary of the day */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 border-b border-[var(--border)] text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
        <span>
          Na budowie <b className="font-semibold text-[var(--sidebar-primary)]">{onSiteCount}</b>
        </span>
        {totals?.closed ? (
          <span>
            Zakończyli <b className="font-semibold text-[var(--foreground)]">{totals.closed}</b>
          </span>
        ) : null}
        {totals?.notMarked ? (
          <span>
            Bez odbicia <b className="font-semibold text-[var(--foreground)]">{totals.notMarked}</b>
          </span>
        ) : null}
        {totals?.absent ? (
          <span>
            Nieobecni <b className="font-semibold text-rose-500">{totals.absent}</b>
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1" title="Dane z TMA, odświeżane co 30 s">
          {error ? <WifiOff size={10} className="text-amber-500" /> : null}
          {error ? 'dane z ' : 'stan na '}
          {formatTime(data.generatedAt)}
        </span>
      </div>

      <div className="flex-1 p-1 overflow-y-auto custom-scrollbar min-h-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3 p-4 text-center text-[var(--muted-foreground)]">
            <div className={`p-4 rounded-full ${PRIMARY_SOFT}`}>
              <Coffee size={26} strokeWidth={2.25} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Brak pracowników</span>
              <span className="text-[11px] leading-relaxed max-w-[220px]">
                Dziś żadna brygada nie odbiła się na tej budowie.
              </span>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-0.5">{rows.map((r) => renderRow(r, true))}</div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)] px-1">
            {groups.map((g) => {
              const open = isExpanded(g.key)
              const present = g.rows.filter((r) => isOnSite(r.status)).length
              const hasForeman = g.rows.some((r) => r.isForeman)
              return (
                <div key={g.key} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setToggled((prev) => ({ ...prev, [g.key]: !open }))}
                    className="flex items-center justify-between gap-2 py-2 px-1 my-0.5 w-full text-left rounded-md hover:bg-[var(--muted)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`rounded p-1.5 shrink-0 ${viewMode === 'position' && hasForeman ? FOREMAN_SOFT : PRIMARY_SOFT}`}>
                        {viewMode === 'brigade' ? <Users size={12} /> : hasForeman ? <HardHat size={12} /> : <User size={12} />}
                      </div>
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[11px] font-semibold text-[var(--foreground)] truncate">{g.label}</span>
                        {g.sub ? (
                          <span className="text-[9px] text-[var(--muted-foreground)] truncate">Bryg. {g.sub}</span>
                        ) : null}
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${PRIMARY_SOFT}`}
                        title="Na budowie / skład"
                      >
                        {present}/{g.rows.length}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open ? (
                    <div className="flex flex-col border-t border-[var(--border)] p-1 space-y-0.5">
                      {g.rows.map((r) => renderRow(r, true))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
