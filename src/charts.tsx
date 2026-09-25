import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'
import { money } from './ui'

// Diverging pair (validated: CVD ΔE 21.6, contrast ≥ 3:1 on white)
export const IN_COLOR = '#2a78d6'
export const OUT_COLOR = '#e34948'
const GRID = '#e1e0d9'
const BASELINE = '#c3c2b7'
const MUTED = '#898781'

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

/** Width of a container, tracked with ResizeObserver. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Round up to a clean axis maximum whose half is also clean (1, 2, 3, 4, 5, 6, 8 × 10^n). */
function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  return ([1, 2, 3, 4, 5, 6, 8, 10].find((m) => m * p >= v) ?? 10) * p
}

type Tip = { x: number; y: number; title: string; rows: { label: string; value: string; color?: string }[] } | null

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[9rem] -translate-x-1/2 -translate-y-full rounded-lg border border-[rgba(11,11,11,0.10)] bg-white px-3 py-2 text-[0.75rem] shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <div className="mb-1 font-semibold text-[#52514e]">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[#52514e]">
            {r.color && <span className="inline-block h-[2px] w-3 rounded" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-bold tabular-nums text-[#0b0b0b]">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ChartCard({ title, subtitle, legend, children, table }: { title: string; subtitle: string; legend?: boolean; children: ReactNode; table: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#1E1E1E]">{title}</h3>
          <p className="text-[0.72rem] text-[#52514e]">{subtitle}</p>
        </div>
        {legend && (
          <div className="flex items-center gap-3 text-[0.72rem] text-[#52514e]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: IN_COLOR }} />Incoming</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: OUT_COLOR }} />Outgoing</span>
          </div>
        )}
      </div>
      {children}
      <details className="mt-3 text-[0.75rem] text-[#52514e]">
        <summary className="cursor-pointer select-none font-semibold hover:text-[#1E1E1E]">View as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">{table}</div>
      </details>
    </div>
  )
}

/** Column with a 4px rounded data-end, square at the baseline. */
function barPath(x: number, w: number, y0: number, y1: number) {
  const h = Math.abs(y1 - y0)
  if (h < 0.5) return ''
  const r = Math.min(4, h, w / 2)
  if (y1 < y0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z` // up
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z` // down
}

export type Bucket = { label: string; incoming: number; outgoing: number }

/** Incoming up, outgoing down, per time bucket, on one shared axis. */
export function FlowColumns({ buckets }: { buckets: Bucket[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<Tip>(null)
  const H = 240, padL = 44, padR = 8, padT = 8, padB = 24
  const plotW = Math.max(0, width - padL - padR), plotH = H - padT - padB
  // Same scale up and down so bar heights compare directly.
  const hasOut = buckets.some((b) => b.outgoing > 0)
  const maxIn = niceMax(Math.max(0, ...buckets.map((b) => Math.max(b.incoming, b.outgoing))))
  const maxOut = maxIn
  const span = maxIn + (hasOut ? maxOut : 0)
  const y = (v: number) => padT + ((maxIn - v) / span) * plotH
  const zero = y(0)
  const band = buckets.length ? plotW / buckets.length : 0
  const barW = Math.max(2, Math.min(24, band * 0.6))
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(plotW / 56))))
  const ticks = hasOut ? [maxIn, maxIn / 2, 0, -maxOut / 2, -maxOut] : [maxIn, maxIn / 2, 0]

  function show(i: number, cx: number) {
    const b = buckets[i]
    setTip({
      x: cx, y: y(b.incoming),
      title: b.label,
      rows: [
        { label: 'Incoming', value: money(b.incoming), color: IN_COLOR },
        { label: 'Outgoing', value: money(b.outgoing), color: OUT_COLOR },
        { label: 'Net', value: money(b.incoming - b.outgoing) },
      ],
    })
  }

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Incoming and outgoing per period">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED} className="tabular-nums">{compact.format(Math.abs(t))}</text>
            </g>
          ))}
          {buckets.map((b, i) => {
            const cx = padL + band * i + band / 2
            const active = tip?.title === b.label
            return (
              <g key={b.label} opacity={tip && !active ? 0.55 : 1}>
                {b.incoming > 0 && <path d={barPath(cx - barW / 2, barW, zero - 1, Math.min(zero - 2, y(b.incoming)))} fill={IN_COLOR} />}
                {b.outgoing > 0 && <path d={barPath(cx - barW / 2, barW, zero + 1, Math.max(zero + 2, y(-b.outgoing)))} fill={OUT_COLOR} />}
                {i % labelEvery === 0 && (
                  <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} fill={MUTED}>{b.label}</text>
                )}
                <rect
                  x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent"
                  tabIndex={0} aria-label={`${b.label}: incoming ${money(b.incoming)}, outgoing ${money(b.outgoing)}`}
                  onMouseMove={() => show(i, cx)} onFocus={() => show(i, cx)} onBlur={() => setTip(null)}
                  className="cursor-default outline-none"
                />
              </g>
            )
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

/** Single-series running balance with crosshair. */
export function BalanceLine({ points }: { points: { label: string; value: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 200, padL = 44, padR = 12, padT = 16, padB = 24
  const plotW = Math.max(0, width - padL - padR), plotH = H - padT - padB
  const values = points.map((p) => p.value)
  const hi = niceMax(Math.max(0, ...values))
  const lo = -niceMax(Math.max(0, ...values.map((v) => -v))) * (values.some((v) => v < 0) ? 1 : 0)
  const x = (i: number) => padL + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2)
  const y = (v: number) => padT + ((hi - v) / (hi - lo || 1)) * plotH
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join('')
  const area = points.length ? `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : ''
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(plotW / 56))))
  const last = points.length - 1
  // Drop ticks that would sit on top of the zero label.
  const ticks = (lo < 0 ? [hi, 0, lo] : [hi, hi / 2, 0]).filter((t) => t === 0 || Math.abs(y(t) - y(0)) >= 14)

  function onMove(e: MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(last, Math.round(rel * last))))
  }

  const h = hover !== null ? points[hover] : null
  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && points.length > 0 && (
        <svg width={width} height={H} role="img" aria-label="Running balance over the period">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>{compact.format(t)}</text>
            </g>
          ))}
          <path d={area} fill={IN_COLOR} opacity={0.1} />
          <path d={line} fill="none" stroke={IN_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => i % labelEvery === 0 && (
            <text key={p.label} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : x(i) > width - padR - 24 ? 'end' : 'middle'} fontSize={10} fill={MUTED}>{p.label}</text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke={BASELINE} strokeWidth={1} />}
          <circle cx={x(hover ?? last)} cy={y(points[hover ?? last].value)} r={4} fill={IN_COLOR} stroke="#fff" strokeWidth={2} />
          {hover === null && (
            <text x={x(last) - 8} y={y(points[last].value) - 10} textAnchor="end" fontSize={11} fontWeight={700} fill="#0b0b0b">{money(points[last].value)}</text>
          )}
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" onMouseMove={onMove} />
        </svg>
      )}
      {h && hover !== null && <Tooltip tip={{ x: x(hover), y: y(h.value), title: h.label, rows: [{ label: 'Balance', value: money(h.value), color: IN_COLOR }] }} />}
    </div>
  )
}

export type ProjectRow = { name: string; slug: string; incoming: number; outgoing: number }

/** Net (incoming − outgoing) per project as diverging horizontal bars. */
export function ProjectNetBars({ rows }: { rows: ProjectRow[] }) {
  const [tip, setTip] = useState<Tip>(null)
  const ref = useRef<HTMLDivElement>(null)
  const nets = rows.map((r) => r.incoming - r.outgoing)
  const maxPos = Math.max(0, ...nets), maxNeg = Math.max(0, ...nets.map((n) => -n))
  const total = maxPos + maxNeg || 1
  const zeroPct = (maxNeg / total) * 100

  function show(e: SyntheticEvent<HTMLElement>, r: ProjectRow) {
    const box = ref.current!.getBoundingClientRect(), el = e.currentTarget.getBoundingClientRect()
    setTip({
      x: el.left - box.left + el.width / 2, y: el.top - box.top,
      title: r.name,
      rows: [
        { label: 'Incoming', value: money(r.incoming), color: IN_COLOR },
        { label: 'Outgoing', value: money(r.outgoing), color: OUT_COLOR },
        { label: 'Net', value: money(r.incoming - r.outgoing) },
      ],
    })
  }

  return (
    <div ref={ref} className="relative flex flex-col gap-2" onMouseLeave={() => setTip(null)}>
      {rows.map((r, i) => {
        const net = nets[i]
        const pct = (Math.abs(net) / total) * 100
        return (
          <a
            key={r.slug}
            href={`#projects/${r.slug}`}
            onMouseMove={(e) => show(e, r)} onFocus={(e) => show(e, r)} onBlur={() => setTip(null)}
            className="grid grid-cols-[minmax(0,6rem)_1fr_auto] items-center sm:grid-cols-[minmax(0,9rem)_1fr_auto] gap-3 rounded-md px-1 py-0.5 hover:bg-[rgba(22,17,56,0.03)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="truncate text-[0.78rem] font-semibold text-[#1E1E1E]">{r.name}</span>
            <span className="relative h-[18px]">
              {maxNeg > 0 && <span className="absolute inset-y-0 w-px" style={{ left: `${zeroPct}%`, background: BASELINE }} />}
              <span
                className={`absolute inset-y-0 ${net >= 0 ? 'rounded-r' : 'rounded-l'}`}
                style={{
                  left: net >= 0 ? `calc(${zeroPct}% + 1px)` : `${zeroPct - pct}%`,
                  width: `max(${pct}% - 1px, 2px)`,
                  background: net >= 0 ? IN_COLOR : OUT_COLOR,
                }}
              />
            </span>
            <span className="min-w-[4.5rem] text-right text-[0.78rem] font-bold tabular-nums text-[#0b0b0b]">{money(net)}</span>
          </a>
        )
      })}
      <Tooltip tip={tip} />
    </div>
  )
}
