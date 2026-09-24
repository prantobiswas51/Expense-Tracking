import type { ReactNode } from 'react'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#f0f4f8] to-[#e2e8f0] px-4">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[35vw] w-[35vw] rounded-full bg-[rgba(226,30,83,0.07)] blur-[80px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[35vw] w-[35vw] rounded-full bg-[rgba(22,17,56,0.07)] blur-[80px]" />
      <div className="pointer-events-none absolute left-[45%] top-[40%] h-[25vw] w-[25vw] rounded-full bg-[rgba(124,58,237,0.05)] blur-[80px]" />

      <div className="relative z-[1] w-full max-w-[440px] animate-[fade-in-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl border border-[#e8e8e8] bg-white px-8 py-10 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(22,17,56,0.08)] bg-[rgba(22,17,56,0.04)] text-xl text-brand-600">
            <i className="fa-solid fa-user-lock" />
          </div>
          <h1 className="text-[1rem] font-black">{title}</h1>
          <p className="text-[0.8rem] font-medium text-[#545454]">{subtitle}</p>
        </div>
        {children}
        <p className="mt-6 text-center text-[0.68rem] text-[#545454] opacity-70">&copy; {new Date().getFullYear()} Personal App</p>
      </div>
    </div>
  )
}

export const primaryButton =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 py-[0.85rem] text-[0.85rem] font-bold text-white shadow-[0_4px_12px_rgba(226,30,83,0.25)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(226,30,83,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none'
