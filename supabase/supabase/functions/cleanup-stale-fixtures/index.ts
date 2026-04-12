// =============================================================================
// cleanup-stale-fixtures — Identify and fix stale/stuck fixtures
// ADM-CLEANUP — Deno Edge Function
//
// Manually triggered from the admin panel. Two modes:
//   - "identify": Scans DB for stale fixtures, cross-references Sportmonks,
//     returns a diagnostic list. Read-only — never modifies data.
//   - "fix": Takes a single fixture ID, runs the full resolution pipeline
//     using fresh Sportmonks data.
//
// Reuses the same extractors and resolution RPCs as live-poll-resolve-fixtures.
// =============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  sportmonksClient,
  SmFixture,
  SmRun,
  COMMON_FIXTURE_INCLUDES,
} from '../_shared/sportmonks.ts';
import {
  extractForScenario,
  isMatchFinished,
  mapToBracket,
  type ScenarioSlug,
  type ExtractResult,
} from '../_shared/sportmonks-extractors.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StaleFixtureEntry {
  fixtureId: string;
  apiId: string;
  round: string | null;
  homeTeam: { code: string; name: string };
  awayTeam: { code: string; name: string };
  dbStatus: string;
  sportmonksStatus: string;
  mappedStatus: string;
  startDatetime: string;
  statusChangedAt: string;
  hoursSinceStart: number;
  hoursSinceStatusChange: number;
  unresolvedScenarios: number;
  totalScenarios: number;
  staleness: string;
  fixable: boolean;
}

interface IdentifyResponse {
  staleFixtures: StaleFixtureEntry[];
  summary: {
    totalScanned: number;
    staleCount: number;
    apiErrors: number;
    durationMs: number;
  };
}

interface FixAction {
  action: string;
  slug?: string;
  answer?: string;
  from?: string;
  to?: string;
  reason?: string;
  count?: number;
}

interface FixResponse {
  fixtureId: string;
  apiId: string;
  actions: FixAction[];
  summary: {
    scenariosResolved: number;
    scenariosSkipped: number;
    scenariosVoided: number;
    scenariosAlreadyResolved: number;
    scenariosReconciled: number;
    fullyResolved: boolean;
    notificationsSent: number;
    durationMs: number;
  };
}

interface DbFixture {
  id: string;
  api_id: string;
  home_team_id: string;
  away_team_id: string;
  status: string;
  status_changed_at: string;
  start_datetime: string;
  season_id: string;
  round: string | null;
}

interface DbScenario {
  id: string;
  slug: string;
  input_type: string;
  options: string[] | null;
  gang_id: string;
  is_resolved: boolean;
  is_voided: boolean;
  correct_answer?: string | null;
}

interface DbTeam {
  id: string;
  code: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Sportmonks status -> internal status mapping
// (Duplicated from live-poll; Deno cannot import from sibling function dirs)
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

  return 'upcoming';
}

// ---------------------------------------------------------------------------
// ID Mapping Caches (per run)
// (Duplicated from live-poll)
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
// Slug classification constants
// (Duplicated from live-poll)
// ---------------------------------------------------------------------------

const PLAYER_SLUGS: Set<string> = new Set([
  'top_scorer',
  'top_wicket_taker',
  'most_sixes_player',
  'player_of_match',
]);

const TEAM_SLUGS: Set<string> = new Set([
  'toss_winner',
  'match_winner',
]);

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

const SNAPSHOT_ONLY_SLUGS: Set<string> = new Set([
  'home_team_powerplay_runs',
  'away_team_powerplay_runs',
  'home_team_powerplay_wickets_lost',
  'away_team_powerplay_wickets_lost',
]);

// Map powerplay slugs to their fixture_results columns so we can check
// if a prior live-poll run already captured the snapshot.
const POWERPLAY_RESULT_COLUMNS: Record<string, string> = {
  home_team_powerplay_runs: 'home_team_powerplay_runs',
  away_team_powerplay_runs: 'away_team_powerplay_runs',
  home_team_powerplay_wickets_lost: 'home_team_powerplay_wickets_lost',
  away_team_powerplay_wickets_lost: 'away_team_powerplay_wickets_lost',
};

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
// Shared helpers (duplicated from live-poll)
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
    console.error(`[cleanup] Error upserting fixture result ${slug}: ${error.message}`);
  }
}

