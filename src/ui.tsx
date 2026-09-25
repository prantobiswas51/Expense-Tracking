import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const inputClass =
  'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm font-medium outline-none transition-all duration-200 focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(226,30,83,0.12)] disabled:opacity-60'
const btn = 'rounded-lg px-3.5 py-2 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50'
export const primary = `${btn} bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_12px_rgba(226,30,83,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(226,30,83,0.3)]`
export const secondary = `${btn} border border-[#e8e8e8] bg-white text-[#545454] hover:bg-[rgba(22,17,56,0.04)] hover:text-[#1E1E1E]`
export const danger = `${btn} border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[#ef4444] hover:text-white`
export const badgeClass = 'inline-flex whitespace-nowrap rounded-full bg-[rgba(124,58,237,0.1)] px-2.5 py-0.5 text-xs font-bold text-violet-500'
export const money = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const projectStatuses = {
  started: { label: 'Started', className: 'bg-[rgba(59,130,246,0.12)] text-[#2563eb]' },
  in_progress: { label: 'In Progress', className: 'bg-[rgba(234,179,8,0.15)] text-[#b45309]' },
  cancelled: { label: 'Cancelled', className: 'bg-[rgba(22,17,56,0.06)] text-[#545454]' },
  completed: { label: 'Completed', className: 'bg-[rgba(16,185,129,0.12)] text-[#10b981]' },
} as const
export type ProjectStatus = keyof typeof projectStatuses

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = projectStatuses[status] ?? projectStatuses.started
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${s.className}`}>{s.label}</span>
}

/** Due date text; red when past due and the project is still open. `due` is a YYYY-MM-DD string. */
export function DueDate({ due, status }: { due: string | null; status: ProjectStatus }) {
  if (!due) return <span className="text-[#8a8a8a]">—</span>
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  const overdue = due < today && (status === 'started' || status === 'in_progress')
  const text = new Date(`${due}T00:00:00`).toLocaleDateString()
  return <span className={`whitespace-nowrap ${overdue ? 'font-bold text-[#ef4444]' : ''}`} title={overdue ? 'Overdue' : undefined}>{text}{overdue && ' · overdue'}</span>
}

export function StatCard({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[0.8rem] font-bold text-[#545454]">
        <i className={`fa-solid ${icon} ${tone}`} />{label}
      </div>
      <div className={`mt-1 break-words text-2xl font-black tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}

export type Direction = 'incoming' | 'outgoing'

export function DirectionBadge({ direction }: { direction: Direction }) {
  return direction === 'incoming'
    ? <span className="inline-flex whitespace-nowrap rounded-full bg-[rgba(16,185,129,0.12)] px-2.5 py-0.5 text-xs font-bold text-[#10b981]"><i className="fa-solid fa-arrow-down mr-1" />Incoming</span>
    : <span className="inline-flex whitespace-nowrap rounded-full bg-[rgba(239,68,68,0.12)] px-2.5 py-0.5 text-xs font-bold text-[#ef4444]"><i className="fa-solid fa-arrow-up mr-1" />Outgoing</span>
}

/** Amount with sign and colour for its direction. */
export function SignedAmount({ amount, direction }: { amount: number; direction: Direction }) {
  const incoming = direction === 'incoming'
  return <span className={`font-bold tabular-nums ${incoming ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{incoming ? '+' : '−'}{money(amount)}</span>
}

/** Search box + filter selects in one row above a table, with a result count and Clear. */
export function FilterBar({ search, onSearch, placeholder, shown, total, onClear, children }: {
  search: string
  onSearch: (v: string) => void
  placeholder: string
  shown: number
  total: number
  onClear: () => void
  children?: ReactNode
}) {
  const filtered = shown !== total
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="relative w-full sm:w-64">
        <span className="sr-only">Search</span>
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] text-[#8a8a8a]" aria-hidden />
        <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className={`${inputClass} pl-9`} />
      </label>
      {children}
      <span className="text-[0.75rem] text-[#545454]">{filtered ? `${shown} of ${total}` : `${total} total`}</span>
      {filtered && (
        <button type="button" onClick={onClear} className="text-[0.75rem] font-bold text-brand-600 hover:underline">Clear filters</button>
      )}
    </div>
  )
}

/** Compact labelled select for FilterBar. */
export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[0.75rem] font-bold text-[#545454]">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} w-auto py-1.5`}>{children}</select>
    </label>
  )
}

/** Round profile picture, falling back to the name's initial on a gradient. */
export function Avatar({ name, url, className = 'h-8 w-8 text-[0.8rem]' }: { name: string; url?: string | null; className?: string }) {
  const base = `flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-violet-500 font-black text-white ${className}`
  return url
    ? <img src={url} alt="" className={`${base} object-cover`} />
    : <span className={base} aria-hidden>{name.charAt(0).toUpperCase()}</span>
}

export const labelClass = 'mb-1 block text-[0.75rem] font-bold text-[#545454]'

export function friendly(error: { code?: string; message: string }, duplicate = 'That value is already used.') {
  if (error.code === '23505') return duplicate
  if (error.code === '23514') return 'Some values are not in the allowed format.'
  if (error.code === 'PGRST205' || error.code === '42P01') return 'A table is missing. Run the latest migrations (restart npm run dev or npm run db:push).'
  return error.message
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[1.35rem] font-black tracking-[-0.02em]">{title}</h1>
        <p className="mt-1 text-[0.8rem] font-medium text-[#545454]">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm font-semibold text-[#ef4444]">
      <i className="fa-solid fa-circle-exclamation" />{message}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e8e8e8] py-12 text-sm text-[#545454]">{message}</div>
}

export const tableWrap = 'overflow-x-auto rounded-xl border border-[#e8e8e8] bg-white shadow-sm'
export const th = 'px-4 py-3 font-medium'
export const td = 'px-4 py-3'

export function RowActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-right">
      <button onClick={onEdit} className={`${secondary} mr-2`} aria-label={`Edit ${label}`}><i className="fa-solid fa-pen" /></button>
      <button onClick={onDelete} className={danger} aria-label={`Delete ${label}`}><i className="fa-solid fa-trash" /></button>
    </td>
  )
}

/** Closes only via × or Cancel, like the reference ERP, so a stray click never loses typed input. */
export function FormModal({ title, error, busy, onClose, onSubmit, children }: {
  title: string
  error: string
  busy: boolean
  onClose: () => void
  onSubmit: (form: FormData) => void
  children: ReactNode
}) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div role="dialog" aria-modal="true" aria-labelledby="form-modal-title" className="w-full max-w-md rounded-xl border border-[#e8e8e8] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-5 py-4">
          <h2 id="form-modal-title" className="text-sm font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#8a8a8a] hover:bg-[rgba(22,17,56,0.06)] hover:text-[#1E1E1E]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)) }}
          className="flex flex-col gap-4 px-5 py-4"
        >
          <fieldset disabled={busy} className="flex flex-col gap-4">{children}</fieldset>
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
