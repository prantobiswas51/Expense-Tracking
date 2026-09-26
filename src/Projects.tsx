import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { DueDate, EmptyState, ErrorBanner, FilterBar, FilterSelect, FormModal, PageHeader, RowActions, StatusBadge, friendly, inputClass, labelClass, primary, projectStatuses, tableWrap, td, th, type ProjectStatus } from './ui'

type Project = {
  id: string
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  created_at: string
  type_id: string | null
  type: { name: string } | null
  clients: { client: { id: string; name: string } | null }[]
}
type Category = { id: string; name: string }
type ClientOption = { id: string; name: string }

const clientIds = (p: Project) => p.clients.map((c) => c.client?.id).filter((id): id is string => Boolean(id))

function projectError(error: { code?: string; message: string }) {
  if (error.code === '23514' && error.message.includes('slug')) return 'Slug can only contain lowercase letters, numbers and single hyphens.'
  if (error.code === '23503') return 'That category no longer exists. Pick another.'
  return friendly(error, 'That slug is already used by another project.')
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('') // '' = all, 'none' = no type, else category id
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('') // '' = all, 'none' = no client, else client id

  async function load() {
    const [p, c, cl] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, slug, description, status, due_date, created_at, type_id, type:project_categories(name), clients:project_clients(client:clients(id, name))')
        .order('created_at', { ascending: false }),
      supabase.from('project_categories').select('id, name').order('name'),
      supabase.from('clients').select('id, name').order('name'),
    ])
    const failed = p.error ?? c.error ?? cl.error
    if (failed) return setError(projectError(failed))
    setProjects(p.data as unknown as Project[])
    setCategories(c.data ?? [])
    setClientOptions(cl.data ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  function open(target: Project | 'new') {
    setFormError('')
    setEditing(target)
  }

  async function save(form: FormData) {
    const name = String(form.get('name')).trim()
    const slug = String(form.get('slug')).trim().toLowerCase()
    const type_id = String(form.get('type_id')) || null
    const description = String(form.get('description')).trim() || null
    const status = String(form.get('status')) as ProjectStatus
    const due_date = String(form.get('due_date')) || null
    const selected = form.getAll('client_ids').map(String)
    setBusy(true)
    const saved = editing && editing !== 'new'
      ? await supabase.from('projects').update({ name, slug, description, status, due_date, type_id }).eq('id', editing.id).select('id').single()
      : await supabase.from('projects').insert({ name, description, status, due_date, type_id, ...(slug && { slug }) }).select('id').single()
    if (saved.error) {
      setBusy(false)
      return setFormError(projectError(saved.error))
    }

    // Sync client links: add newly ticked, remove unticked.
    const projectId = saved.data.id
    const before = editing && editing !== 'new' ? clientIds(editing) : []
    const toAdd = selected.filter((id) => !before.includes(id))
    const toRemove = before.filter((id) => !selected.includes(id))
    const results = await Promise.all([
      toAdd.length ? supabase.from('project_clients').insert(toAdd.map((client_id) => ({ project_id: projectId, client_id }))) : null,
      toRemove.length ? supabase.from('project_clients').delete().eq('project_id', projectId).in('client_id', toRemove) : null,
    ])
    setBusy(false)
    const linkError = results.find((r) => r?.error)?.error
    if (linkError) {
      void load()
      return setFormError(`Project saved, but updating its clients failed: ${linkError.message}`)
    }
    setEditing(null)
    setError('')
    void load()
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    if (error) return setError(projectError(error))
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null)
  }

  const current = editing && editing !== 'new' ? editing : null
  const currentClients = current ? clientIds(current) : []
  const needle = q.trim().toLowerCase()
  const visible = (projects ?? []).filter(
    (p) =>
      (!needle || p.name.toLowerCase().includes(needle)) &&
      (!typeFilter || (typeFilter === 'none' ? !p.type_id : p.type_id === typeFilter)) &&
      (!statusFilter || p.status === statusFilter) &&
      (!clientFilter || (clientFilter === 'none' ? p.clients.length === 0 : clientIds(p).includes(clientFilter))),
  )
  const clearFilters = () => { setQ(''); setTypeFilter(''); setStatusFilter(''); setClientFilter('') }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Create and manage your projects"
        action={<button onClick={() => open('new')} className={primary}><i className="fa-solid fa-plus mr-2" />New project</button>}
      />
      <ErrorBanner message={error} />

      {projects === null ? (
        !error && <p className="text-sm text-[#545454]">Loading…</p>
      ) : projects.length === 0 ? (
        <EmptyState message="No projects yet" />
      ) : (
        <>
        <FilterBar search={q} onSearch={setQ} placeholder="Search projects…" shown={visible.length} total={projects.length} onClear={clearFilters}>
          <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">No type</option>
          </FilterSelect>
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="">All</option>
            {Object.entries(projectStatuses).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </FilterSelect>
          {clientOptions.length > 0 && (
            <FilterSelect label="Client" value={clientFilter} onChange={setClientFilter}>
              <option value="">All</option>
              {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="none">No client</option>
            </FilterSelect>
          )}
        </FilterBar>
        {visible.length === 0 ? (
          <EmptyState message="No projects match your search or filters" />
        ) : (
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
              <tr><th className={th}>Name</th><th className={th}>Type</th><th className={th}>Status</th><th className={th}>Due</th><th className={th}>Created</th><th className={th} /></tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1f1]">
              {visible.map((p) => (
                <tr key={p.id} className="hover:bg-[rgba(226,30,83,0.04)]">
                  <td className={td}>
                    <a href={`#projects/${p.slug}`} className="font-semibold text-[#1E1E1E] hover:text-brand-600 hover:underline">{p.name}</a>
                    {p.description && <div className="mt-0.5 max-w-[16rem] truncate text-[0.78rem] text-[#545454]" title={p.description}>{p.description}</div>}
                    {p.clients.length > 0 && (
                      <div className="mt-0.5 max-w-[16rem] truncate text-[0.75rem] text-[#8a8a8a]">
                        <i className="fa-solid fa-user-tie mr-1" aria-hidden />{p.clients.map((c) => c.client?.name).filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    {p.type
                      ? <span className="inline-flex whitespace-nowrap rounded-full bg-[rgba(124,58,237,0.1)] px-2.5 py-0.5 text-xs font-bold text-violet-500">{p.type.name}</span>
                      : <span className="text-[#8a8a8a]">—</span>}
                  </td>
                  <td className={td}><StatusBadge status={p.status} /></td>
                  <td className={td}><DueDate due={p.due_date} status={p.status} /></td>
                  <td className={`${td} whitespace-nowrap text-[#545454]`} title={new Date(p.created_at).toLocaleString()}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <RowActions label={p.name} onEdit={() => open(p)} onDelete={() => remove(p)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </>
      )}

      {editing && (
        <FormModal title={current ? 'Edit project' : 'New project'} error={formError} busy={busy} onClose={() => setEditing(null)} onSubmit={save}>
          <label className="block">
            <span className={labelClass}>Name</span>
            <input name="name" required maxLength={200} autoFocus defaultValue={current?.name} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Description <span className="font-medium opacity-70">(optional)</span></span>
            <textarea name="description" rows={3} maxLength={2000} defaultValue={current?.description ?? ''} className={`${inputClass} resize-y`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Status</span>
              <select name="status" defaultValue={current?.status ?? 'started'} className={inputClass}>
                {Object.entries(projectStatuses).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Due date <span className="font-medium opacity-70">(optional)</span></span>
              <input name="due_date" type="date" defaultValue={current?.due_date ?? ''} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Type</span>
            <select name="type_id" defaultValue={current?.type_id ?? ''} className={inputClass}>
              <option value="">No type</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {categories.length === 0 && (
              <span className="mt-1 block text-[0.72rem] text-[#545454]">
                No categories yet. <a href="#categories" onClick={() => setEditing(null)} className="font-bold text-brand-600 hover:underline">Create one</a>
              </span>
            )}
          </label>
          <fieldset>
            <legend className={labelClass}>Clients <span className="font-medium opacity-70">(optional)</span></legend>
            {clientOptions.length ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#e8e8e8] bg-white p-2">
                {clientOptions.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[rgba(22,17,56,0.04)]">
                    <input type="checkbox" name="client_ids" value={c.id} defaultChecked={currentClients.includes(c.id)} className="h-4 w-4 accent-brand-500" />
                    {c.name}
                  </label>
                ))}
              </div>
            ) : (
              <span className="block text-[0.72rem] text-[#545454]">
                No clients yet. <a href="#clients" onClick={() => setEditing(null)} className="font-bold text-brand-600 hover:underline">Add one</a>
              </span>
            )}
          </fieldset>
          <label className="block">
            <span className={labelClass}>Slug {!current && <span className="font-medium opacity-70">(optional)</span>}</span>
            <input
              name="slug"
              required={!!current}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers and single hyphens"
              defaultValue={current?.slug}
              placeholder={current ? undefined : 'Auto-generated from name'}
              className={inputClass}
            />
          </label>
        </FormModal>
      )}
    </div>
  )
}
