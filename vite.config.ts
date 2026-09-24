import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // NEXT_PUBLIC_* is what the Vercel Supabase integration creates; those are public by design.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