async function computeCorrectAnswer(
  supabase: SupabaseClient,
  fixtureId: string,
  scenario: DbScenario,
  smFixture: SmFixture,
  idMapper: IdMapper,
  ctx: { homeTeamPreviousMaxOvers: number | null; awayTeamPreviousMaxOvers: number | null }
): Promise<string | null> {
  const slug = scenario.slug as ScenarioSlug;

  const extractResult: ExtractResult = extractForScenario(slug, smFixture, ctx);
  if (!extractResult.resolved) {
    return null;
  }

  let rawValue = extractResult.value;

  if (PLAYER_SLUGS.has(slug)) {
    const playerApiId = parseInt(rawValue, 10);
    const playerUuid = await idMapper.getPlayerUuid(playerApiId);
    if (!playerUuid) {
      console.warn(`[cleanup] Player UUID not found for API ID ${playerApiId} (slug: ${slug})`);
      return null;
    }
    rawValue = playerUuid;
    await upsertFixtureResult(supabase, fixtureId, slug, playerUuid);
  }

  if (TEAM_SLUGS.has(slug)) {
    const teamApiId = parseInt(rawValue, 10);
    const teamUuid = await idMapper.getTeamUuid(teamApiId);
    if (!teamUuid) {
      console.warn(`[cleanup] Team UUID not found for API ID ${teamApiId} (slug: ${slug})`);
      return null;
    }
    rawValue = teamUuid;
    await upsertFixtureResult(supabase, fixtureId, slug, teamUuid);
  }

  if (RANGE_SLUGS.has(slug)) {
    const numericValue = parseInt(rawValue, 10);
    await upsertFixtureResult(supabase, fixtureId, slug, numericValue);

    const options = scenario.options;
    if (!options || options.length === 0) {
      console.warn(`[cleanup] No options for range scenario ${slug}`);
      return null;
    }

    const bracketStr = mapToBracket(numericValue, options);
    if (!bracketStr) {
      console.warn(
        `[cleanup] No bracket match for ${slug}: value=${numericValue}, options=${JSON.stringify(options)}`
      );
      return null;
    }

    rawValue = bracketStr;
  }

  if (scenario.input_type === 'yes_no') {
    const boolValue = rawValue === 'Yes';
    await upsertFixtureResult(supabase, fixtureId, slug, boolValue);
  }

  return rawValue;
}

async function createResultsNotifications(
  supabase: SupabaseClient,
  fixtureId: string
): Promise<number> {
  const { data: gangPredictions, error: gangErr } = await supabase
    .from('v2_predictions')
    .select('gang_id, user_id')
    .eq('fixture_id', fixtureId);

  if (gangErr || !gangPredictions) {
    console.error(`[cleanup] Error fetching predictions for notifications: ${gangErr?.message}`);
    return 0;
  }

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
      fixture_id: fixtureId,
    });
  }

  if (notifications.length === 0) return 0;

  const { error: notifErr } = await supabase
    .from('v2_notifications')
    .insert(notifications);

  if (notifErr) {
    if (!notifErr.message.includes('duplicate') && !notifErr.message.includes('unique')) {
      console.error(`[cleanup] Error creating notifications: ${notifErr.message}`);
    }
  }

  return notifications.length;
}

// ---------------------------------------------------------------------------
// IDENTIFY MODE
// ---------------------------------------------------------------------------

