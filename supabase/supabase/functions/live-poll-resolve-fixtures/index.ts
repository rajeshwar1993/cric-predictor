// =============================================================================
// live-poll-resolve-fixtures — Unified live polling and scenario resolution
// LIVE-CRON-001 — Deno Edge Function
//
// Scheduled via pg_cron at 15-second intervals. For each active fixture:
//   1. Fetches latest data from Sportmonks
//   2. Detects status transitions (upcoming->live->completed->resolved)
//   3. Upserts live scorecard data
//   4. Captures powerplay snapshots
//   5. Progressively resolves scenarios
//   6. Checks if all scenarios resolved -> marks fixture resolved
//   7. Creates results_available notifications
//
// Per-fixture try/catch ensures one failure doesn't stop other fixtures.
// =============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  sportmonksClient,
  SmFixture,
  COMMON_FIXTURE_INCLUDES,
} from '../_shared/sportmonks.ts';
import {
  extractForScenario,
  extractLiveScorecard,
  isMatchFinished,
  mapToBracket,
  type ScenarioSlug,
  type ExtractResult,
  type LiveScorecardData,
} from '../_shared/sportmonks-extractors.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PollSummary {
  fixturesPolled: number;
  scenariosResolved: number;
  fixturesFullyResolved: number;
  errorsCount: number;
  errors: string[];
  durationMs: number;
}

interface DbFixture {
  id: string;
  api_id: string;
  home_team_id: string;
  away_team_id: string;
  status: string;
  status_changed_at: string;
  season_id: string;
}

interface DbScenario {
  id: string;
  slug: string;
  input_type: string;
  options: string[] | null;
  gang_id: string;
  is_resolved: boolean;
  is_voided: boolean;
}

interface DbLiveScore {
  fixture_id: string;
  home_team_max_overs_seen: number | null;
  away_team_max_overs_seen: number | null;
}

// ---------------------------------------------------------------------------
// Sportmonks status -> internal status mapping
// ---------------------------------------------------------------------------

type InternalStatus =
  | 'upcoming'
  | 'live'
  | 'completed'
  | 'abandoned'
  | 'no_result';

function mapSmStatusToInternal(smStatus: string): InternalStatus {
  const lower = smStatus.toLowerCase();

  if (lower === 'ns' || lower === 'not started') {
    return 'upcoming';
  }
  if (
    lower === '1st innings' ||
    lower === '2nd innings' ||
    lower === 'innings break' ||
    lower === 'stump' ||
    lower === 'live'
  ) {
    return 'live';
  }
  if (isMatchFinished(lower)) {
    return 'completed';
  }
  if (lower === 'abandoned' || lower === 'cancl' || lower === 'aborted' || lower === 'cancelled') {
    return 'abandoned';
  }
  if (lower === 'no result' || lower === 'n/r') {
    return 'no_result';
  }

  // Default: treat unknown as upcoming (don't break the poll)
  return 'upcoming';
}

// ---------------------------------------------------------------------------
// ID Mapping Caches (per run)
// ---------------------------------------------------------------------------

class IdMapper {
  private teamApiToUuid = new Map<string, string>();
  private playerApiToUuid = new Map<string, string>();
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getTeamUuid(apiId: number): Promise<string | null> {
    const key = String(apiId);
    const cached = this.teamApiToUuid.get(key);
    if (cached) return cached;

    const { data } = await this.supabase
      .from('v2_league_teams')
      .select('id')
      .eq('api_id', key)
      .single();

    if (data) {
      this.teamApiToUuid.set(key, data.id);
      return data.id;
    }
    return null;
  }

