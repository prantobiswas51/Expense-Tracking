import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Auth from './Auth'
import Dashboard from './Dashboard'
import ResetPassword from './ResetPassword'
import { openedFromRecoveryLink, supabase } from './supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(openedFromRecoveryLink)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Auth />
  if (recovering) return <ResetPassword onDone={() => setRecovering(false)} />

  return <Dashboard user={session.user} />
}
