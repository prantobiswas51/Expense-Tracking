import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { DirectionBadge, DueDate, EmptyState, ErrorBanner, SignedAmount, StatCard, StatusBadge, badgeClass, friendly, money, tableWrap, td, th, type Direction, type ProjectStatus } from './ui'

type Project = {
  id: string
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  created_at: string
  type: { name: string } | null
}
type Entry = { id: string; name: string; amount: number; created_at: string; direction: Direction }

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-extrabold uppercase tracking-wider text-[#545454] opacity-70">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  )
}

export default function ProjectView({ slug }: { slug: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: p, error: pErr } = await supabase
        .from('projects')
        .select('id, name, slug, description, status, due_date, created_at, type:project_categories(name)')
        .eq('slug', slug)
        .maybeSingle()
      if (pErr) return setError(friendly(pErr))
      if (!p) return setError('Project not found.')
      setProject(p as unknown as Project)

      const { data: e, error: eErr } = await supabase
        .from('cashflow')
        .select('id, name, amount, created_at, direction')
        .eq('project_id', p.id)
        .order('created_at', { ascending: false })
      if (eErr) return setError(friendly(eErr))
      setEntries(e as unknown as Entry[])
    }
    void load()
  }, [slug])

  const sum = (keep: (e: Entry) => boolean) => entries?.filter(keep).reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const incoming = sum((e) => e.direction === 'incoming')
  const outgoing = sum((e) => e.direction === 'outgoing')
  const leftover = incoming - outgoing

  return (
    <div>
      <a href="#projects" className="mb-4 inline-flex items-center gap-2 text-[0.8rem] font-bold text-[#545454] hover:text-brand-600">
        <i className="fa-solid fa-arrow-left" />All projects
      </a>
      <ErrorBanner message={error} />

      {project && (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[1.35rem] font-black tracking-[-0.02em]">{project.name}</h1>
              {project.description && <p className="mt-1 max-w-3xl whitespace-pre-line text-[0.85rem] text-[#545454]">{project.description}</p>}
            </div>
            {project.type && <span className={badgeClass}>{project.type.name}</span>}
          </div>

          <dl className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
            <Detail label="Status"><StatusBadge status={project.status} /></Detail>
            <Detail label="Due date"><DueDate due={project.due_date} status={project.status} /></Detail>
            <Detail label="Type">{project.type?.name ?? <span className="text-[#8a8a8a]">—</span>}</Detail>
            <Detail label="Slug"><code className="text-brand-600">{project.slug}</code></Detail>
            <Detail label="Created">{new Date(project.created_at).toLocaleString()}</Detail>
          </dl>

          {entries && (
            <div className="mb-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Incoming" value={money(incoming)} tone="text-[#10b981]" icon="fa-arrow-down" />
                <StatCard label="Outgoing" value={money(outgoing)} tone="text-[#ef4444]" icon="fa-arrow-up" />
                <StatCard label="Leftover" value={money(leftover)} tone={leftover < 0 ? 'text-[#ef4444]' : 'text-[#1E1E1E]'} icon="fa-scale-balanced" />
              </div>
            </div>
          )}

          <h2 className="mb-3 text-sm font-bold text-[#3f3f3f]">
            Cashflow {entries && <span className="font-medium text-[#8a8a8a]">({entries.length})</span>}
          </h2>
          {entries === null ? (
            !error && <p className="text-sm text-[#545454]">Loading…</p>
          ) : entries.length === 0 ? (
            <EmptyState message="No cashflow entries for this project yet" />
          ) : (
            <div className={tableWrap}>
              <table className="w-full text-sm">
                <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
                  <tr><th className={th}>Name</th><th className={th}>Direction</th><th className={`${th} text-right`}>Amount</th><th className={th}>Created</th></tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1]">
                  {entries.map((e) => (
                    <tr key={e.id} className="hover:bg-[rgba(226,30,83,0.04)]">
                      <td className={`${td} font-semibold`}>{e.name}</td>
                      <td className={td}><DirectionBadge direction={e.direction} /></td>
                      <td className={`${td} text-right`}><SignedAmount amount={e.amount} direction={e.direction} /></td>
                      <td className={`${td} whitespace-nowrap text-[#545454]`}>{new Date(e.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[#e8e8e8]">
                  <tr>
                    <td className={`${td} font-bold`} colSpan={2}>Leftover</td>
                    <td className={`${td} text-right font-black tabular-nums`}>{money(leftover)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
