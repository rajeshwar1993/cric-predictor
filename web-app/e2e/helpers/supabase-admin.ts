/**
 * Standalone Supabase client for E2E admin operations.
 *
 * Uses the service role key to bypass RLS — only used in global
 * setup/teardown and test helpers, never in the app itself.
 *
 * This runs outside the Next.js runtime so it cannot use
 * `@/lib/supabase/service-role.ts` (imports `server-only`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.E2E_SUPABASE_URL
    const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY must be set')
    }
    adminClient = createClient(url, key)
  }
  return adminClient
}

/**
 * Returns the Supabase project ref extracted from the URL.
 * e.g. https://abcdefgh.supabase.co → abcdefgh
 */
export function getProjectRef(): string {
  const url = process.env.E2E_SUPABASE_URL
  if (!url) throw new Error('E2E_SUPABASE_URL must be set')
  const ref = new URL(url).hostname.split('.')[0]
  if (!ref) throw new Error('Could not extract project ref from E2E_SUPABASE_URL')
  return ref
}
