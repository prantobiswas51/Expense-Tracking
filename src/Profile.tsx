import type { User } from '@supabase/supabase-js'
import { useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from './supabase'
import { PageHeader, inputClass, labelClass, primary } from './ui'

type Result = { ok: boolean; text: string } | null

/** One card per setting, each with its own submit + message. */
function Section({ title, subtitle, onSubmit, children }: {
  title: string
  subtitle: string
  onSubmit: (form: FormData) => Promise<Result>
  children: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setBusy(true)
    setResult(null)
    const r = await onSubmit(new FormData(formEl))
    setBusy(false)
    setResult(r)
    if (r?.ok) formEl.querySelectorAll<HTMLInputElement>('input[type=password]').forEach((i) => (i.value = ''))
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold">{title}</h2>
      <p className="mb-4 text-[0.75rem] text-[#545454]">{subtitle}</p>
      <fieldset disabled={busy} className="flex flex-col gap-4">{children}</fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save'}</button>
        {result && (
          <p role={result.ok ? 'status' : 'alert'} className={`text-[0.78rem] font-semibold ${result.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {result.text}
          </p>
        )}
      </div>
    </form>
  )
}

export default function Profile({ user }: { user: User }) {
  return (
    <div>
      <PageHeader title="Profile" subtitle="Your name, email and password" />
      <div className="grid max-w-2xl gap-4">
        <Section
          title="Name"
          subtitle="Shown in the sidebar and header."
          onSubmit={async (form) => {
            const full_name = String(form.get('full_name')).trim()
            if (!full_name) return { ok: false, text: 'Name cannot be empty.' }
            const { error } = await supabase.auth.updateUser({ data: { full_name } })
            return error ? { ok: false, text: error.message } : { ok: true, text: 'Name updated.' }
          }}
        >
          <label className="block">
            <span className={labelClass}>Full name</span>
            <input name="full_name" required maxLength={100} autoComplete="name" defaultValue={user.user_metadata.full_name ?? ''} className={inputClass} />
          </label>
        </Section>

        <Section
          title="Email"
          subtitle="You'll get a confirmation link; the change applies after you click it."
          onSubmit={async (form) => {
            const email = String(form.get('email')).trim()
            if (email === user.email) return { ok: false, text: 'That is already your email.' }
            const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.origin })
            return error
              ? { ok: false, text: error.message }
              : { ok: true, text: `Check ${email} (and your current inbox) for a confirmation link.` }
          }}
        >
          <label className="block">
            <span className={labelClass}>Email</span>
            <input name="email" type="email" required autoComplete="email" defaultValue={user.email ?? ''} className={inputClass} />
          </label>
          {user.new_email && (
            <p className="text-[0.75rem] text-[#b45309]">Pending change to <strong>{user.new_email}</strong>. Confirm it from your inbox.</p>
          )}
        </Section>

        <Section
          title="Password"
          subtitle="At least 8 characters."
          onSubmit={async (form) => {
            const password = String(form.get('password'))
            if (password !== form.get('confirm')) return { ok: false, text: 'Passwords do not match.' }
            const { error } = await supabase.auth.updateUser({ password })
            return error ? { ok: false, text: error.message } : { ok: true, text: 'Password changed.' }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>New password</span>
              <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Confirm new password</span>
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </label>
          </div>
        </Section>
      </div>
    </div>
  )
}
