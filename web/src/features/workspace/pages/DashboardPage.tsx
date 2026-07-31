import { BriefcaseBusiness, Calendar, HardHat, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className="w-full space-y-4 p-3">
      <style>{`
        @keyframes sunRay {
          0%,100% { opacity: 0.5; transform: scaleX(1); }
          50%      { opacity: 1;   transform: scaleX(1.15); }
        }
        @keyframes sunPulse {
          0%,100% { r: 28; opacity: 0.9; }
          50%      { r: 32; opacity: 1; }
        }
        @keyframes sunGlow {
          0%,100% { opacity: 0.25; }
          50%      { opacity: 0.5; }
        }
        @keyframes energyFlow {
          0%   { stroke-dashoffset: 200; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes particleFlow {
          0%   { transform: translateX(0) translateY(0); opacity: 1; }
          100% { transform: translateX(var(--px)) translateY(var(--py)); opacity: 0; }
        }
        @keyframes panelShimmer {
          0%,100% { opacity: 0.08; }
          50%      { opacity: 0.28; }
        }
        @keyframes floatUp {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes slideFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(163,230,53,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(163,230,53,0); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 68%; }
        }
        @keyframes bolt {
          0%,100% { opacity: 0.6; transform: scaleY(1); }
          50%      { opacity: 1;   transform: scaleY(1.08); }
        }
        @keyframes cloudDrift {
          0%   { transform: translateX(0); }
          100% { transform: translateX(820px); }
        }
        @keyframes sparkle {
          0%,100% { opacity: 0; transform: scale(0.5); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── HERO BANNER ── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border"
        style={{
          height: '340px',
          background: 'linear-gradient(175deg, #040d07 0%, #071a0b 40%, #0a2211 80%, #0d2e14 100%)',
          borderColor: 'rgba(163,230,53,0.2)'
        }}
      >
        {/* Scanline texture */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.025]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(163,230,53,0.8) 2px, rgba(163,230,53,0.8) 3px)' }}
        />

        {/* ── SVG SCENE ── */}
        <svg
          viewBox="0 0 820 340"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            {/* Sky */}
            <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020904" />
              <stop offset="50%" stopColor="#071a0c" />
              <stop offset="100%" stopColor="#0f2e15" />
            </linearGradient>
            {/* Ground */}
            <linearGradient id="ground2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1e0e" />
              <stop offset="100%" stopColor="#040d06" />
            </linearGradient>
            {/* Sun glow */}
            <radialGradient id="sunGlow2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#bef264" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#84cc16" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
            </radialGradient>
            {/* Panel face */}
            <linearGradient id="panelFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0d2137" />
              <stop offset="100%" stopColor="#071426" />
            </linearGradient>
            {/* Panel shimmer */}
            <linearGradient id="panelShimmer2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
              <stop offset="50%" stopColor="#bef264" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
            </linearGradient>
            {/* Panel side */}
            <linearGradient id="panelSide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a3a20" />
              <stop offset="100%" stopColor="#0a1a0d" />
            </linearGradient>
            {/* Energy line */}
            <linearGradient id="energyLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
              <stop offset="50%" stopColor="#bef264" stopOpacity="1" />
              <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
            </linearGradient>
            {/* Horizon glow */}
            <radialGradient id="horizonGlow" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </radialGradient>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Sky */}
          <rect width="820" height="340" fill="url(#sky2)" />
          <rect width="820" height="340" fill="url(#horizonGlow)" />

          {/* Stars */}
          {[
            [50, 15, 0.8], [110, 28, 0.5], [170, 10, 0.9], [240, 35, 0.6], [300, 18, 0.7], [360, 8, 1],
            [430, 25, 0.5], [500, 12, 0.8], [560, 30, 0.6], [620, 18, 0.9], [680, 8, 0.7], [740, 22, 0.5],
            [790, 15, 0.8], [80, 55, 0.4], [180, 65, 0.6], [280, 48, 0.5], [380, 58, 0.7], [480, 50, 0.4],
            [580, 62, 0.6], [680, 45, 0.5], [760, 58, 0.7]
          ].map(([cx, cy, op], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 4 === 0 ? 1.3 : 0.7} fill="#d9f99d" opacity={op as number}
              style={{ animation: `sunRay ${1.5 + (i % 5) * 0.5}s ease-in-out infinite ${(i * 0.25) % 3}s` }} />
          ))}

          {/* ── SUN ── */}
          <g transform="translate(660, 60)">
            {/* Outer glow */}
            <circle cx="0" cy="0" r="70" fill="url(#sunGlow2)" style={{ animation: 'sunGlow 3s ease-in-out infinite' }} />
            {/* Mid glow */}
            <circle cx="0" cy="0" r="42" fill="#84cc16" opacity="0.12" style={{ animation: 'sunGlow 2.5s ease-in-out infinite 0.5s' }} />
            {/* Sun body */}
            <circle cx="0" cy="0" r="28" fill="#bef264" filter="url(#glow2)" style={{ animation: 'sunGlow 2s ease-in-out infinite' }} />
            <circle cx="0" cy="0" r="22" fill="#d9f99d" />
            <circle cx="-5" cy="-5" r="8" fill="#f7ffe0" opacity="0.5" />

            {/* Rays */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30) * Math.PI / 180
              const x1 = Math.cos(angle) * 34
              const y1 = Math.sin(angle) * 34
              const x2 = Math.cos(angle) * 52
              const y2 = Math.sin(angle) * 52
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#bef264" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round"
                  style={{
                    animation: `sunRay ${1.5 + (i % 3) * 0.4}s ease-in-out infinite ${i * 0.15}s`,
                    transformOrigin: '0 0'
                  }} />
              )
            })}
          </g>

          {/* Cloud (drifting) */}
          <g style={{ animation: 'cloudDrift 60s linear infinite' }} opacity="0.06">
            <ellipse cx="-600" cy="80" rx="60" ry="18" fill="#a3e635" />
            <ellipse cx="-575" cy="70" rx="35" ry="22" fill="#a3e635" />
            <ellipse cx="-625" cy="72" rx="30" ry="16" fill="#a3e635" />
          </g>

          {/* Ground / horizon */}
          <rect x="0" y="295" width="820" height="45" fill="url(#ground2)" />
          <rect x="0" y="295" width="820" height="1.5" fill="#4ade80" opacity="0.15" />

          {/* Grass tufts */}
          {Array.from({ length: 18 }).map((_, i) => (
            <g key={i} transform={`translate(${30 + i * 45}, 295)`} opacity="0.4">
              <line x1="0" y1="0" x2="-4" y2="-10" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="0" y2="-13" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="4" y2="-10" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ))}

          {/* ── SOLAR PANELS (isometric style row) ── */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const baseX = 135 + i * 90
            const baseY = 255
            const w = 75
            const h = 48
            const depth = 10
            // Parallelogram panel (angled forward)
            const pts = `${baseX},${baseY} ${baseX + w},${baseY - 18} ${baseX + w},${baseY - 18 - h} ${baseX},${baseY - h}`
            const sideLeft = `${baseX},${baseY} ${baseX},${baseY - h} ${baseX - depth},${baseY - h + 8} ${baseX - depth},${baseY + 8}`
            const sideBot = `${baseX},${baseY} ${baseX + w},${baseY - 18} ${baseX + w - depth},${baseY - 18 + 8} ${baseX - depth},${baseY + 8}`
            const delay = i * 0.12

            return (
              <g key={i}>
                {/* Support pole */}
                <line
                  x1={baseX + w / 2} y1={baseY}
                  x2={baseX + w / 2 - depth / 2} y2={baseY + 28}
                  stroke="#1a3a20" strokeWidth="3" strokeLinecap="round"
                />
                {/* Bottom side */}
                <polygon points={sideBot} fill="#0a1a0d" opacity="0.8" />
                {/* Left side */}
                <polygon points={sideLeft} fill="url(#panelSide)" opacity="0.9" />
                {/* Panel face (main) */}
                <polygon points={pts} fill="url(#panelFace)" />
                {/* Grid lines on panel */}
                {[1, 2, 3].map(r => {
                  const frac = r / 4
                  const lx1 = baseX + w * frac
                  const ly1 = baseY - 18 * frac
                  const lx2 = lx1
                  const ly2 = ly1 - h
                  return <line key={r} x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#1e4080" strokeWidth="0.6" opacity="0.5" />
                })}
                {[1, 2, 3, 4].map(r => {
                  const frac = r / 5
                  const lx1 = baseX + w * 0
                  const ly1 = baseY - h * frac
                  const lx2 = baseX + w
                  const ly2 = baseY - 18 - h * frac
                  return <line key={r} x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#1e4080" strokeWidth="0.6" opacity="0.5" />
                })}
                {/* Shimmer reflection */}
                <polygon
                  points={pts} fill="url(#panelShimmer2)"
                  style={{ animation: `panelShimmer ${2 + i * 0.3}s ease-in-out infinite ${delay}s` }}
                />
                {/* Panel border */}
                <polygon points={pts} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.25" />
                {/* Sparkle on top corner */}
                <circle cx={baseX + w * 0.7} cy={baseY - h * 0.8 - 14} r="2.5" fill="#bef264"
                  style={{ animation: `sparkle ${1.5 + i * 0.4}s ease-in-out infinite ${i * 0.3}s` }} />
              </g>
            )
          })}

          {/* ── ENERGY CABLES from panels to central node ── */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const px = 135 + i * 90 + 37
            const py = 220
            const cx = 410
            const cy = 275
            return (
              <g key={i}>
                <line x1={px} y1={py} x2={cx} y2={cy}
                  stroke="#4ade80" strokeWidth="1" opacity="0.15" strokeDasharray="4,4" />
                <line x1={px} y1={py} x2={cx} y2={cy}
                  stroke="#a3e635" strokeWidth="1.5" strokeDasharray="200" strokeDashoffset="200"
                  style={{ animation: `energyFlow ${1.8 + i * 0.2}s ease-in-out infinite ${i * 0.3}s` }}
                  filter="url(#glow2)" />
              </g>
            )
          })}

          {/* Central energy node */}
          <g transform="translate(410, 275)">
            <circle cx="0" cy="0" r="22" fill="#071a0c" stroke="#4ade80" strokeWidth="1" opacity="0.6" />
            <circle cx="0" cy="0" r="14" fill="#0a2211" stroke="#a3e635" strokeWidth="1.5"
              style={{ animation: 'sunGlow 2s ease-in-out infinite' }} />
            <circle cx="0" cy="0" r="8" fill="#bef264" opacity="0.8" filter="url(#glow2)"
              style={{ animation: 'sunGlow 1.5s ease-in-out infinite 0.5s' }} />
            {/* Bolt symbol */}
            <path d="M-2,-5 L2,-5 L0,0 L3,0 L-1,6 L0,1 L-3,1 Z" fill="#040d07" />
          </g>

          {/* Power line cables to right */}
          <g opacity="0.3" stroke="#4ade80" strokeWidth="1" fill="none">
            {/* Poles */}
            <line x1="720" y1="240" x2="720" y2="295" />
            <line x1="720" y1="240" x2="700" y2="238" />
            <line x1="720" y1="240" x2="740" y2="238" />
            <line x1="780" y1="245" x2="780" y2="295" />
            <line x1="780" y1="245" x2="760" y2="243" />
            <line x1="780" y1="245" x2="800" y2="243" />
            {/* Wires */}
            <path d="M700,238 Q740,244 760,243" strokeWidth="0.8" />
            <path d="M740,238 Q760,244 800,243" strokeWidth="0.8" />
          </g>

          {/* Energy particles floating up from panels */}
          {[150, 240, 320, 410, 500, 590].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={205} r="2" fill="#bef264" opacity="0.7"
                style={{ '--px': `${(i - 2) * 8}px`, '--py': '-50px', animation: `particleFlow ${2 + i * 0.3}s ease-out infinite ${i * 0.5}s` } as React.CSSProperties} />
              <circle cx={x + 12} cy={195} r="1.5" fill="#a3e635" opacity="0.5"
                style={{ '--px': `${(i - 3) * 6}px`, '--py': '-40px', animation: `particleFlow ${2.5 + i * 0.25}s ease-out infinite ${i * 0.4 + 0.3}s` } as React.CSSProperties} />
            </g>
          ))}
        </svg>

        {/* ── TEXT OVERLAY (left) ── */}
        <div
          className="absolute top-0 left-0 z-20 p-6 space-y-2.5 max-w-xs"
          style={{ animation: 'slideFadeIn 0.7s ease-out 0.2s both' }}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border"
            style={{
              color: '#a3e635', background: 'rgba(163,230,53,0.08)',
              borderColor: 'rgba(163,230,53,0.3)',
              animation: 'badgePulse 2.5s ease-in-out infinite',
              backdropFilter: 'blur(8px)'
            }}
          >
            <Zap size={11} />
            W trakcie budowy
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight" style={{ color: '#f0fdf4' }}>
            Twój panel<br />
            <span style={{ color: '#a3e635', textShadow: '0 0 20px rgba(163,230,53,0.4)' }}>
              zarządzania projektami
            </span>
          </h1>
          <p className="text-sm font-medium" style={{ color: '#86efac', opacity: 0.75 }}>
            Wkrótce tutaj znajdziesz kluczowe wskaźniki KPI, harmonogram i alerty.
          </p>

          {/* Progress */}
          <div className="pt-1 space-y-1.5 max-w-[210px]">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#a3e635' }}>
              <span>Postęp wdrożenia</span>
              <span>68%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.15)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #4ade80, #a3e635)',
                  animation: 'progressBar 2s ease-out 1s both',
                  boxShadow: '0 0 10px rgba(163,230,53,0.6)'
                }}
              />
            </div>
          </div>
        </div>

        {/* ── FLOATING STAT CARDS (right) ── */}
        <div
          className="absolute top-5 right-5 z-20 flex flex-col gap-2"
          style={{ animation: 'slideFadeIn 0.8s ease-out 0.5s both' }}
        >
          {[
            { icon: BriefcaseBusiness, label: 'Aktywne projekty', value: '—', color: '#a3e635' },
            { icon: Users, label: 'Zespół', value: '—', color: '#4ade80' },
            { icon: TrendingUp, label: 'Efektywność', value: '—', color: '#86efac' },
          ].map(({ icon: Icon, label, value, color }, idx) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(4,13,7,0.78)',
                border: `1px solid ${color}22`,
                backdropFilter: 'blur(14px)',
                minWidth: '175px',
                animation: `floatUp ${4 + idx * 0.5}s ease-in-out infinite ${idx * 0.4}s`
              }}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#4b6b4d' }}>{label}</p>
                <p className="text-sm font-extrabold" style={{ color: '#f0fdf4' }}>{value}</p>
              </div>
              <div className="ml-auto">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ background: 'rgba(163,230,53,0.1)', color: '#a3e635', border: '1px solid rgba(163,230,53,0.2)' }}>
                  Soon
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Date badge */}
        <div
          className="absolute bottom-4 right-5 z-20 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: 'rgba(4,13,7,0.7)',
            border: '1px solid rgba(163,230,53,0.15)',
            backdropFilter: 'blur(12px)',
            animation: 'slideFadeIn 0.8s ease-out 0.9s both'
          }}
        >
          <Calendar size={12} style={{ color: '#a3e635' }} />
          <span className="text-[11px] font-bold" style={{ color: '#86efac' }}>
            {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── FEATURE PREVIEW CARDS ── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        style={{ animation: 'slideFadeIn 0.8s ease-out 1s both' }}
      >
        {[
          { icon: TrendingUp, title: 'KPI & Analizy', desc: 'Wskaźniki postępu, budżetów i harmonogramów wszystkich projektów.', color: '#a3e635' },
          { icon: Calendar, title: 'Oś czasu', desc: 'Interaktywny Gantt z kamieniami milowymi i alertami terminów.', color: '#4ade80' },
          { icon: HardHat, title: 'Zasoby & Brygady', desc: 'Przydział zespołów, dostępność i raportowanie godzin pracy.', color: '#86efac' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div
            key={title}
            className="group relative rounded-xl bg-[var(--card)] p-4 space-y-3 overflow-hidden cursor-default transition-all duration-300"
            style={{ border: '1px solid rgba(163,230,53,0.12)' }}
          >
            {/* Hover glow */}
            <div className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: `radial-gradient(circle at 30% 50%, ${color}0a, transparent 70%)` }} />

            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                <Icon size={18} style={{ color }} strokeWidth={1.5} />
              </div>
              <span className="text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest"
                style={{ background: 'rgba(163,230,53,0.07)', color: '#a3e635', border: '1px solid rgba(163,230,53,0.18)' }}>
                <Sparkles size={8} className="inline mr-1" />
                Wkrótce
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[var(--foreground)]">{title}</h3>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
            </div>

            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(163,230,53,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: '0%', background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
