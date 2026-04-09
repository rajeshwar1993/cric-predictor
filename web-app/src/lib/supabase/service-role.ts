import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

/**
 * Creates a Supabase client with the service role key.
 *
 * WARNING: This client bypasses RLS. Only use for system-level
 * operations that cannot be performed under a user's session
 * (e.g., admin tasks, cron jobs, webhook handlers).
 */
export function createServiceRoleClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}
