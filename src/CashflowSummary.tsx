import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { BalanceLine, ChartCard, FlowColumns, ProjectNetBars, type Bucket, type ProjectRow } from './charts'
import { ErrorBanner, StatCard, friendly, inputClass, money, type Direction } from './ui'

type Row = { amount: number; direction: Direction; created_at: string; project: { name: string; slug: string } | null }

type Grain = 'day' | 'week' | 'month'

/** Pick bucket size from range length so charts stay readable. */
function grainFor(from: string, to: string): Grain {
  const days = (startOf(to).getTime() - startOf(from).getTime()) / 864e5 + 1
  return days <= 35 ? 'day' : days <= 190 ? 'week' : 'month'
}

/** Bucket key (YYYY-MM-DD of the bucket start, local time) for a date. */
function bucketStart(d: Date, grain: Grain) {
  const b = new Date(d.getFullYear(), d.getMonth(), grain === 'month' ? 1 : d.getDate())
  if (grain === 'week') b.setDate(b.getDate() - ((b.getDay() + 6) % 7)) // back to Monday
  return b
}

function buildBuckets(rows: Row[], from: string, to: string): Bucket[] {
  const grain = grainFor(from, to)
  const map = new Map<string, Bucket>()
  const end = startOf(to)
  for (let d = bucketStart(startOf(from), grain); d <= end; ) {
    const label =
      grain === 'month'
        ? `${d.toLocaleDateString(undefined, { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    map.set(ymd(d), { label, incoming: 0, outgoing: 0 })
    if (grain === 'day') d.setDate(d.getDate() + 1)
    else if (grain === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
  }
  for (const r of rows) {
    const b = map.get(ymd(bucketStart(new Date(r.created_at), grain)))
    if (b) b[r.direction] += Number(r.amount)
  }
  return [...map.values()]
}

function buildProjects(rows: Row[]): ProjectRow[] {
  const map = new Map<string, ProjectRow>()
  for (const r of rows) {
    if (!r.project) continue
    const p = map.get(r.project.slug) ?? { ...r.project, incoming: 0, outgoing: 0 }
    p[r.direction] += Number(r.amount)
    map.set(r.project.slug, p)
  }
  return [...map.values()]
}

function TopProject({ label, icon, tone, project, empty }: { label: string; icon: string; tone: string; project?: ProjectRow; empty: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[0.8rem] font-bold text-[#545454]">
        <i className={`fa-solid ${icon} ${tone}`} />{label}
      </div>
      {project ? (
        <>
          <a href={`#projects/${project.slug}`} className="mt-1 block truncate text-lg font-black text-[#1E1E1E] hover:text-brand-600 hover:underline">{project.name}</a>
          <div className="text-sm font-bold text-[#52514e]">Leftover {money(project.incoming - project.outgoing)}</div>
          <div className="text-[0.72rem] text-[#8a8a8a]">{money(project.incoming)} in · {money(project.outgoing)} out</div>
        </>
      ) : (
        <div className="mt-1 text-sm text-[#8a8a8a]">{empty}</div>
      )}
    </div>
  )
}


const presets = [
  { id: '7d', label: '7D' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'custom', label: 'Custom' },
] as const
type Preset = (typeof presets)[number]['id']

/** YYYY-MM-DD in local time */
const ymd = (d: Date) => d.toLocaleDateString('en-CA')

function presetStart(preset: Exclude<Preset, 'custom'>) {
  const d = new Date()
  if (preset === '7d') d.setDate(d.getDate() - 6) // today + previous 6 days
  if (preset === '1m') d.setMonth(d.getMonth() - 1)
  if (preset === '3m') d.setMonth(d.getMonth() - 3)
  if (preset === '6m') d.setMonth(d.getMonth() - 6)
  if (preset === '1y') d.setFullYear(d.getFullYear() - 1)
  return ymd(d)
}

/** Local-midnight Date for a YYYY-MM-DD string */
const startOf = (day: string) => new Date(`${day}T00:00:00`)

