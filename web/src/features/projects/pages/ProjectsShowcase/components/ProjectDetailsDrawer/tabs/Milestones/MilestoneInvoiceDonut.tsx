import { useState, useRef } from 'react'

type FinancialDonutChartProps = {
  total: number;
  paid: number;
  invoicedNotPaid: number;
  remaining: number;
  currency?: string;
}

type DonutSegment = {
  id: string;
  value: number;
  color: string;
  label: string;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.99) {
    return `M ${x - radius}, ${y} a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
  }
  const start = polarToCartesian(x, y, radius, startAngle)
  const end = polarToCartesian(x, y, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(' ')
}

export function MilestoneInvoiceDonut({ total, paid, invoicedNotPaid, remaining, currency = 'PLN' }: FinancialDonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number, y: number, seg: DonutSegment } | null>(null)
  
  // Adjusted sizes for smaller container
  const radius = 35
  const center = 50
  const strokeWidth = 10
  const hoverStrokeWidth = 12

  const segments = [
    { id: 'paid', value: paid, color: '#10b981', label: 'Zapłacono' },
    { id: 'invoiced', value: invoicedNotPaid, color: '#f59e0b', label: 'Wystawiono FV' },
    { id: 'remaining', value: remaining, color: 'var(--border)', label: 'Pozostało' }
  ]

  const activeSegments = segments.filter(s => s.value > 0)
  const gapPercent = activeSegments.length > 1 ? 0.05 : 0
  const gapDegrees = gapPercent * 360
  const availableDegrees = 360 - (gapDegrees * activeSegments.length)

  let currentAngle = 0

  const invoicedPct = total > 0 ? ((paid + invoicedNotPaid) / total) * 100 : 0
  const pctText = invoicedPct % 1 === 0 ? invoicedPct : invoicedPct.toFixed(1)

  return (
  <div className="flex items-center justify-center gap-4 w-full">
    <div ref={containerRef} className="relative w-[100px] h-[100px] flex items-center justify-center shrink-0">
      <svg
        className="w-full h-full overflow-visible drop-shadow-sm cursor-pointer"
        onMouseLeave={() => setTooltip(null)}
        onMouseMove={(e) => {
          if (!containerRef.current) return;
          const rect = e.currentTarget.getBoundingClientRect()
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          const dx = e.clientX - rect.left - centerX
          const dy = e.clientY - rect.top - centerY

          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < radius - strokeWidth || d > radius + strokeWidth) {
            setTooltip(null)
            return
          }

          let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
          if (angle < 0) angle += 360

          let curAngle = 0
          let hoveredSeg = null
          for (const seg of activeSegments) {
            const segDegrees = (seg.value / total) * availableDegrees
            if (angle >= curAngle && angle <= curAngle + segDegrees) {
              hoveredSeg = seg
              break
            }
            curAngle += segDegrees + gapDegrees
          }

          if (hoveredSeg) {
            const contRect = containerRef.current.getBoundingClientRect()
            setTooltip({ x: e.clientX - contRect.left, y: e.clientY - contRect.top, seg: hoveredSeg })
          } else {
            setTooltip(null)
          }
        }}
      >
        {activeSegments.map(seg => {
          const segDegrees = (seg.value / total) * availableDegrees
          const startAngle = currentAngle - 90
          const endAngle = currentAngle + segDegrees - 90
          const pathData = describeArc(center, center, radius, startAngle, endAngle)

          currentAngle += segDegrees + gapDegrees

          const isHovered = tooltip?.seg.id === seg.id

          return (
            <path
              key={seg.id}
              d={pathData}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? hoverStrokeWidth : strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out pointer-events-none"
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {total === 0 ? (
          <span className="text-[10px] font-bold text-[var(--muted-foreground)]">0%</span>
        ) : (
          <span className="text-sm font-extrabold text-[var(--foreground)]">{pctText}%</span>
        )}
      </div>

      {tooltip && (
        <div 
          className="absolute z-50 pointer-events-none bg-[var(--popover)] text-[var(--popover-foreground)] px-2.5 py-1.5 rounded-lg shadow-xl border border-[var(--border)] text-xs font-medium transform -translate-x-1/2 -translate-y-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            left: tooltip.x,
            top: tooltip.y - 10,
            whiteSpace: 'nowrap'
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.seg.color }} />
            <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">{tooltip.seg.label}</span>
          </div>
          <div className="font-extrabold text-sm">{tooltip.seg.value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">({total > 0 ? ((tooltip.seg.value / total) * 100).toFixed(1) : 0}%)</div>
          
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--popover)] border-b border-r border-[var(--border)] rotate-45" />
        </div>
      )}
    </div>
    
    {/* Legend */}
    <div className="flex flex-col justify-center gap-2 pl-4">
      {segments.map(seg => {
        if (seg.value <= 0 && seg.id !== 'remaining') return null; // Show remaining even if 0 for context, optional
        const segPct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0;
        return (
          <div key={seg.id} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <div className="flex flex-col">
              <span className="font-semibold text-[var(--foreground)]">{seg.label}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {seg.value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency} ({segPct}%)
              </span>
            </div>
          </div>
        )
      })}
    </div>
  </div>
  )
}
