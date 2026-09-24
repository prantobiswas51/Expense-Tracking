# Personal App

React + TypeScript + Tailwind CSS v4 + Supabase Auth, built with Vite. Deploys to Vercel.

## Setup

1. Create a project at https://supabase.com.
2. Copy `.env.example` to `.env` and fill in values from Supabase → Project Settings → API.
3. `npm install`
4. `npm run dev`

Email confirmation is on by default in Supabase (Authentication → Sign In / Providers → Email).
Turn off "Confirm email" if you want signup to log you in immediately.
Set Authentication → URL Configuration → Site URL to your Vercel URL so confirmation links point there.

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel (framework preset: Vite).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project → Settings → Environment Variables.
3. Deploy.