export default function CashflowSummary() {
  const today = ymd(new Date())
  const [preset, setPreset] = useState<Preset>('1m')
  const [custom, setCustom] = useState({ from: presetStart('1m'), to: today })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const from = preset === 'custom' ? custom.from : presetStart(preset)
  const to = preset === 'custom' ? custom.to : today
  const valid = Boolean(from && to && from <= to)

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    setLoading(true)
    const end = startOf(to)
    end.setDate(end.getDate() + 1) // include the whole "to" day

    supabase
      .from('cashflow')
      .select('amount, direction, created_at, project:projects(name, slug)')
      .gte('created_at', startOf(from).toISOString())
      .lt('created_at', end.toISOString())
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) return setError(friendly(error))
        setError('')
        setRows((data ?? []) as unknown as Row[])
      })
    return () => {
      cancelled = true
    }
  }, [from, to, valid])

  const sum = (d: Direction) => rows?.filter((r) => r.direction === d).reduce((s, r) => s + Number(r.amount), 0) ?? 0
  const incoming = sum('incoming'), outgoing = sum('outgoing')
  const buckets = rows && valid ? buildBuckets(rows, from, to) : []
  const balance = buckets.reduce<{ label: string; value: number }[]>(
    (acc, b) => [...acc, { label: b.label, value: (acc.at(-1)?.value ?? 0) + b.incoming - b.outgoing }],
    [],
  )
  const projects = rows ? buildProjects(rows) : []
  const net = (p: ProjectRow) => p.incoming - p.outgoing
  const byNet = [...projects].sort((a, b) => net(b) - net(a))
  // Profit/loss is judged by leftover (incoming − outgoing), same as the "Net by project" chart.
  const mostProfitable = byNet[0] && net(byNet[0]) > 0 ? byNet[0] : undefined
  const biggestLoss = byNet.at(-1) && net(byNet.at(-1)!) < 0 ? byNet.at(-1) : undefined
  const shownProjects = byNet.slice(0, 8)
  const grain = valid ? grainFor(from, to) : 'day'

  const fmt = (day: string) => startOf(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#3f3f3f]">Cashflow</h2>
          {valid && <p className="text-[0.75rem] text-[#545454]">{fmt(from)} – {fmt(to)}</p>}
        </div>
        <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-[#e8e8e8] bg-white p-1 shadow-sm">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => setPreset(p.id)}
              className={`rounded-md px-3 py-1.5 text-[0.78rem] font-bold transition-all duration-200 ${
                preset === p.id
                  ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_2px_8px_rgba(226,30,83,0.25)]'
                  : 'text-[#545454] hover:bg-[rgba(22,17,56,0.04)] hover:text-[#1E1E1E]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-bold text-[#545454]">From</span>
            <input type="date" value={custom.from} max={custom.to || today} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-bold text-[#545454]">To</span>
            <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className={inputClass} />
          </label>
          {!valid && <p role="alert" className="pb-2 text-[0.75rem] font-semibold text-[#ef4444]">"From" must be on or before "To".</p>}
        </div>
      )}

      <ErrorBanner message={error} />

      <div className={`flex flex-col gap-4 transition-opacity ${loading && rows ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Incoming" value={rows ? money(incoming) : '…'} tone="text-[#10b981]" icon="fa-arrow-down" />
          <StatCard label="Outgoing" value={rows ? money(outgoing) : '…'} tone="text-[#ef4444]" icon="fa-arrow-up" />
          <StatCard label="Net" value={rows ? money(incoming - outgoing) : '…'} tone={incoming - outgoing < 0 ? 'text-[#ef4444]' : 'text-[#1E1E1E]'} icon="fa-scale-balanced" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TopProject label="Most profitable project" icon="fa-trophy" tone="text-[#10b981]" project={mostProfitable} empty="No project made a profit in this period" />
          <TopProject label="Biggest loss project" icon="fa-arrow-trend-down" tone="text-[#ef4444]" project={biggestLoss} empty="No project is losing money in this period" />
        </div>

        {rows && (
          <>
            <ChartCard
              title="Cashflow over time"
              subtitle={`Incoming (up) vs outgoing (down) per ${grain}`}
              legend
              table={
                <table className="w-full text-left">
                  <thead><tr><th className="px-2 py-1.5 font-medium">Period</th><th className="px-2 py-1.5 font-medium">Incoming</th><th className="px-2 py-1.5 font-medium">Outgoing</th><th className="px-2 py-1.5 font-medium">Net</th></tr></thead>
                  <tbody>{buckets.map((b) => <tr key={b.label} className="border-t border-[#f1f1f1]"><td className="px-2 py-1.5">{b.label}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(b.incoming)}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(b.outgoing)}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(b.incoming - b.outgoing)}</td></tr>)}</tbody>
                </table>
              }
            >
              <FlowColumns buckets={buckets} />
            </ChartCard>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                title="Running balance"
                subtitle="Net cash accumulated through the period"
                table={
                  <table className="w-full text-left">
                    <thead><tr><th className="px-2 py-1.5 font-medium">Period</th><th className="px-2 py-1.5 font-medium">Balance</th></tr></thead>
                    <tbody>{balance.map((b) => <tr key={b.label} className="border-t border-[#f1f1f1]"><td className="px-2 py-1.5">{b.label}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(b.value)}</td></tr>)}</tbody>
                  </table>
                }
              >
                <BalanceLine points={balance} />
              </ChartCard>

              <ChartCard
                title="Net by project"
                subtitle={byNet.length > 8 ? `Top 8 of ${byNet.length} projects, incoming − outgoing` : 'Incoming − outgoing per project'}
                table={
                  <table className="w-full text-left">
                    <thead><tr><th className="px-2 py-1.5 font-medium">Project</th><th className="px-2 py-1.5 font-medium">Incoming</th><th className="px-2 py-1.5 font-medium">Outgoing</th><th className="px-2 py-1.5 font-medium">Net</th></tr></thead>
                    <tbody>{byNet.map((p) => <tr key={p.slug} className="border-t border-[#f1f1f1]"><td className="px-2 py-1.5">{p.name}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(p.incoming)}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(p.outgoing)}</td><td className="px-2 py-1.5 text-right tabular-nums">{money(p.incoming - p.outgoing)}</td></tr>)}</tbody>
                  </table>
                }
              >
                {shownProjects.length ? <ProjectNetBars rows={shownProjects} /> : <p className="py-8 text-center text-sm text-[#8a8a8a]">No cashflow linked to projects in this period</p>}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
