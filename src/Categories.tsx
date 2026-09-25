import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { EmptyState, ErrorBanner, FormModal, PageHeader, RowActions, friendly, inputClass, labelClass, primary, tableWrap, td, th } from './ui'

type Category = { id: string; name: string; created_at: string; usage: { count: number }[] }

type Props = {
  table: 'project_categories'
  usedBy: 'projects' // table whose rows point at this one, for the usage count
  title: string
  subtitle: string
  noun: string // e.g. "category", "type"
  usedByLabel: string // column header, e.g. "Projects", "Entries"
}

/** Name-only CRUD list (project categories). */
export default function Categories({ table, usedBy, title, subtitle, noun, usedByLabel }: Props) {
  const dup = `You already have a ${noun} with that name.`
  const [items, setItems] = useState<Category[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from(table).select(`id, name, created_at, usage:${usedBy}(count)`).order('name')
    if (error) return setError(friendly(error))
    setItems(data as unknown as Category[])
  }

  useEffect(() => {
    void load()
  }, [])

  function open(target: Category | 'new') {
    setFormError('')
    setEditing(target)
  }

  async function save(form: FormData) {
    const row = { name: String(form.get('name')).trim() }
    setBusy(true)
    const { error } = editing && editing !== 'new'
      ? await supabase.from(table).update(row).eq('id', editing.id)
      : await supabase.from(table).insert(row)
    setBusy(false)
    if (error) return setFormError(friendly(error, dup))
    setEditing(null)
    setError('')
    void load()
  }

  async function remove(c: Category) {
    const used = c.usage[0]?.count ?? 0
    const note = used ? ` ${used} ${usedByLabel.toLowerCase()} use it and will be left without a type.` : ''
    if (!confirm(`Delete ${noun} "${c.name}"?${note}`)) return
    const { error } = await supabase.from(table).delete().eq('id', c.id)
    if (error) return setError(friendly(error))
    setItems((list) => list?.filter((x) => x.id !== c.id) ?? null)
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={<button onClick={() => open('new')} className={primary}><i className="fa-solid fa-plus mr-2" />New {noun}</button>}
      />
      <ErrorBanner message={error} />

      {items === null ? (
        !error && <p className="text-sm text-[#545454]">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState message={`No ${noun} yet`} />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
              <tr><th className={th}>Name</th><th className={th}>{usedByLabel}</th><th className={th}>Created</th><th className={th} /></tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1f1]">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-[rgba(226,30,83,0.04)]">
                  <td className={`${td} font-semibold`}>{c.name}</td>
                  <td className={td}>{c.usage[0]?.count ?? 0}</td>
                  <td className={`${td} whitespace-nowrap text-[#545454]`}>{new Date(c.created_at).toLocaleString()}</td>
                  <RowActions label={c.name} onEdit={() => open(c)} onDelete={() => remove(c)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <FormModal title={`${editing === 'new' ? 'New' : 'Edit'} ${noun}`} error={formError} busy={busy} onClose={() => setEditing(null)} onSubmit={save}>
          <label className="block">
            <span className={labelClass}>Name</span>
            <input name="name" required maxLength={100} autoFocus defaultValue={editing === 'new' ? '' : editing.name} className={inputClass} />
          </label>
        </FormModal>
      )}
    </div>
  )
}