  async getPlayerUuid(apiId: number): Promise<string | null> {
    const key = String(apiId);
    const cached = this.playerApiToUuid.get(key);
    if (cached) return cached;

    const { data } = await this.supabase
      .from('v2_players')
      .select('id')
      .eq('api_id', key)
      .single();

    if (data) {
      this.playerApiToUuid.set(key, data.id);
      return data.id;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slugs that return player API IDs (need UUID mapping)
// ---------------------------------------------------------------------------

const PLAYER_SLUGS: Set<string> = new Set([
  'top_scorer',
  'top_wicket_taker',
  'most_sixes_player',
  'player_of_match',
]);

// ---------------------------------------------------------------------------
// Slugs that return team API IDs (need UUID mapping)
// ---------------------------------------------------------------------------

const TEAM_SLUGS: Set<string> = new Set([
  'toss_winner',
  'match_winner',
]);

// ---------------------------------------------------------------------------
// Slugs that need bracket mapping (range type)
// ---------------------------------------------------------------------------

const RANGE_SLUGS: Set<string> = new Set([
  'home_team_innings_score',
  'away_team_innings_score',
  'home_team_powerplay_runs',
  'away_team_powerplay_runs',
  'home_team_powerplay_wickets_lost',
  'away_team_powerplay_wickets_lost',
  'total_match_runs',
  'total_match_sixes',
  'total_match_wickets',
  'first_wicket_over',
]);

// ---------------------------------------------------------------------------
// Slugs to fixture_results column mapping (for storing raw values)
// ---------------------------------------------------------------------------

const SLUG_TO_RESULT_COLUMN: Record<string, string> = {
  toss_winner: 'toss_winner_id',
  match_winner: 'match_winner_id',
  top_scorer: 'top_scorer_id',
  top_wicket_taker: 'top_wicket_taker_id',
  most_sixes_player: 'most_sixes_player_id',
  player_of_match: 'player_of_match_id',
  home_team_innings_score: 'home_team_innings_score',
  away_team_innings_score: 'away_team_innings_score',
  home_team_powerplay_runs: 'home_team_powerplay_runs',
  away_team_powerplay_runs: 'away_team_powerplay_runs',
  home_team_powerplay_wickets_lost: 'home_team_powerplay_wickets_lost',
  away_team_powerplay_wickets_lost: 'away_team_powerplay_wickets_lost',
  total_match_runs: 'total_match_runs',
  total_match_sixes: 'total_match_sixes',
  total_match_wickets: 'total_match_wickets',
  first_wicket_over: 'first_wicket_over',
  fifty_scored: 'fifty_scored',
  bowler_three_wickets: 'bowler_three_wickets',
  super_over: 'super_over',
};

// ---------------------------------------------------------------------------
// Main poll logic
// ---------------------------------------------------------------------------

async function pollAndResolve(supabase: SupabaseClient): Promise<PollSummary> {
  const startTime = Date.now();
  const errors: string[] = [];
  let fixturesPolled = 0;
  let scenariosResolved = 0;
  let fixturesFullyResolved = 0;

  const idMapper = new IdMapper(supabase);

  // -----------------------------------------------------------------------
  // Step 1: Query fixtures to poll
  // -----------------------------------------------------------------------
  // Fixtures to poll:
  //   - (upcoming or live) within time window: start-1h to start+6h
  //     i.e. wall clock W is in [start-1h, start+6h], which rearranges to
  //          start_datetime in [now-6h, now+1h]
  //   - OR completed within last 120 minutes (for post-match scenarios like POTM)
  const { data: fixturesToPoll, error: queryErr } = await supabase
    .rpc('get_fixtures_to_poll');

  // If the RPC doesn't exist, fall back to a direct query
  let fixtures: DbFixture[];

  if (queryErr || !fixturesToPoll) {
    console.log('[live-poll] RPC not found, using direct query...');

    const now = Date.now();
    const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000).toISOString();
    const oneHourFromNow = new Date(now + 1 * 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now - 120 * 60 * 1000).toISOString();

    const { data: directFixtures, error: directErr } = await supabase
      .from('v2_league_season_fixtures')
      .select('id, api_id, home_team_id, away_team_id, status, status_changed_at, season_id')
      .or(
        `and(status.in.(upcoming,live),start_datetime.gte.${sixHoursAgo},start_datetime.lte.${oneHourFromNow}),and(status.eq.completed,status_changed_at.gte.${twoHoursAgo})`
      );

    if (directErr || !directFixtures) {
      const msg = `Failed to query fixtures: ${directErr?.message ?? 'no data'}`;
      console.error(`[live-poll] ${msg}`);
      return {
        fixturesPolled: 0,
        scenariosResolved: 0,
        fixturesFullyResolved: 0,
        errorsCount: 1,
        errors: [msg],
        durationMs: Date.now() - startTime,
      };
    }

    fixtures = directFixtures as DbFixture[];
  } else {
    fixtures = fixturesToPoll as DbFixture[];
  }

  if (fixtures.length === 0) {
    console.log('[live-poll] No fixtures to poll');
    return {
      fixturesPolled: 0,
      scenariosResolved: 0,
      fixturesFullyResolved: 0,
      errorsCount: 0,
      errors: [],
      durationMs: Date.now() - startTime,
    };
  }

  console.log(`[live-poll] Polling ${fixtures.length} fixture(s)...`);

  // -----------------------------------------------------------------------
  // Step 2: Process each fixture
  // -----------------------------------------------------------------------
  for (const dbFixture of fixtures) {
    try {
      const resolved = await processFixture(supabase, dbFixture, idMapper);
      fixturesPolled++;
      scenariosResolved += resolved.scenariosResolved;
      if (resolved.fullyResolved) {
        fixturesFullyResolved++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const errMsg = `Error processing fixture ${dbFixture.api_id}: ${message}`;
      console.error(`[live-poll] ${errMsg}`);
      errors.push(errMsg);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[live-poll] Completed in ${durationMs}ms: ` +
    `${fixturesPolled} polled, ${scenariosResolved} scenarios resolved, ` +
    `${fixturesFullyResolved} fully resolved, ${errors.length} errors`
  );

  return {
    fixturesPolled,
    scenariosResolved,
    fixturesFullyResolved,
    errorsCount: errors.length,
    errors,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Per-fixture processing
// ---------------------------------------------------------------------------

interface FixtureResult {
  scenariosResolved: number;
  fullyResolved: boolean;
}

async function processFixture(
  supabase: SupabaseClient,
  dbFixture: DbFixture,
  idMapper: IdMapper
): Promise<FixtureResult> {
  const fixtureApiId = parseInt(dbFixture.api_id, 10);
  let scenariosResolved = 0;
  let fullyResolved = false;

  // -----------------------------------------------------------------------
  // Step 1: Fetch from Sportmonks
  // -----------------------------------------------------------------------
  const includes = COMMON_FIXTURE_INCLUDES.split(',');
  const smResult = await sportmonksClient.getFixture(fixtureApiId, includes);

  if (!smResult.success) {
    console.warn(`[live-poll] Skipping fixture ${dbFixture.api_id}: ${smResult.error}`);
    return { scenariosResolved: 0, fullyResolved: false };
  }

  const smFixture: SmFixture = smResult.data;

  // -----------------------------------------------------------------------
  // Step 2: Status transition detection
  // -----------------------------------------------------------------------
  const newInternalStatus = mapSmStatusToInternal(smFixture.status);
  const currentDbStatus = dbFixture.status;

  // Handle status transitions
  if (newInternalStatus !== currentDbStatus) {
    console.log(
      `[live-poll] Fixture ${dbFixture.api_id} status: ${currentDbStatus} -> ${newInternalStatus}`
    );

    // Handle abandonment / no_result
    if (newInternalStatus === 'abandoned' || newInternalStatus === 'no_result') {
      console.log(`[live-poll] Voiding all scenarios for fixture ${dbFixture.api_id}`);

      // Update fixture status
      await supabase
        .from('v2_league_season_fixtures')
        .update({ status: newInternalStatus })
        .eq('id', dbFixture.id);

      // Void all scenarios
      const { error: voidErr } = await supabase.rpc('void_fixture_scenarios', {
        p_fixture_id: dbFixture.id,
      });

      if (voidErr) {
        console.error(`[live-poll] Error voiding scenarios: ${voidErr.message}`);
      }

      return { scenariosResolved: 0, fullyResolved: false };
    }

    // Normal transitions: upcoming->live, live->completed
    // Only transition forward (don't go back from completed to live)
    const statusOrder: Record<string, number> = {
      upcoming: 0,
      live: 1,
      completed: 2,
      resolved: 3,
    };
    const currentOrder = statusOrder[currentDbStatus] ?? -1;
    const newOrder = statusOrder[newInternalStatus] ?? -1;

    if (newOrder > currentOrder) {
      await supabase
        .from('v2_league_season_fixtures')
        .update({ status: newInternalStatus })
        .eq('id', dbFixture.id);
    }
  }

  // -----------------------------------------------------------------------
  // Step 3: 120-minute cutoff check
  // -----------------------------------------------------------------------
  if (currentDbStatus === 'completed') {
    const statusChangedAt = new Date(dbFixture.status_changed_at).getTime();
    const minutesSinceCompleted = (Date.now() - statusChangedAt) / (1000 * 60);

    if (minutesSinceCompleted >= 120) {
      console.warn(
        `[live-poll] Fixture ${dbFixture.api_id} has been completed for ${Math.round(minutesSinceCompleted)}min ` +
        `with unresolved scenarios — needs admin attention`
      );
      // Stop polling this fixture but don't error — it will fall off
      // the query window naturally
      return { scenariosResolved: 0, fullyResolved: false };
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Live scorecard upsert
  // -----------------------------------------------------------------------
  // Called on every poll regardless of status. The cron only ever processes
  // fixtures that are upcoming/live within the polling window or completed
  // within the last 120 minutes (waiting on POTM), so refreshing the scorecard
  // is always meaningful:
  //   - upcoming → extractLiveScorecard returns null (no runs yet) and the
  //     upsert is skipped internally
  //   - live → normal scorecard refresh
  //   - completed → freezes the final scorecard and keeps last_polled_at
  //     ticking through the POTM wait, so downstream "is data stale?" checks
  //     stay accurate
  // The upsert payload does not include home_team_max_overs_seen /
  // away_team_max_overs_seen, so step 5's max-overs tracking is preserved by
  // PostgREST's ON CONFLICT DO UPDATE SET <only-provided-columns> semantics.
  await upsertLiveScorecard(supabase, dbFixture, smFixture, idMapper);

  // -----------------------------------------------------------------------
  // Step 5: Load existing live scores for max overs tracking
  // -----------------------------------------------------------------------
  const { data: liveScoreRow } = await supabase
    .from('v2_fixture_live_scores')
    .select('fixture_id, home_team_max_overs_seen, away_team_max_overs_seen')
    .eq('fixture_id', dbFixture.id)
    .single();

  const existingLiveScore = liveScoreRow as DbLiveScore | null;

  // Update max overs tracking
  const homeMaxOvers = existingLiveScore?.home_team_max_overs_seen ?? null;
  const awayMaxOvers = existingLiveScore?.away_team_max_overs_seen ?? null;

  // Calculate new max overs from current Sportmonks data
  let newHomeMaxOvers = homeMaxOvers;
  let newAwayMaxOvers = awayMaxOvers;

  if (smFixture.runs) {
    for (const run of smFixture.runs) {
      if (run.team_id === smFixture.localteam_id) {
        if (newHomeMaxOvers == null || run.overs > newHomeMaxOvers) {
          newHomeMaxOvers = run.overs;
        }
      }
      if (run.team_id === smFixture.visitorteam_id) {
        if (newAwayMaxOvers == null || run.overs > newAwayMaxOvers) {
          newAwayMaxOvers = run.overs;
        }
      }
    }
  }

  // Persist max overs if changed
  if (newHomeMaxOvers !== homeMaxOvers || newAwayMaxOvers !== awayMaxOvers) {
    await supabase
      .from('v2_fixture_live_scores')
      .upsert({
        fixture_id: dbFixture.id,
        home_team_max_overs_seen: newHomeMaxOvers,
        away_team_max_overs_seen: newAwayMaxOvers,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fixture_id' });
  }

  // -----------------------------------------------------------------------
  // Step 6: Progressive scenario resolution
  // -----------------------------------------------------------------------
  // Load all unresolved, non-voided scenarios for this fixture
  const { data: unresolvedScenarios, error: scenarioErr } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, slug, input_type, options, gang_id, is_resolved, is_voided')
    .eq('fixture_id', dbFixture.id)
    .eq('is_resolved', false)
    .eq('is_voided', false);

  if (scenarioErr) {
    console.error(`[live-poll] Error loading scenarios for fixture ${dbFixture.api_id}: ${scenarioErr.message}`);
    return { scenariosResolved: 0, fullyResolved: false };
  }

  const scenarios = (unresolvedScenarios ?? []) as DbScenario[];

  // Track which slugs we've already resolved (multiple gangs may share the
  // same slug for the same fixture — they get the same answer)
  const resolvedValues = new Map<string, string>();

  for (const scenario of scenarios) {
    try {
      const slug = scenario.slug as ScenarioSlug;

      // Check if we already computed this slug's value (for another gang)
      let correctAnswer: string | undefined;
      const cachedValue = resolvedValues.get(slug);

      if (cachedValue !== undefined) {
        correctAnswer = cachedValue;
      } else {
        // Call the extractor
        const extractResult: ExtractResult = extractForScenario(slug, smFixture, {
          homeTeamPreviousMaxOvers: homeMaxOvers,
          awayTeamPreviousMaxOvers: awayMaxOvers,
        });

        if (!extractResult.resolved) {
          continue; // Skip — not yet resolvable
        }

        let rawValue = extractResult.value;

        // Map player API IDs to UUIDs
        if (PLAYER_SLUGS.has(slug)) {
          const playerApiId = parseInt(rawValue, 10);
          const playerUuid = await idMapper.getPlayerUuid(playerApiId);
          if (!playerUuid) {
            console.warn(`[live-poll] Player UUID not found for API ID ${playerApiId} (slug: ${slug})`);
            continue;
          }
          rawValue = playerUuid;

          // Store raw value in fixture_results
          await upsertFixtureResult(supabase, dbFixture.id, slug, playerUuid);
        }

        // Map team API IDs to UUIDs
        if (TEAM_SLUGS.has(slug)) {
          const teamApiId = parseInt(rawValue, 10);
          const teamUuid = await idMapper.getTeamUuid(teamApiId);
          if (!teamUuid) {
            console.warn(`[live-poll] Team UUID not found for API ID ${teamApiId} (slug: ${slug})`);
            continue;
          }
          rawValue = teamUuid;

          // Store raw value in fixture_results
          await upsertFixtureResult(supabase, dbFixture.id, slug, teamUuid);
        }

        // For range scenarios: map numeric value to bracket string
        if (RANGE_SLUGS.has(slug)) {
          const numericValue = parseInt(rawValue, 10);

          // Store raw numeric value in fixture_results
          await upsertFixtureResult(supabase, dbFixture.id, slug, numericValue);

          // Map to bracket for scenario resolution
          const options = scenario.options;
          if (!options || options.length === 0) {
            console.warn(`[live-poll] No options for range scenario ${slug}`);
            continue;
          }

          const bracketStr = mapToBracket(numericValue, options);
          if (!bracketStr) {
            console.warn(
              `[live-poll] No bracket match for ${slug}: value=${numericValue}, options=${JSON.stringify(options)}`
            );
            continue;
          }

          rawValue = bracketStr;
        }

        // For yes_no scenarios: store boolean in fixture_results
        if (scenario.input_type === 'yes_no') {
          const boolValue = rawValue === 'Yes';
          await upsertFixtureResult(supabase, dbFixture.id, slug, boolValue);
        }

        correctAnswer = rawValue;
        resolvedValues.set(slug, correctAnswer);
      }

      // Call resolve_scenario RPC
      const { error: resolveErr } = await supabase.rpc('resolve_scenario', {
        p_scenario_id: scenario.id,
        p_correct_answer: correctAnswer,
      });

      if (resolveErr) {
        console.error(
          `[live-poll] Error resolving scenario ${scenario.id} (${slug}): ${resolveErr.message}`
        );
        continue;
      }

      scenariosResolved++;
      console.log(
        `[live-poll] Resolved: ${slug} = "${correctAnswer}" (scenario ${scenario.id}, gang ${scenario.gang_id})`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[live-poll] Error processing scenario ${scenario.id}: ${message}`);
    }
  }

  // -----------------------------------------------------------------------
  // Step 7: Check if all scenarios resolved -> mark fixture resolved
  // -----------------------------------------------------------------------
  if (scenariosResolved > 0) {
    const { data: allResolved } = await supabase.rpc('all_scenarios_resolved', {
      p_fixture_id: dbFixture.id,
    });

    if (allResolved === true) {
      console.log(`[live-poll] All scenarios resolved for fixture ${dbFixture.api_id} — marking as resolved`);

      const { error: markErr } = await supabase.rpc('mark_fixture_resolved', {
        p_fixture_id: dbFixture.id,
      });

      if (markErr) {
        console.error(`[live-poll] Error marking fixture resolved: ${markErr.message}`);
      } else {
        fullyResolved = true;

        // Create results_available notifications for all gang members
        await createResultsNotifications(supabase, dbFixture);
      }
    }
  }

  return { scenariosResolved, fullyResolved };
}

// ---------------------------------------------------------------------------
// Live scorecard upsert
// ---------------------------------------------------------------------------

async function upsertLiveScorecard(
  supabase: SupabaseClient,
  dbFixture: DbFixture,
  smFixture: SmFixture,
  idMapper: IdMapper
): Promise<void> {
  const scorecard: LiveScorecardData | null = extractLiveScorecard(smFixture);
  if (!scorecard) return;

  // Map batting team API ID to UUID
  let battingTeamUuid: string | null = null;
  if (scorecard.batting_team_api_id) {
    battingTeamUuid = await idMapper.getTeamUuid(scorecard.batting_team_api_id);
  }

  // The extractor stores player_id as strings in striker/non-striker names.
  // The frontend will map API IDs to display names on read.
  // This keeps the cron fast — no extra DB lookups for names.

  const { error: upsertErr } = await supabase
    .from('v2_fixture_live_scores')
    .upsert({
      fixture_id: dbFixture.id,
      home_team_score: scorecard.home_team_score,
      away_team_score: scorecard.away_team_score,
      home_team_overs: scorecard.home_team_overs,
      away_team_overs: scorecard.away_team_overs,
      batting_team_id: battingTeamUuid,
      current_run_rate: scorecard.current_run_rate,
      last_6_balls: scorecard.last_6_balls,
      striker_name: scorecard.striker_name,
      striker_score: scorecard.striker_score,
      non_striker_name: scorecard.non_striker_name,
      non_striker_score: scorecard.non_striker_score,
      current_bowler: scorecard.current_bowler,
      current_partnership: scorecard.current_partnership,
      last_polled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fixture_id' });

  if (upsertErr) {
    console.error(`[live-poll] Error upserting live scorecard for fixture ${dbFixture.api_id}: ${upsertErr.message}`);
  }
}

// ---------------------------------------------------------------------------
// Fixture results upsert helper
// ---------------------------------------------------------------------------

async function upsertFixtureResult(
  supabase: SupabaseClient,
  fixtureId: string,
  slug: string,
  value: string | number | boolean
): Promise<void> {
  const column = SLUG_TO_RESULT_COLUMN[slug];
  if (!column) return;

  const updateData: Record<string, unknown> = {
    fixture_id: fixtureId,
    [column]: value,
  };

  const { error } = await supabase
    .from('v2_fixture_results')
    .upsert(updateData, { onConflict: 'fixture_id' });

  if (error) {
    console.error(`[live-poll] Error upserting fixture result ${slug}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Results notifications
// ---------------------------------------------------------------------------

async function createResultsNotifications(
  supabase: SupabaseClient,
  dbFixture: DbFixture
): Promise<void> {
  // Find all gangs that have predictions for this fixture
  const { data: gangPredictions, error: gangErr } = await supabase
    .from('v2_predictions')
    .select('gang_id, user_id')
    .eq('fixture_id', dbFixture.id);

  if (gangErr || !gangPredictions) {
    console.error(`[live-poll] Error fetching predictions for notifications: ${gangErr?.message}`);
    return;
  }

  // Get unique (gang_id, user_id) pairs
  const notifiedSet = new Set<string>();
  const notifications: Array<{
    user_id: string;
    type: string;
    message: string;
    gang_id: string;
    fixture_id: string;
  }> = [];

  for (const pred of gangPredictions as Array<{ gang_id: string; user_id: string }>) {
    const key = `${pred.gang_id}:${pred.user_id}`;
    if (notifiedSet.has(key)) continue;
    notifiedSet.add(key);

    notifications.push({
      user_id: pred.user_id,
      type: 'results_available',
      message: 'Match results are now available! Check your predictions.',
      gang_id: pred.gang_id,
      fixture_id: dbFixture.id,
    });
  }

  if (notifications.length === 0) return;

  // Batch insert — the unique partial index on (user_id, gang_id, fixture_id, type)
  // WHERE type IN ('deadline_reminder', 'results_available') handles dedup.
  // Supabase JS client doesn't support ON CONFLICT DO NOTHING directly,
  // so we catch duplicate errors gracefully.
  const { error: notifErr } = await supabase
    .from('v2_notifications')
    .insert(notifications);

  if (notifErr) {
    // Duplicate errors are expected due to the unique index — ignore them
    if (!notifErr.message.includes('duplicate') && !notifErr.message.includes('unique')) {
      console.error(`[live-poll] Error creating notifications: ${notifErr.message}`);
    }
  }

  console.log(`[live-poll] Created ${notifications.length} results_available notification(s) for fixture ${dbFixture.api_id}`);
}

// ---------------------------------------------------------------------------
// Edge Function handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request) => {
  try {
    // Service role key: try custom secret first, then auto-injected, then Authorization header
    const serviceRoleKey =
      Deno.env.get('SB_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      _req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            'Missing SUPABASE_URL or service role key. Set SB_SERVICE_ROLE_KEY via: supabase secrets set SB_SERVICE_ROLE_KEY=eyJ...',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    console.log('[live-poll] Starting live poll and resolve...');
    const summary = await pollAndResolve(supabase);

    const hasErrors = summary.errorsCount > 0;
    if (hasErrors) {
      console.error(
        `[live-poll] Completed with ${summary.errorsCount} error(s):`,
        summary.errors
      );
    }

    return new Response(JSON.stringify(summary), {
      status: hasErrors ? 207 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[live-poll] Unhandled error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
