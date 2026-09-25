import { useState, type FormEvent } from 'react'
import AuthShell, { primaryButton } from './AuthShell'
import { supabase } from './supabase'

const inputClass =
  'w-full px-3 py-[0.65rem] bg-white border border-[#e8e8e8] text-[#1E1E1E] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(226,30,83,0.15)] disabled:opacity-60'

/** Shown after the user opens a password-reset link (they are signed in with a recovery session). */
export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const password = String(form.get('password'))
    if (password !== form.get('confirm')) return setError('Passwords do not match')

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)

    window.history.replaceState(null, '', window.location.pathname)
    onDone()
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-[0.4rem]">
          <span className="text-[0.75rem] font-bold text-[#545454]">New password</span>
          <input name="password" type="password" required minLength={8} autoFocus autoComplete="new-password" disabled={busy} placeholder="At least 8 characters" className={inputClass} />
        </label>
        <label className="flex flex-col gap-[0.4rem]">
          <span className="text-[0.75rem] font-bold text-[#545454]">Confirm new password</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" disabled={busy} placeholder="Repeat password" className={inputClass} />
        </label>

        {error && <p role="alert" className="text-[0.75rem] font-semibold text-[#ef4444]">{error}</p>}

        <button type="submit" disabled={busy} className={primaryButton}>
          <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-key'}`} />
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
      <p className="mt-6 text-center text-[0.78rem] font-medium text-[#545454]">
        Changed your mind?{' '}
        <button type="button" onClick={() => supabase.auth.signOut()} className="font-bold text-brand-600 hover:underline">Cancel and sign out</button>
      </p>
    </AuthShell>
  )
}
