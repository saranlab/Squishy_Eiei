import { createClient } from '@supabase/supabase-js'

/** Service-role client — bypasses RLS. Only used server-side in /api routes. */
export function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
