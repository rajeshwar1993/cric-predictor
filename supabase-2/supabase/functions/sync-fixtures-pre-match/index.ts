// =============================================================================
// sync-fixtures-pre-match — Pre-match delta sync (SYNC-CRON-002)
// Deno Edge Function
//
// Triggered by pg_cron every 15 minutes ('*/15 * * * *').
// Catches last-minute fixture timing changes for matches about to start.
// =============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sportmonksClient } from '../_shared/sportmonks.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PreMatchSummary {
  fixturesChecked: number;
  fixturesUpdated: number;
  fixturesConfirmed: number;
  errors: string[];
  durationMs: number;
}

interface PendingFixture {
  id: string;       // UUID
  api_id: string;   // Sportmonks numeric ID as string
  start_datetime: string;
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function syncPreMatch(supabase: SupabaseClient): Promise<PreMatchSummary> {
  const startTime = Date.now();
  const errors: string[] = [];
  let fixturesChecked = 0;
  let fixturesUpdated = 0;
  let fixturesConfirmed = 0;

  // -----------------------------------------------------------------------
  // Step 1: Query fixtures in the 15–30 minute window that need syncing
  // -----------------------------------------------------------------------
  console.log('[sync-pre-match] Querying fixtures in 15–30 min window with pre_match_synced=false...');

  const now = new Date();
  const fifteenMinFromNow = new Date(now.getTime() + 15 * 60 * 1000);
  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);

  const { data: pendingFixtures, error: queryErr } = await supabase
    .from('v2_league_season_fixtures')
    .select('id, api_id, start_datetime')
    .eq('pre_match_synced', false)
    .gte('start_datetime', fifteenMinFromNow.toISOString())
    .lte('start_datetime', thirtyMinFromNow.toISOString());

  if (queryErr) {
    const msg = `Failed to query pending fixtures: ${queryErr.message}`;
    console.error(`[sync-pre-match] ${msg}`);
    return { fixturesChecked: 0, fixturesUpdated: 0, fixturesConfirmed: 0, errors: [msg], durationMs: Date.now() - startTime };
  }

  if (!pendingFixtures || pendingFixtures.length === 0) {
    console.log('[sync-pre-match] No fixtures to check in the 15–30 min window.');
    return { fixturesChecked: 0, fixturesUpdated: 0, fixturesConfirmed: 0, errors: [], durationMs: Date.now() - startTime };
  }

  console.log(`[sync-pre-match] Found ${pendingFixtures.length} fixtures to check.`);

  // -----------------------------------------------------------------------
  // Step 2: For each fixture, fetch from Sportmonks and compare
  // -----------------------------------------------------------------------
  for (const fixture of pendingFixtures as PendingFixture[]) {
    fixturesChecked++;

    try {
      const fixtureApiId = parseInt(fixture.api_id, 10);
      if (isNaN(fixtureApiId)) {
        errors.push(`Invalid api_id "${fixture.api_id}" for fixture ${fixture.id}`);
        continue;
      }

      const result = await sportmonksClient.getFixture(fixtureApiId);
      if (!result.success) {
        errors.push(`Failed to fetch fixture ${fixture.api_id}: ${result.error}`);
        continue;
      }

      const smFixture = result.data;
      const apiStartDatetime = smFixture.starting_at;
      const storedStartDatetime = fixture.start_datetime;

      // -----------------------------------------------------------------------
      // Step 3–4: Compare and update
      // -----------------------------------------------------------------------
      if (apiStartDatetime !== storedStartDatetime) {
        // Start time changed — update but keep pre_match_synced = false
        // Next cycle will re-verify once timing stabilizes
        console.log(
          `[sync-pre-match] Fixture ${fixture.api_id} rescheduled: ${storedStartDatetime} → ${apiStartDatetime}`
        );

        const { error: updateErr } = await supabase
          .from('v2_league_season_fixtures')
          .update({
            start_datetime: apiStartDatetime,
            pre_match_synced: false,
          })
          .eq('id', fixture.id);

        if (updateErr) {
          errors.push(`Failed to update fixture ${fixture.api_id}: ${updateErr.message}`);
        } else {
          fixturesUpdated++;
        }
      } else {
        // Timing confirmed — mark as synced
        console.log(`[sync-pre-match] Fixture ${fixture.api_id} confirmed — marking pre_match_synced=true`);

        const { error: confirmErr } = await supabase
          .from('v2_league_season_fixtures')
          .update({ pre_match_synced: true })
          .eq('id', fixture.id);

        if (confirmErr) {
          errors.push(`Failed to confirm fixture ${fixture.api_id}: ${confirmErr.message}`);
        } else {
          fixturesConfirmed++;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Error processing fixture ${fixture.api_id}: ${message}`);
    }
  }

  const durationMs = Date.now() - startTime;

  console.log(
    `[sync-pre-match] Done — checked: ${fixturesChecked}, updated: ${fixturesUpdated}, confirmed: ${fixturesConfirmed}, errors: ${errors.length} (${durationMs}ms)`
  );

  return { fixturesChecked, fixturesUpdated, fixturesConfirmed, errors, durationMs };
}

// ---------------------------------------------------------------------------
// Edge Function handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // Use service role key from env (set via `supabase secrets set`)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    console.log('[sync-pre-match] Starting pre-match delta sync...');
    const summary = await syncPreMatch(supabase);

    const hasErrors = summary.errors.length > 0;
    if (hasErrors) {
      console.error(
        `[sync-pre-match] Completed with ${summary.errors.length} errors:`,
        summary.errors
      );
    }

    return new Response(JSON.stringify(summary), {
      status: hasErrors ? 207 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sync-pre-match] Unhandled error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
