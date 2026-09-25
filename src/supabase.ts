import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const key = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

// Read auth-link info before the client consumes and clears the URL hash.
const hash = new URLSearchParams(window.location.hash.slice(1))
/** True when the page was opened from a password-reset email link. */
export const openedFromRecoveryLink = hash.get('type') === 'recovery'
/** Error from an expired/invalid email link, e.g. "Email link is invalid or has expired". */
export const authLinkError = hash.get('error_description')?.replace(/\+/g, ' ') ?? ''
if (authLinkError) window.history.replaceState(null, '', window.location.pathname)

export const supabase = createClient(url, key)
