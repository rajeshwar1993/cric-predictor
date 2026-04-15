// =============================================================================
// Cron run logger — shared helper for edge functions
// Upserts a single row per job_key into v2_cron_run_status.
// =============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Log the result of a cron/edge function run.
 * Call this at the end of the edge function handler, before returning the response.
 *
 * Uses upsert on job_key — stores only the last run per job (no history accumulation).
 * Failures to log are caught and logged to console, never thrown.
 */
export async function logCronRun(
  supabase: SupabaseClient,
  jobKey: string,
  startTime: number,
  summary: Record<string, unknown>,
  errorCount: number,
): Promise<void> {
  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  try {
    const { error } = await supabase.from('v2_cron_run_status').upsert(
      {
        job_key: jobKey,
        status: errorCount > 0 ? 'failed' : 'succeeded',
        started_at: new Date(startTime).toISOString(),
        completed_at: completedAt,
        duration_ms: durationMs,
        summary,
        error_count: errorCount,
        updated_at: completedAt,
      },
      { onConflict: 'job_key' },
    );

    if (error) {
      console.error(`[cron-log] Failed to log run for ${jobKey}: ${error.message}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron-log] Unexpected error logging run for ${jobKey}: ${message}`);
  }
}
