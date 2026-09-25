import type { User } from '@supabase/supabase-js'
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { supabase } from './supabase'
import { Avatar, PageHeader, danger, inputClass, labelClass, primary } from './ui'

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

const BUCKET = 'avatars'

/** Center-crop to a square, resize, and re-encode (also drops EXIF data such as GPS location). */
async function toSquareImage(file: File, size = 256): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
  bmp.close()
  // Browsers that can't encode WebP (older Safari) fall back to PNG; blob.type tells us which.
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/webp', 0.85))
}

/** Delete every file in the user's avatar folder except `keep`. */
async function cleanFolder(userId: string, keep?: string) {
  const { data } = await supabase.storage.from(BUCKET).list(userId)
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep)
  if (old.length) await supabase.storage.from(BUCKET).remove(old)
}

function PictureSection({ user }: { user: User }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)
  const name: string = user.user_metadata.full_name || user.email || '?'
  const url: string | undefined = user.user_metadata.avatar_url

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    if (!file.type.startsWith('image/')) return setResult({ ok: false, text: 'Please choose an image file.' })
    if (file.size > 15 * 1024 * 1024) return setResult({ ok: false, text: 'That image is larger than 15 MB.' })

    setBusy(true)
    setResult(null)
    try {
      const blob = await toSquareImage(file)
      const path = `${user.id}/${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'png'}` // new name each time = no stale cache
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type })
      if (up.error) throw up.error
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      if (error) throw error
      await cleanFolder(user.id, path)
      setResult({ ok: true, text: 'Profile picture updated.' })
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setResult(null)
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } })
    if (!error) await cleanFolder(user.id)
    setBusy(false)
    setResult(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile picture removed.' })
  }

  return (
    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold">Profile picture</h2>
      <p className="mb-4 text-[0.75rem] text-[#545454]">PNG, JPEG or WebP. It's cropped to a square and resized to 256×256.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name} url={url} className="h-20 w-20 text-2xl" />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} className="hidden" aria-label="Choose profile picture" />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={primary}>
            <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`} />{busy ? 'Working…' : url ? 'Change picture' : 'Upload picture'}
          </button>
          {url && <button type="button" disabled={busy} onClick={remove} className={danger}>Remove</button>}
        </div>
      </div>
      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={`mt-3 text-[0.78rem] font-semibold ${result.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{result.text}</p>
      )}
    </div>
  )
}

export default function Profile({ user }: { user: User }) {
  return (
    <div>
      <PageHeader title="Profile" subtitle="Your picture, name, email and password" />
      <div className="grid max-w-2xl gap-4">
        <PictureSection user={user} />
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
