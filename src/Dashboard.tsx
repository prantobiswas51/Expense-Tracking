import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Projects from './Projects'
import { supabase } from './supabase'

const nav = [
  { id: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
  { id: 'projects', icon: 'fa-folder-open', label: 'Projects' },
]
const currentPage = () => (nav.some((n) => n.id === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard')

const border = 'border-[rgba(22,17,56,0.08)]'
const pill = `rounded-full border ${border} bg-[rgba(22,17,56,0.04)]`

export default function Dashboard({ user }: { user: User }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [page, setPage] = useState(currentPage)

  useEffect(() => {
    const onHash = () => setPage(currentPage())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const name: string = user.user_metadata.full_name || user.email?.split('@')[0] || 'there'
  const initial = name.charAt(0).toUpperCase()
  const avatar = 'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 font-black text-white'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e2e8f0]">
      {menuOpen && <div onClick={() => setMenuOpen(false)} aria-hidden className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-[120] flex w-[260px] flex-col bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 lg:border-r lg:shadow-none ${border} ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex h-[4.5rem] shrink-0 items-center gap-3 border-b px-5 ${border}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(226,30,83,0.08)] text-brand-500">
            <i className="fa-solid fa-wallet" />
          </span>
          <div className="flex flex-col">
            <span className="text-[1rem] font-black leading-[1.1] tracking-[-0.02em]">Expense</span>
            <span className="text-[0.62rem] font-semibold text-[#545454]">Tracker</span>
          </div>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-[#545454] hover:bg-[rgba(22,17,56,0.06)] lg:hidden">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <span className="block px-[0.85rem] pb-[0.15rem] pt-[0.4rem] text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[#545454] opacity-60">Core</span>
          {nav.map((item) => {
            const active = page === item.id
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`relative mb-[0.15rem] flex items-center gap-3 rounded-xl px-[1.15rem] py-[0.8rem] text-[0.875rem] font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_12px_rgba(226,30,83,0.25)]'
                    : 'text-[#545454] hover:translate-x-[3px] hover:bg-[rgba(226,30,83,0.05)] hover:text-[#1E1E1E]'
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${active ? 'bg-white/15' : 'bg-[rgba(226,30,83,0.08)] text-brand-500'}`}>
                  <i className={`fa-solid ${item.icon}`} />
                </span>
                {item.label}
                {active && <span className="absolute right-3 h-[6px] w-[6px] animate-[pip-pulse_2s_infinite] rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.5)]" />}
              </a>
            )
          })}
        </nav>

        <div className={`shrink-0 border-t p-3 ${border}`}>
          <div className="flex items-center gap-[0.6rem] rounded-xl border border-[rgba(226,30,83,0.12)] bg-[rgba(226,30,83,0.04)] p-3">
            <div className={`${avatar} h-[2.1rem] w-[2.1rem] text-[0.8rem]`}>{initial}</div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[0.8rem] font-bold">{name}</span>
              <span className="truncate text-[0.62rem] font-medium text-[#545454]">{user.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <header className={`sticky top-0 z-[90] flex h-[4.5rem] shrink-0 items-center gap-3 border-b bg-white/90 px-4 shadow-sm backdrop-blur-lg sm:px-6 ${border}`}>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-md text-[#545454] hover:bg-[rgba(22,17,56,0.06)] lg:hidden">
            <i className="fa-solid fa-bars text-[1.1rem]" />
          </button>

          <div className={`hidden items-center gap-[0.45rem] px-[0.85rem] py-2 text-[0.8rem] font-bold text-[#545454] md:flex ${pill}`}>
            <i className="fa-regular fa-calendar-days text-brand-500" />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          <div className="ml-auto flex items-center gap-[0.65rem]">
            <div className={`hidden h-[38px] items-center gap-[0.6rem] py-1 pl-1 pr-4 sm:flex ${pill}`}>
              <div className={`${avatar} h-[30px] w-[30px] text-[0.8rem]`}>{initial}</div>
              <span className="max-w-[11rem] truncate text-[0.8rem] font-extrabold">{name}</span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-md border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.08)] px-[0.85rem] py-1 font-bold text-[#ef4444] transition-all hover:-translate-y-[1.5px] hover:border-[#ef4444] hover:bg-[#ef4444] hover:text-white hover:shadow-[0_4px_12px_rgba(239,68,68,0.25)]"
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span className="ml-2 hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] rounded-xl border border-white/40 bg-white/60 p-6 shadow-md backdrop-blur-xl">
            {page === 'projects' ? (
              <Projects />
            ) : (
              <>
                <h1 className="text-[1.35rem] font-black tracking-[-0.02em]">Dashboard</h1>
                <p className="mt-1 text-[0.8rem] font-medium text-[#545454]">Overview of your account</p>

                <div className="mt-6 flex items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
                  <div className={`${avatar} h-14 w-14 text-xl`}>{initial}</div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#545454]">Welcome back,</p>
                    <p className="truncate text-2xl font-black tracking-[-0.02em]">{name}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        <footer className={`mt-auto border-t bg-white/60 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 ${border}`}>
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 text-[0.72rem]">
            <div className="flex items-center gap-[0.4rem]">
              <span className="h-[6px] w-[6px] animate-[blink-dot_2s_infinite] rounded-full bg-[#10b981]" />
              <span className="font-semibold text-[#10b981]">Online</span>
            </div>
            <span className="text-[#545454] opacity-70">&copy; {new Date().getFullYear()} Expense Tracker</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