async function identifyStaleFixtures(supabase: SupabaseClient): Promise<IdentifyResponse> {
  const startTime = Date.now();
  let apiErrors = 0;

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  // Query all potentially stale fixtures:
  // - All live fixtures (regardless of age)
  // - Completed fixtures older than 3 hours (may have unresolved scenarios)
  // - Upcoming fixtures whose start time was 3+ hours ago
  const { data: fixtures, error: queryErr } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      'id, api_id, home_team_id, away_team_id, status, status_changed_at, start_datetime, season_id, round'
    )
    .or(
      `status.eq.live,and(status.eq.completed,status_changed_at.lt.${threeHoursAgo}),and(status.eq.upcoming,start_datetime.lt.${threeHoursAgo})`
    );

  if (queryErr || !fixtures) {
    return {
      staleFixtures: [],
      summary: {
        totalScanned: 0,
        staleCount: 0,
        apiErrors: 1,
        durationMs: Date.now() - startTime,
      },
    };
  }

  const dbFixtures = fixtures as DbFixture[];
  const staleFixtures: StaleFixtureEntry[] = [];

  // Batch-load all teams for display labels
  const teamIds = new Set<string>();
  for (const f of dbFixtures) {
    teamIds.add(f.home_team_id);
    teamIds.add(f.away_team_id);
  }

  const { data: teams } = await supabase
    .from('v2_league_teams')
    .select('id, code, name')
    .in('id', Array.from(teamIds));

  const teamMap = new Map<string, DbTeam>();
  for (const t of (teams ?? []) as DbTeam[]) {
    teamMap.set(t.id, t);
  }

  for (const dbFixture of dbFixtures) {
    try {
      // Fetch from Sportmonks
      const fixtureApiId = parseInt(dbFixture.api_id, 10);
      const includes = COMMON_FIXTURE_INCLUDES.split(',');
      const smResult = await sportmonksClient.getFixture(fixtureApiId, includes);

      if (!smResult.success) {
        console.warn(`[cleanup] Sportmonks error for fixture ${dbFixture.api_id}: ${smResult.error}`);
        apiErrors++;
        continue;
      }

      const smFixture = smResult.data;
      const mappedStatus = mapSmStatusToInternal(smFixture.status);

      // Count unresolved scenarios
      const { count: unresolvedCount } = await supabase
        .from('v2_fixture_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('fixture_id', dbFixture.id)
        .eq('is_resolved', false)
        .eq('is_voided', false);

      const { count: totalCount } = await supabase
        .from('v2_fixture_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('fixture_id', dbFixture.id);

      const now = Date.now();
      const hoursSinceStart = (now - new Date(dbFixture.start_datetime).getTime()) / (1000 * 60 * 60);
      const hoursSinceStatusChange = (now - new Date(dbFixture.status_changed_at).getTime()) / (1000 * 60 * 60);

      // Classify staleness
      let staleness: string;
      let fixable = false;

      if (dbFixture.status === 'live' && mappedStatus === 'completed') {
        staleness = 'db_live_sm_finished';
        fixable = true;
      } else if (dbFixture.status === 'live' && (mappedStatus === 'abandoned' || mappedStatus === 'no_result')) {
        staleness = 'db_live_sm_abandoned';
        fixable = true;
      } else if (dbFixture.status === 'completed' && (unresolvedCount ?? 0) > 0) {
        staleness = 'db_completed_unresolved';
        fixable = true;
      } else if (dbFixture.status === 'upcoming' && mappedStatus !== 'upcoming') {
        staleness = 'db_upcoming_overdue';
        fixable = mappedStatus === 'completed' || mappedStatus === 'abandoned' || mappedStatus === 'no_result';
      } else if (dbFixture.status === 'live' && mappedStatus === 'live') {
        staleness = 'db_live_sm_live';
        fixable = false;
      } else {
        // Not actually stale — skip
        continue;
      }

      const homeTeam = teamMap.get(dbFixture.home_team_id);
      const awayTeam = teamMap.get(dbFixture.away_team_id);

      staleFixtures.push({
        fixtureId: dbFixture.id,
        apiId: dbFixture.api_id,
        round: dbFixture.round,
        homeTeam: { code: homeTeam?.code ?? '???', name: homeTeam?.name ?? 'Unknown' },
        awayTeam: { code: awayTeam?.code ?? '???', name: awayTeam?.name ?? 'Unknown' },
        dbStatus: dbFixture.status,
        sportmonksStatus: smFixture.status,
        mappedStatus,
        startDatetime: dbFixture.start_datetime,
        statusChangedAt: dbFixture.status_changed_at,
        hoursSinceStart: Math.round(hoursSinceStart * 10) / 10,
        hoursSinceStatusChange: Math.round(hoursSinceStatusChange * 10) / 10,
        unresolvedScenarios: unresolvedCount ?? 0,
        totalScenarios: totalCount ?? 0,
        staleness,
        fixable,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cleanup] Error checking fixture ${dbFixture.api_id}: ${message}`);
      apiErrors++;
    }
  }

  return {
    staleFixtures,
    summary: {
      totalScanned: dbFixtures.length,
      staleCount: staleFixtures.length,
      apiErrors,
      durationMs: Date.now() - startTime,
    },
  };
}

// ---------------------------------------------------------------------------
// FIX MODE
// ---------------------------------------------------------------------------

async function fixStaleFixture(
  supabase: SupabaseClient,
  fixtureId: string
): Promise<FixResponse> {
  const startTime = Date.now();
  const actions: FixAction[] = [];
  let scenariosResolved = 0;
  let scenariosSkipped = 0;
  let scenariosVoided = 0;
  let scenariosAlreadyResolved = 0;
  let scenariosReconciled = 0;
  let fullyResolved = false;
  let notificationsSent = 0;

  // Load fixture from DB
  const { data: fixtureRow, error: loadErr } = await supabase
    .from('v2_league_season_fixtures')
    .select('id, api_id, home_team_id, away_team_id, status, status_changed_at, start_datetime, season_id, round')
    .eq('id', fixtureId)
    .single();

  if (loadErr || !fixtureRow) {
    throw new Error(`Fixture not found: ${fixtureId}`);
  }

  const dbFixture = fixtureRow as DbFixture;
  const idMapper = new IdMapper(supabase);

  // Fetch from Sportmonks
  const fixtureApiId = parseInt(dbFixture.api_id, 10);
  const includes = COMMON_FIXTURE_INCLUDES.split(',');
  const smResult = await sportmonksClient.getFixture(fixtureApiId, includes);

  if (!smResult.success) {
    throw new Error(`Sportmonks API error for fixture ${dbFixture.api_id}: ${smResult.error}`);
  }

  const smFixture = smResult.data;
  const mappedStatus = mapSmStatusToInternal(smFixture.status);

  // -------------------------------------------------------------------------
  // Handle abandoned / no_result
  // -------------------------------------------------------------------------
  if (mappedStatus === 'abandoned' || mappedStatus === 'no_result') {
    // Update fixture status
    if (dbFixture.status !== mappedStatus) {
      await supabase
        .from('v2_league_season_fixtures')
        .update({ status: mappedStatus })
        .eq('id', dbFixture.id);
      actions.push({ action: 'status_updated', from: dbFixture.status, to: mappedStatus });
    }

    // Void all scenarios
    const { error: voidErr } = await supabase.rpc('void_fixture_scenarios', {
      p_fixture_id: dbFixture.id,
    });

    if (voidErr) {
      console.error(`[cleanup] Error voiding scenarios: ${voidErr.message}`);
      actions.push({ action: 'void_error', reason: voidErr.message });
    } else {
      const { count } = await supabase
        .from('v2_fixture_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('fixture_id', dbFixture.id)
        .eq('is_voided', true);
      scenariosVoided = count ?? 0;
      actions.push({ action: 'scenarios_voided', count: scenariosVoided });
    }

    return {
      fixtureId: dbFixture.id,
      apiId: dbFixture.api_id,
      actions,
      summary: {
        scenariosResolved,
        scenariosSkipped,
        scenariosVoided,
        scenariosAlreadyResolved,
        scenariosReconciled,
        fullyResolved: false,
        notificationsSent,
        durationMs: Date.now() - startTime,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Handle still live/upcoming per Sportmonks
  // -------------------------------------------------------------------------
  if (mappedStatus === 'live' || mappedStatus === 'upcoming') {
    actions.push({
      action: 'no_action',
      reason: `Match is genuinely ${mappedStatus} per Sportmonks (status: "${smFixture.status}")`,
    });

    return {
      fixtureId: dbFixture.id,
      apiId: dbFixture.api_id,
      actions,
      summary: {
        scenariosResolved,
        scenariosSkipped,
        scenariosVoided,
        scenariosAlreadyResolved,
        scenariosReconciled,
        fullyResolved: false,
        notificationsSent,
        durationMs: Date.now() - startTime,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Handle completed (match finished) — full resolution pipeline
  // -------------------------------------------------------------------------

  // Update fixture status to completed if not already
  if (dbFixture.status !== 'completed' && dbFixture.status !== 'resolved') {
    await supabase
      .from('v2_league_season_fixtures')
      .update({ status: 'completed' })
      .eq('id', dbFixture.id);
    actions.push({ action: 'status_updated', from: dbFixture.status, to: 'completed' });
  }

  // Load existing fixture_results to check if powerplay data was captured
  const { data: existingResults } = await supabase
    .from('v2_fixture_results')
    .select('*')
    .eq('fixture_id', dbFixture.id)
    .single();

  // --- Phase 1: Resolve unresolved scenarios ---

  const { data: unresolvedScenarios, error: scenarioErr } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, slug, input_type, options, gang_id, is_resolved, is_voided')
    .eq('fixture_id', dbFixture.id)
    .eq('is_resolved', false)
    .eq('is_voided', false);

  if (scenarioErr) {
    throw new Error(`Error loading scenarios: ${scenarioErr.message}`);
  }

  const scenarios = (unresolvedScenarios ?? []) as DbScenario[];
  const resolvedValues = new Map<string, string>();

  // Pass null for max overs — we're resolving retroactively, not from a live snapshot
  const ctx = { homeTeamPreviousMaxOvers: null, awayTeamPreviousMaxOvers: null };

  for (const scenario of scenarios) {
    try {
      const slug = scenario.slug;

      // Handle powerplay snapshot scenarios
      if (SNAPSHOT_ONLY_SLUGS.has(slug)) {
        const resultColumn = POWERPLAY_RESULT_COLUMNS[slug];
        const existingValue = existingResults?.[resultColumn as keyof typeof existingResults];

        if (existingValue != null) {
          // Prior live-poll captured the snapshot — use it to resolve
          const numericValue = Number(existingValue);
          const options = scenario.options;
          if (options && options.length > 0) {
            const bracketStr = mapToBracket(numericValue, options);
            if (bracketStr) {
              const { error: resolveErr } = await supabase.rpc('resolve_scenario', {
                p_scenario_id: scenario.id,
                p_correct_answer: bracketStr,
              });
              if (resolveErr) {
                console.error(`[cleanup] Error resolving ${slug}: ${resolveErr.message}`);
                actions.push({ action: 'resolve_error', slug, reason: resolveErr.message });
              } else {
                scenariosResolved++;
                actions.push({ action: 'scenario_resolved', slug, answer: bracketStr });
              }
              continue;
            }
          }
        }

        // No snapshot data available — void this individual scenario
        const { error: voidIndErr } = await supabase
          .from('v2_fixture_scenarios')
          .update({ is_voided: true })
          .eq('id', scenario.id);

        if (voidIndErr) {
          console.error(`[cleanup] Error voiding ${slug}: ${voidIndErr.message}`);
        }
        scenariosVoided++;
        actions.push({
          action: 'scenario_voided',
          slug,
          reason: 'Powerplay snapshot was not captured during live polling',
        });
        continue;
      }

      // Normal scenario resolution
      let correctAnswer: string | undefined = resolvedValues.get(slug);

      if (correctAnswer === undefined) {
        const computed = await computeCorrectAnswer(
          supabase,
          dbFixture.id,
          scenario,
          smFixture,
          idMapper,
          ctx
        );
        if (computed === null) {
          scenariosSkipped++;
          actions.push({
            action: 'scenario_skipped',
            slug,
            reason: 'Could not compute correct answer from Sportmonks data',
          });
          continue;
        }
        correctAnswer = computed;
        resolvedValues.set(slug, correctAnswer);
      }

      const { error: resolveErr } = await supabase.rpc('resolve_scenario', {
        p_scenario_id: scenario.id,
        p_correct_answer: correctAnswer,
      });

      if (resolveErr) {
        console.error(`[cleanup] Error resolving scenario ${scenario.id} (${slug}): ${resolveErr.message}`);
        actions.push({ action: 'resolve_error', slug, reason: resolveErr.message });
        continue;
      }

      scenariosResolved++;
      actions.push({ action: 'scenario_resolved', slug, answer: correctAnswer });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cleanup] Error processing scenario ${scenario.id}: ${message}`);
      actions.push({ action: 'scenario_error', slug: scenario.slug, reason: message });
    }
  }

  // --- Phase 2: Reconcile already-resolved scenarios ---

  const { data: resolvedRows } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, slug, input_type, options, gang_id, is_resolved, is_voided, correct_answer')
    .eq('fixture_id', dbFixture.id)
    .eq('is_resolved', true)
    .eq('is_voided', false);

  if (resolvedRows) {
    const resolved = resolvedRows as DbScenario[];
    const recomputed = new Map<string, string>();

    for (const scenario of resolved) {
      const slug = scenario.slug;

      if (SNAPSHOT_ONLY_SLUGS.has(slug)) continue;
      if (scenario.correct_answer == null) continue;

      scenariosAlreadyResolved++;

      let newAnswer = recomputed.get(slug);
      if (newAnswer === undefined) {
        try {
          const computed = await computeCorrectAnswer(
            supabase, dbFixture.id, scenario, smFixture, idMapper, ctx
          );
          if (computed === null) continue;
          newAnswer = computed;
          recomputed.set(slug, newAnswer);
        } catch {
          continue;
        }
      }

      if (newAnswer === scenario.correct_answer) continue;

      const { error: rrErr } = await supabase.rpc('re_resolve_scenario', {
        p_scenario_id: scenario.id,
        p_correct_answer: newAnswer,
      });

      if (rrErr) {
        console.error(`[cleanup] re_resolve_scenario failed for ${scenario.id} (${slug}): ${rrErr.message}`);
        continue;
      }

      scenariosReconciled++;
      actions.push({
        action: 'scenario_reconciled',
        slug,
        answer: newAnswer,
        from: scenario.correct_answer ?? undefined,
      });
    }
  }

  // --- Phase 3: Check if fully resolved, mark, notify ---

  const { data: allResolved } = await supabase.rpc('all_scenarios_resolved', {
    p_fixture_id: dbFixture.id,
  });

  if (allResolved === true) {
    const { error: markErr } = await supabase.rpc('mark_fixture_resolved', {
      p_fixture_id: dbFixture.id,
    });

    if (markErr) {
      console.error(`[cleanup] Error marking fixture resolved: ${markErr.message}`);
      actions.push({ action: 'mark_resolved_error', reason: markErr.message });
    } else {
      fullyResolved = true;
      actions.push({ action: 'fixture_marked_resolved' });

      notificationsSent = await createResultsNotifications(supabase, dbFixture.id);
      if (notificationsSent > 0) {
        actions.push({ action: 'notifications_created', count: notificationsSent });
      }
    }
  }

  return {
    fixtureId: dbFixture.id,
    apiId: dbFixture.api_id,
    actions,
    summary: {
      scenariosResolved,
      scenariosSkipped,
      scenariosVoided,
      scenariosAlreadyResolved,
      scenariosReconciled,
      fullyResolved,
      notificationsSent,
      durationMs: Date.now() - startTime,
    },
  };
}

// ---------------------------------------------------------------------------
// Deno.serve handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    const serviceRoleKey =
      Deno.env.get('SB_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or service role key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    // Parse request body
    let body: { mode?: string; fixtureId?: string } = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mode = body.mode;

    if (mode === 'identify') {
      console.log('[cleanup] Starting stale fixture identification...');
      const result = await identifyStaleFixtures(supabase);
      console.log(
        `[cleanup] Identification complete: ${result.summary.staleCount} stale of ${result.summary.totalScanned} scanned`
      );
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'fix') {
      if (!body.fixtureId) {
        return new Response(
          JSON.stringify({ error: 'Missing fixtureId for fix mode' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[cleanup] Fixing stale fixture ${body.fixtureId}...`);
      const result = await fixStaleFixture(supabase, body.fixtureId);
      const hasErrors = result.actions.some(
        a => a.action.includes('error')
      );
      console.log(
        `[cleanup] Fix complete for ${result.apiId}: ` +
        `${result.summary.scenariosResolved} resolved, ` +
        `${result.summary.scenariosVoided} voided, ` +
        `${result.summary.scenariosReconciled} reconciled, ` +
        `fullyResolved=${result.summary.fullyResolved}`
      );
      return new Response(JSON.stringify(result), {
        status: hasErrors ? 207 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid mode. Use "identify" or "fix".' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cleanup] Unhandled error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
