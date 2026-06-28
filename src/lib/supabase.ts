import { createClient } from '@supabase/supabase-js'

// Anon client — subject to RLS, safe to ship in browser bundle.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
