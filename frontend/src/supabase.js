import { createClient } from '@supabase/supabase-js'

// These come from frontend/.env (locally) or Vercel's Environment Variables (deployed).
// Vite only exposes variables that start with VITE_ to the browser.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY // the *publishable* key: safe to ship to the browser

// Names of any missing variables, so the app can tell the user exactly what to fix.
export const missingVars = [
  !url && 'VITE_SUPABASE_URL',
  !key && 'VITE_SUPABASE_KEY',
].filter(Boolean)

// Only create the client if both variables exist (createClient crashes the page otherwise).
export const supabase = missingVars.length === 0 ? createClient(url, key) : null
