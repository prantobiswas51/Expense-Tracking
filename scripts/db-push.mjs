// Runs before `npm run dev`: applies any new supabase/migrations/* to the database.
// Needs SUPABASE_DB_URL in .env (server-side only; no VITE_/NEXT_PUBLIC_ prefix, so it never reaches the browser).
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

try {
  process.loadEnvFile()
} catch {
  // no .env file
}

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.warn('\n[db-push] SUPABASE_DB_URL is not set in .env, skipping migrations.\n')
  process.exit(0)
}

const cli = createRequire(import.meta.url).resolve('supabase/dist/supabase.js')
const { status } = spawnSync(process.execPath, [cli, 'db', 'push', '--db-url', url, '--yes'], { stdio: 'inherit' })

if (status !== 0) {
  console.warn('\n[db-push] Migrations were NOT applied (see error above). Starting the dev server anyway.\n')
}
