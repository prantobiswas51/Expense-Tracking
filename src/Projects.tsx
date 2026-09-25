import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabase'

type Project = { id: string; name: string; slug: string; created_at: string }

const inputClass =
  'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm font-medium outline-none transition-all duration-200 focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(226,30,83,0.12)] disabled:opacity-60'
const btn = 'rounded-lg px-3.5 py-2 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50'
const primary = `${btn} bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_12px_rgba(226,30,83,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(226,30,83,0.3)]`
const secondary = `${btn} border border-[#e8e8e8] bg-white text-[#545454] hover:bg-[rgba(22,17,56,0.04)] hover:text-[#1E1E1E]`
const danger = `${btn} border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[#ef4444] hover:text-white`

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return 'That slug is already used by another project.'
  if (error.code === '23514') return 'Slug can only contain lowercase letters, numbers and single hyphens.'
  if (error.code === 'PGRST205' || error.code === '42P01') return 'The projects table does not exist yet. Run the migration in Supabase first.'
  return error.message
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Project | 'new' | null>(null)

  async function load() {
    const { data, error } = await supabase.from('projects').select('id, name, slug, created_at').order('created_at', { ascending: false })
    if (error) return setError(friendly(error))
    setProjects(data)
  }

  useEffect(() => {
    load()
  }, [])

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    if (error) return setError(friendly(error))
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.35rem] font-black tracking-[-0.02em]">Projects</h1>
          <p className="mt-1 text-[0.8rem] font-medium text-[#545454]">Create and manage your projects</p>
        </div>
        <button onClick={() => setEditing('new')} className={primary}>
          <i className="fa-solid fa-plus mr-2" />New project
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm font-semibold text-[#ef4444]">
          <i className="fa-solid fa-circle-exclamation" />{error}
        </div>
      )}

      {projects === null ? (
        !error && <p className="text-sm text-[#545454]">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e8e8e8] py-12 text-sm text-[#545454]">No projects yet</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1f1]">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-[rgba(226,30,83,0.04)]">
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3"><code className="rounded bg-[rgba(22,17,56,0.05)] px-1.5 py-0.5 text-[0.8rem] text-brand-600">{p.slug}</code></td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#545454]">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button onClick={() => setEditing(p)} className={`${secondary} mr-2`} aria-label={`Edit ${p.name}`}><i className="fa-solid fa-pen" /></button>
                    <button onClick={() => remove(p)} className={danger} aria-label={`Delete ${p.name}`}><i className="fa-solid fa-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProjectForm
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setError(''); load() }}
        />
      )}
    </div>
  )
}

function ProjectForm({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name')).trim()
    const slug = String(form.get('slug')).trim().toLowerCase()

    setBusy(true)
    const { error } = project
      ? await supabase.from('projects').update({ name, slug }).eq('id', project.id)
      : await supabase.from('projects').insert(slug ? { name, slug } : { name })
    setBusy(false)

    if (error) return setError(friendly(error))
    onSaved()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div role="dialog" aria-modal="true" aria-labelledby="project-form-title" className="w-full max-w-md rounded-xl border border-[#e8e8e8] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-5 py-4">
          <h2 id="project-form-title" className="text-sm font-bold">{project ? 'Edit project' : 'New project'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#8a8a8a] hover:bg-[rgba(22,17,56,0.06)] hover:text-[#1E1E1E]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-bold text-[#545454]">Name</span>
            <input name="name" required maxLength={200} autoFocus defaultValue={project?.name} disabled={busy} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-bold text-[#545454]">Slug {!project && <span className="font-medium opacity-70">(optional)</span>}</span>
            <input
              name="slug"
              required={!!project}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers and single hyphens"
              defaultValue={project?.slug}
              placeholder={project ? undefined : 'Auto-generated from name'}
              disabled={busy}
              className={inputClass}
            />
          </label>
          {error && <p role="alert" className="text-[0.75rem] font-semibold text-[#ef4444]">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#f1f1f1] pt-4">
            <button type="button" onClick={onClose} className={secondary}>Cancel</button>
            <button type="submit" disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
