import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { EmptyState, ErrorBanner, FilterBar, FilterSelect, FormModal, PageHeader, RowActions, StatCard, friendly, inputClass, labelClass, money, primary, tableWrap, td, th } from './ui'

type Kind = 'lent' | 'borrowed'
type ClientOption = { id: string; name: string; company: string | null }
type Loan = {
  id: string
  client_id: string
  client: ClientOption | null
  kind: Kind
  amount: number
  repaid: number
  loan_date: string
  due_date: string | null
  notes: string | null
}

const clientLabel = (c: ClientOption | null) => (c ? (c.company ? `${c.name} (${c.company})` : c.name) : 'Unknown client')
const optional = <span className="font-medium opacity-70">(optional)</span>
const today = () => new Date().toLocaleDateString('en-CA')
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString()

function KindBadge({ kind }: { kind: Kind }) {
  return kind === 'lent'
    ? <span className="inline-flex whitespace-nowrap rounded-full bg-[rgba(16,185,129,0.12)] px-2.5 py-0.5 text-xs font-bold text-[#10b981]"><i className="fa-solid fa-arrow-up-right-from-square mr-1" />Lent</span>
    : <span className="inline-flex whitespace-nowrap rounded-full bg-[rgba(239,68,68,0.12)] px-2.5 py-0.5 text-xs font-bold text-[#ef4444]"><i className="fa-solid fa-hand-holding-dollar mr-1" />Borrowed</span>
}

