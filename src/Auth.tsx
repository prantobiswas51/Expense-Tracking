import { useState, type FormEvent, type ReactNode } from 'react'
import AuthShell, { primaryButton } from './AuthShell'
import { supabase } from './supabase'

const inputClass =
  'w-full pl-10 pr-10 py-[0.65rem] bg-white border border-[#e8e8e8] text-[#1E1E1E] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(226,30,83,0.15)] disabled:opacity-60 disabled:cursor-not-allowed'

function Field({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[0.4rem]">
      <span className="text-[0.75rem] font-bold text-[#545454]">{label}</span>
      <span className="relative flex items-center">
        <i className={`fa-solid ${icon} absolute left-4 text-[0.9rem] text-[#545454] opacity-60`} aria-hidden />
        {children}
      </span>
    </label>
  )
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setInfo('')
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    const fullName = String(form.get('name') ?? '').trim()

    if (isSignup && password !== form.get('confirm')) return setError('Passwords do not match')

    setBusy(true)
    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)

    if (error) return setError(error.message)
    if (isSignup && !data.session) setInfo('Check your email to confirm your account, then sign in.')
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup')
    setError('')
    setInfo('')
  }

  const passType = showPass ? 'text' : 'password'

  return (
    <AuthShell title={isSignup ? 'Create account' : 'Welcome back'} subtitle={isSignup ? 'Sign up to get started' : 'Sign in to your account'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {isSignup && (
          <Field label="Name" icon="fa-user">
            <input name="name" type="text" required autoFocus maxLength={100} autoComplete="name" disabled={busy} placeholder="Your full name" className={inputClass} />
          </Field>
        )}

        <Field label="Email" icon="fa-envelope">
          <input name="email" type="email" required autoFocus={!isSignup} autoComplete="email" disabled={busy} placeholder="you@example.com" className={inputClass} />
        </Field>

        <Field label="Password" icon="fa-lock">
          <input
            name="password"
            type={passType}
            required
            minLength={8}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            disabled={busy}
            placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowPass((p) => !p)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
            className="absolute right-3 p-1 text-[0.85rem] text-[#545454] hover:text-[#1E1E1E]"
          >
            <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        </Field>

        {isSignup && (
          <Field label="Confirm password" icon="fa-lock">
            <input name="confirm" type={passType} required minLength={8} autoComplete="new-password" disabled={busy} placeholder="Repeat password" className={inputClass} />
          </Field>
        )}

        {error && <p role="alert" className="text-[0.75rem] font-semibold text-[#ef4444]">{error}</p>}
        {info && <p role="status" className="text-[0.75rem] font-semibold text-[#10b981]">{info}</p>}

        <button type="submit" disabled={busy} className={primaryButton}>
          <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : isSignup ? 'fa-user-plus' : 'fa-arrow-right-to-bracket'}`} />
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-center text-[0.78rem] font-medium text-[#545454]">
        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button type="button" onClick={switchMode} className="font-bold text-brand-600 hover:underline">
          {isSignup ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </AuthShell>
  )
}
