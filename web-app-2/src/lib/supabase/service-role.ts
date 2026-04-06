/**
 * Service-role Supabase client — bypasses RLS.
 *
 * NEVER import this from client components or route handlers.
 * Only import from server actions in `src/lib/actions/`.
 *
 * Two-layer defense:
 * 1. `server-only` — build-time error if bundled into client code
 * 2. ESLint `no-restricted-imports` — lint-time block on unauthorized imports
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database'

export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
