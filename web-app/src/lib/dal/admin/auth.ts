import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Check whether a user has the system admin flag set on their profile.
 *
 * Uses the service role client (bypasses RLS) because the `is_system_admin`
 * column is intentionally hidden from regular user-facing RLS policies.
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_profiles')
    .select('is_system_admin')
    .eq('id', userId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error || !data) return false
  return data.is_system_admin === true
}
