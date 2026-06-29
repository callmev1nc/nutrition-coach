import { createClient } from '@supabase/supabase-js'

/**
 * Service-role admin client. Bypasses RLS — use ONLY server-side, and ONLY for
 * writes to shared reference tables (e.g. the `food_items` nutrition cache) that
 * must not be client-writable. Never expose the service role key to the browser.
 *
 * Mirrors the pattern already used in src/app/api/profile/route.ts.
 */
let cached: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (cached) return cached
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  return cached
}