export default function Loans() {
  const [loans, setLoans] = useState<Loan[] | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Loan | 'new' | null>(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('')
  const [state, setState] = useState('')

  async function load() {
    const [{ data, error }, clientRes] = await Promise.all([
      supabase
        .from('loans')
        .select('id, client_id, kind, amount, repaid, loan_date, due_date, notes, client:clients(id, name, company)')
        .order('loan_date', { ascending: false }),
      supabase.from('clients').select('id, name, company').order('name'),
    ])
    if (error) return setError(friendly(error))
    if (clientRes.error) return setError(friendly(clientRes.error))
    setClients(clientRes.data)
    setLoans((data as unknown as Loan[]).map((l) => ({ ...l, amount: Number(l.amount), repaid: Number(l.repaid) })))
  }

  useEffect(() => {
    void load()
  }, [])

  function open(target: Loan | 'new') {
    setFormError('')
    setEditing(target)
  }

  async function save(form: FormData) {
    const text = (k: string) => String(form.get(k) ?? '').trim() || null
    const row = {
      client_id: String(form.get('client_id')),
      kind: String(form.get('kind')) as Kind,
      amount: Number(form.get('amount')),
      repaid: Number(form.get('repaid') || 0),
      loan_date: String(form.get('loan_date')),
      due_date: text('due_date'),
      notes: text('notes'),
    }
    if (row.repaid > row.amount) return setFormError('Repaid cannot be more than the loan amount.')
    if (row.due_date && row.due_date < row.loan_date) return setFormError('Due date cannot be before the loan date.')
    setBusy(true)
    const { error } = editing && editing !== 'new'
      ? await supabase.from('loans').update(row).eq('id', editing.id)
      : await supabase.from('loans').insert(row)
    setBusy(false)
    if (error) return setFormError(friendly(error))
    setEditing(null)
    setError('')
    void load()
  }

  async function remove(l: Loan) {
    if (!confirm(`Delete the loan with "${l.client?.name ?? 'this client'}"?`)) return
    const { error } = await supabase.from('loans').delete().eq('id', l.id)
    if (error) return setError(friendly(error))
    setLoans((list) => list?.filter((x) => x.id !== l.id) ?? null)
  }

  const current = editing && editing !== 'new' ? editing : null
  const settled = (l: Loan) => l.repaid >= l.amount
  // Matches the amount as typed ("1500", "1500.5") or as displayed ("1,500.00").
  const amountText = (l: Loan) => `${l.amount} ${money(l.amount).replace(/,/g, '')}`
  const needle = q.trim().toLowerCase()
  const visible = (loans ?? []).filter(
    (l) =>
      (!kind || l.kind === kind) &&
      (!state || (state === 'settled') === settled(l)) &&
      (!needle || clientLabel(l.client).toLowerCase().includes(needle) || l.notes?.toLowerCase().includes(needle) || amountText(l).includes(needle.replace(/,/g, ''))),
  )
  const owed = (k: Kind) => (loans ?? []).filter((l) => l.kind === k).reduce((s, l) => s + l.amount - l.repaid, 0)
  const toReceive = owed('lent'), toPay = owed('borrowed')

  return (
    <div>
      <PageHeader
        title="Loans"
        subtitle="Money you lent or borrowed"
        action={<button onClick={() => open('new')} className={primary}><i className="fa-solid fa-plus mr-2" />New loan</button>}
      />
      <ErrorBanner message={error} />

      {loans === null ? (
        !error && <p className="text-sm text-[#545454]">Loading…</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="To receive" value={money(toReceive)} tone="text-[#10b981]" icon="fa-arrow-down" />
            <StatCard label="To pay" value={money(toPay)} tone="text-[#ef4444]" icon="fa-arrow-up" />
            <StatCard label="Net" value={money(toReceive - toPay)} tone={toReceive - toPay < 0 ? 'text-[#ef4444]' : 'text-[#1E1E1E]'} icon="fa-scale-balanced" />
          </div>

          {loans.length === 0 ? (
            <EmptyState message="No loans yet" />
          ) : (
            <>
              <FilterBar search={q} onSearch={setQ} placeholder="Search client, amount, notes…" shown={visible.length} total={loans.length} onClear={() => { setQ(''); setKind(''); setState('') }}>
                <FilterSelect label="Type" value={kind} onChange={setKind}>
                  <option value="">All</option><option value="lent">Lent</option><option value="borrowed">Borrowed</option>
                </FilterSelect>
                <FilterSelect label="Status" value={state} onChange={setState}>
                  <option value="">All</option><option value="open">Open</option><option value="settled">Settled</option>
                </FilterSelect>
              </FilterBar>
              {visible.length === 0 ? (
                <EmptyState message="No loans match your filters" />
              ) : (
                <div className={tableWrap}>
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#e8e8e8] text-left text-[#545454]">
                      <tr><th className={th}>Client</th><th className={th}>Type</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Repaid</th><th className={`${th} text-right`}>Remaining</th><th className={th}>Date</th><th className={th}>Due</th><th className={th} /></tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f1f1]">
                      {visible.map((l) => {
                        const done = settled(l)
                        const overdue = !done && l.due_date !== null && l.due_date < today()
                        return (
                          <tr key={l.id} className="align-top hover:bg-[rgba(226,30,83,0.04)]">
                            <td className={td}>
                              <div className="font-semibold">{l.client?.name ?? 'Unknown client'}</div>
                              {l.client?.company && <div className="text-[0.78rem] text-[#545454]">{l.client.company}</div>}
                              {l.notes && <div className="max-w-xs truncate text-[0.78rem] text-[#545454]" title={l.notes}>{l.notes}</div>}
                            </td>
                            <td className={td}><KindBadge kind={l.kind} /></td>
                            <td className={`${td} text-right tabular-nums`}>{money(l.amount)}</td>
                            <td className={`${td} text-right tabular-nums`}>{money(l.repaid)}</td>
                            <td className={`${td} text-right font-bold tabular-nums`}>
                              {done ? <span className="text-[#10b981]">Settled</span> : money(l.amount - l.repaid)}
                            </td>
                            <td className={`${td} whitespace-nowrap`}>{fmtDate(l.loan_date)}</td>
                            <td className={`${td} whitespace-nowrap`}>
                              {l.due_date ? <span className={overdue ? 'font-bold text-[#ef4444]' : ''}>{fmtDate(l.due_date)}{overdue && ' · overdue'}</span> : <span className="text-[#8a8a8a]">—</span>}
                            </td>
                            <RowActions label={l.client?.name ?? 'loan'} onEdit={() => open(l)} onDelete={() => remove(l)} />
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {editing && (
        <FormModal title={current ? 'Edit loan' : 'New loan'} error={formError} busy={busy} onClose={() => setEditing(null)} onSubmit={save}>
          <label className="block">
            <span className={labelClass}>Client</span>
            <select name="client_id" required autoFocus defaultValue={current?.client_id ?? ''} className={inputClass}>
              <option value="" disabled>Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
            </select>
            {clients.length === 0 && (
              <span className="mt-1 block text-[0.75rem] text-[#545454]">No clients yet. <a href="#clients" className="font-bold text-brand-600 hover:underline">Add one in Clients</a> first.</span>
            )}
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Type</span>
              <select name="kind" required defaultValue={current?.kind ?? 'lent'} className={inputClass}>
                <option value="lent">I lent money</option>
                <option value="borrowed">I borrowed money</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Amount</span>
              <input name="amount" type="number" required min="0.01" step="0.01" defaultValue={current?.amount} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Repaid so far {optional}</span>
            <input name="repaid" type="number" min="0" step="0.01" defaultValue={current?.repaid ?? 0} className={inputClass} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Loan date</span>
              <input name="loan_date" type="date" required defaultValue={current?.loan_date ?? today()} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Due date {optional}</span>
              <input name="due_date" type="date" defaultValue={current?.due_date ?? ''} className={inputClass} />
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
