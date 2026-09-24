import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Auth from './Auth'
import Dashboard from './Dashboard'
import { supabase } from './supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Auth />

  return <Dashboard user={session.user} />
}
