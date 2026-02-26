import { createClient } from '@supabase/supabase-js'

// Browser-safe credentials.
// IMPORTANT: Keep RLS enabled in Supabase and create policies for each table.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Add them to your .env file (and Vercel env vars) then restart the dev server.'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
