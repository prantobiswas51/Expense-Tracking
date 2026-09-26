import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { EmptyState, ErrorBanner, FilterBar, FormModal, PageHeader, RowActions, friendly, inputClass, labelClass, primary, tableWrap, td, th } from './ui'

type Client = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  projects: { project: { name: string; slug: string } | null }[]
}

const optional = <span className="font-medium opacity-70">(optional)</span>

export default function Clients() {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, company, email, phone, notes, created_at, projects:project_clients(project:projects(name, slug))')
      .order('name')
    if (error) return setError(friendly(error))
    setClients(data as unknown as Client[])
  }

  useEffect(() => {
    void load()
  }, [])

  function open(target: Client | 'new') {
    setFormError('')
    setEditing(target)
  }

  async function save(form: FormData) {
    const text = (k: string) => String(form.get(k) ?? '').trim() || null
    const row = { name: String(form.get('name')).trim(), company: text('company'), email: text('email'), phone: text('phone'), notes: text('notes') }
    setBusy(true)
    const { error } = editing && editing !== 'new'
      ? await supabase.from('clients').update(row).eq('id', editing.id)
      : await supabase.from('clients').insert(row)
    setBusy(false)
    if (error) return setFormError(friendly(error))
    setEditing(null)
    setError('')
    void load()
  }

  async function remove(c: Client) {
    const n = c.projects.length
    const note = n ? ` They'll be removed from ${n} project${n === 1 ? '' : 's'} (the projects stay).` : ''
    if (!confirm(`Delete client "${c.name}"?${note}`)) return
    const { error } = await supabase.from('clients').delete().eq('id', c.id)
    if (error) return setError(friendly(error))
    setClients((list) => list?.filter((x) => x.id !== c.id) ?? null)
  }

  const current = editing && editing !== 'new' ? editing : null
  const needle = q.trim().toLowerCase()
  const visible = (clients ?? []).filter(
    (c) => !needle || [c.name, c.company, c.email, c.phone].some((v) => v?.toLowerCase().includes(needle)),
  )

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="People and companies you work with"
        action={<button onClick={() => open('new')} className={primary}><i className="fa-solid fa-plus mr-2" />New client</button>}
      />
      <ErrorBanner message={error} />

      {clients === null ? (
        !error && <p className="text-sm text-[#545454]">Loading…</p>
      ) : clients.length === 0 ? (
        <EmptyState message="No clients yet" />
      ) : (
        <>
          <FilterBar search={q} onSearch={setQ} placeholder="Search name, company, email, phone…" shown={visible.length} total={clients.length} onClear={() => setQ('')} />
          {visible.length === 0 ? (
            <EmptyState message="No clients match your search" />
          ) : (
            <div className={tableWrap}>
              <table className="w-full text-sm">
                <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
                  <tr><th className={th}>Name</th><th className={th}>Contact</th><th className={th}>Projects</th><th className={th} /></tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1]">
                  {visible.map((c) => (
                    <tr key={c.id} className="align-top hover:bg-[rgba(226,30,83,0.04)]">
                      <td className={td}>
                        <div className="font-semibold">{c.name}</div>
                        {c.company && <div className="text-[0.78rem] text-[#545454]">{c.company}</div>}
                      </td>
                      <td className={`${td} text-[0.8rem]`}>
                        {c.email && <a href={`mailto:${c.email}`} className="block text-brand-600 hover:underline">{c.email}</a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="block text-[#545454] hover:underline">{c.phone}</a>}
                        {!c.email && !c.phone && <span className="text-[#8a8a8a]">—</span>}
                      </td>
                      <td className={td}>
                        {c.projects.length ? (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {c.projects.map(({ project }) => project && (
                              <a key={project.slug} href={`#projects/${project.slug}`} className="rounded-full bg-[rgba(22,17,56,0.05)] px-2 py-0.5 text-xs font-semibold text-[#3f3f3f] hover:text-brand-600">{project.name}</a>
                            ))}
                          </div>
                        ) : <span className="text-[#8a8a8a]">—</span>}
                      </td>
                      <RowActions label={c.name} onEdit={() => open(c)} onDelete={() => remove(c)} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && (
        <FormModal title={current ? 'Edit client' : 'New client'} error={formError} busy={busy} onClose={() => setEditing(null)} onSubmit={save}>
          <label className="block">
            <span className={labelClass}>Name</span>
            <input name="name" required maxLength={200} autoFocus defaultValue={current?.name} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Company {optional}</span>
            <input name="company" maxLength={200} defaultValue={current?.company ?? ''} className={inputClass} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Email {optional}</span>
              <input name="email" type="email" maxLength={320} defaultValue={current?.email ?? ''} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Phone {optional}</span>
              <input name="phone" type="tel" maxLength={50} defaultValue={current?.phone ?? ''} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Notes {optional}</span>
            <textarea name="notes" rows={3} maxLength={2000} defaultValue={current?.notes ?? ''} className={`${inputClass} resize-y`} />
          </label>
        </FormModal>
      )}
    </div>
  )
}
