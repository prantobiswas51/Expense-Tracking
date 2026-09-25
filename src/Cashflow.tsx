import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { DirectionBadge, EmptyState, ErrorBanner, FilterBar, FilterSelect, FormModal, PageHeader, RowActions, SignedAmount, friendly, inputClass, labelClass, money, primary, tableWrap, td, th, type Direction } from './ui'

type Entry = {
  id: string
  name: string
  amount: number
  created_at: string
  direction: Direction
  project_id: string | null
  project: { name: string } | null
}
type Option = { id: string; name: string }

function entryError(error: { code?: string; message: string }) {
  if (error.code === '23503') return 'The selected project no longer exists. Pick another.'
  if (error.code === '22003') return 'Amount is too large.'
  return friendly(error)
}

export default function Cashflow() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [projects, setProjects] = useState<Option[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Entry | 'new' | null>(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('') // '' | 'incoming' | 'outgoing'
  const [projectFilter, setProjectFilter] = useState('') // '' = all, 'none' = no project, else project id

  async function load() {
    const [e, p] = await Promise.all([
      supabase
        .from('cashflow')
        .select('id, name, amount, created_at, direction, project_id, project:projects(name)')
        .order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
    ])
    const failed = e.error ?? p.error
    if (failed) return setError(entryError(failed))
    setEntries(e.data as unknown as Entry[])
    setProjects(p.data ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  function open(target: Entry | 'new') {
    setFormError('')
    setEditing(target)
  }

  async function save(form: FormData) {
    const row = {
      name: String(form.get('name')).trim(),
      amount: Number(form.get('amount')),
      direction: String(form.get('direction')) as Direction,
      project_id: String(form.get('project_id')) || null,
    }
    setBusy(true)
    const { error } = editing && editing !== 'new'
      ? await supabase.from('cashflow').update(row).eq('id', editing.id)
      : await supabase.from('cashflow').insert(row)
    setBusy(false)
    if (error) return setFormError(entryError(error))
    setEditing(null)
    setError('')
    void load()
  }

  async function remove(entry: Entry) {
    if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('cashflow').delete().eq('id', entry.id)
    if (error) return setError(entryError(error))
    setEntries((list) => list?.filter((x) => x.id !== entry.id) ?? null)
  }

  const current = editing && editing !== 'new' ? editing : null
  const needle = q.trim().toLowerCase()
  const visible = (entries ?? []).filter(
    (e) =>
      (!needle || e.name.toLowerCase().includes(needle) || (e.project?.name.toLowerCase().includes(needle) ?? false)) &&
      (!typeFilter || e.direction === typeFilter) &&
      (!projectFilter || (projectFilter === 'none' ? !e.project_id : e.project_id === projectFilter)),
  )
  const sumOf = (d: Direction) => visible.filter((e) => e.direction === d).reduce((s, e) => s + Number(e.amount), 0)
  const inSum = sumOf('incoming'), outSum = sumOf('outgoing')
  const clearFilters = () => { setQ(''); setTypeFilter(''); setProjectFilter('') }

  return (
    <div>
      <PageHeader
        title="Cashflow"
        subtitle="Money in and out"
        action={<button onClick={() => open('new')} className={primary}><i className="fa-solid fa-plus mr-2" />New entry</button>}
      />
      <ErrorBanner message={error} />

      {entries === null ? (
        !error && <p className="text-sm text-[#545454]">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState message="No entries yet" />
      ) : (
        <>
        <FilterBar search={q} onSearch={setQ} placeholder="Search name or project…" shown={visible.length} total={entries.length} onClear={clearFilters}>
          <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter}>
            <option value="">All</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </FilterSelect>
          <FilterSelect label="Project" value={projectFilter} onChange={setProjectFilter}>
            <option value="">All</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="none">No project</option>
          </FilterSelect>
        </FilterBar>
        {visible.length === 0 ? (
          <EmptyState message="No entries match your search or filters" />
        ) : (
        <>
        <p className="mb-2 text-[0.78rem] text-[#545454]">
          <span className="font-bold text-[#10b981]">{money(inSum)}</span> in · <span className="font-bold text-[#ef4444]">{money(outSum)}</span> out · <span className="font-bold text-[#1E1E1E]">{money(inSum - outSum)}</span> net
        </p>
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
              <tr><th className={th}>Name</th><th className={th}>Type</th><th className={th}>Project</th><th className={`${th} text-right`}>Amount</th><th className={th}>Created</th><th className={th} /></tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1f1]">
              {visible.map((e) => (
                <tr key={e.id} className="hover:bg-[rgba(226,30,83,0.04)]">
                  <td className={`${td} font-semibold`}>{e.name}</td>
                  <td className={td}><DirectionBadge direction={e.direction} /></td>
                  <td className={td}>{e.project?.name ?? <span className="text-[#8a8a8a]">—</span>}</td>
                  <td className={`${td} text-right`}><SignedAmount amount={e.amount} direction={e.direction} /></td>
                  <td className={`${td} whitespace-nowrap text-[#545454]`}>{new Date(e.created_at).toLocaleString()}</td>
                  <RowActions label={e.name} onEdit={() => open(e)} onDelete={() => remove(e)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
        </>
      )}

      {editing && (
        <FormModal title={current ? 'Edit entry' : 'New entry'} error={formError} busy={busy} onClose={() => setEditing(null)} onSubmit={save}>
          <label className="block">
            <span className={labelClass}>Name</span>
            <input name="name" required maxLength={200} autoFocus defaultValue={current?.name} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Amount</span>
            <input name="amount" type="number" required step="0.01" min="-999999999999.99" max="999999999999.99" inputMode="decimal" defaultValue={current?.amount} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Type</span>
            <select name="direction" required defaultValue={current?.direction ?? 'incoming'} className={inputClass}>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Project <span className="font-medium opacity-70">(optional)</span></span>
            <select name="project_id" defaultValue={current?.project_id ?? ''} className={inputClass}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </FormModal>
      )}
    </div>
  )
}
