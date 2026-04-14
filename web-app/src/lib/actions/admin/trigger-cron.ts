'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isSystemAdmin } from '@/lib/dal/admin/auth'
import { CRON_JOBS } from '@/lib/cron-registry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TriggerResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
  durationMs?: number
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const admin = await isSystemAdmin(user.id)
  if (!admin) return { error: 'Not authorized — system admin required' }

  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Manually trigger a cron function by its registry key.
 */
export async function triggerCronFunction(
  cronKey: string
): Promise<TriggerResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const job = CRON_JOBS.find((j) => j.key === cronKey)
  if (!job) return { success: false, error: `Unknown cron key: ${cronKey}` }

  const serviceClient = createServiceRoleClient()
  const start = Date.now()

  try {
    switch (job.invocationType) {
      case 'edge-function': {
        const { data, error } = await serviceClient.functions.invoke(
          job.functionName
        )
        if (error) {
          return {
            success: false,
            error: error.message,
            durationMs: Date.now() - start,
          }
        }
        return {
          success: true,
          data: data as Record<string, unknown>,
          durationMs: Date.now() - start,
        }
      }

      case 'pg-function': {
        // These cron functions (run_seed_scenarios_cron, run_deadline_reminders_cron)
        // are not in the auto-generated types since they're system functions.
        // Use a raw SQL call via the service role client.
        const { data, error } = await serviceClient
          .schema('public')
          .rpc(job.functionName as never)
        if (error) {
          return {
            success: false,
            error: error.message,
            durationMs: Date.now() - start,
          }
        }
        return {
          success: true,
          data:
            typeof data === 'object' && data !== null
              ? (data as Record<string, unknown>)
              : { result: data },
          durationMs: Date.now() - start,
        }
      }

      case 'pg-sql': {
        // Rate limit cleanup — inline SQL
        const { error } = await serviceClient
          .from('v2_rate_limits')
          .delete()
          .lt('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        if (error) {
          return {
            success: false,
            error: error.message,
            durationMs: Date.now() - start,
          }
        }
        return {
          success: true,
          data: { message: 'Deleted rate limit entries older than 24 hours' },
          durationMs: Date.now() - start,
        }
      }

      default:
        return { success: false, error: `Unsupported invocation type` }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: message,
      durationMs: Date.now() - start,
    }
  }
}
