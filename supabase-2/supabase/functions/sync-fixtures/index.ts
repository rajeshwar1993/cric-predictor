// =============================================================================
// sync-fixtures — Daily fixture + player sync (SYNC-CRON-001)
// Deno Edge Function
//
// Triggered by pg_cron at 23:30 UTC (5 AM IST).
// Imports IPL fixtures, teams, and player squads from Sportmonks into v2 schema.
// =============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  sportmonksClient,
  SmFixture,
  SmPlayer,
  SmTeam,
} from '../_shared/sportmonks.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncSummary {
  fixturesSynced: number;
  teamsSynced: number;
  playersSynced: number;
  errors: string[];
  durationMs: number;
}

interface ActiveSeason {
  id: string; // UUID
  api_id: string;
  league_id: string; // UUID
}

interface DbFixture {
  id: string;
  api_id: string;
  start_datetime: string;
  status: string;
}

interface DbTeam {
  id: string;
  api_id: string;
}

interface DbPlayer {
  id: string;
  api_id: string;
}

// ---------------------------------------------------------------------------
// Sportmonks status → v2_match_status mapping
// ---------------------------------------------------------------------------

function mapFixtureStatus(smStatus: string): string {
  const lower = smStatus.toLowerCase();
  if (lower === 'finished' || lower === 'won' || lower === 'draw') {
    return 'completed';
  }
  if (
    lower === 'ns' ||
    lower === 'not started' ||
    lower.includes('upcoming')
  ) {
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
  if (lower === 'no result' || lower === 'n/r') {
    return 'no_result';
  }
  if (lower === 'abandoned' || lower === 'cancl') {
    return 'abandoned';
  }
  return 'upcoming';
}

// ---------------------------------------------------------------------------
// Extract match number from round string (e.g., "1st Match" → 1)
// ---------------------------------------------------------------------------

function parseMatchNumber(round: string): number {
  const match = round.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a status should NOT be overwritten by the sync */
function isProtectedStatus(status: string): boolean {
  return ['live', 'completed', 'resolved'].includes(status);
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function syncFixtures(supabase: SupabaseClient): Promise<SyncSummary> {
  const startTime = Date.now();
  const errors: string[] = [];
  let fixturesSynced = 0;
  let teamsSynced = 0;
  let playersSynced = 0;

  // -----------------------------------------------------------------------
  // Step 1: Get active season from DB
  // -----------------------------------------------------------------------
  console.log('[sync-fixtures] Fetching active season...');

  const { data: seasonRows, error: seasonErr } = await supabase
    .from('v2_seasons')
    .select('id, api_id, league_id')
    .eq('is_active', true)
    .limit(1);

  if (seasonErr || !seasonRows || seasonRows.length === 0) {
    const msg = `No active season found: ${seasonErr?.message ?? 'empty result'}`;
    console.error(`[sync-fixtures] ${msg}`);
    return { fixturesSynced: 0, teamsSynced: 0, playersSynced: 0, errors: [msg], durationMs: Date.now() - startTime };
  }

  const activeSeason: ActiveSeason = seasonRows[0];
  const seasonApiId = parseInt(activeSeason.api_id, 10);
  console.log(`[sync-fixtures] Active season: ${activeSeason.api_id} (DB id: ${activeSeason.id})`);

  // -----------------------------------------------------------------------
  // Step 2: Fetch fixtures from Sportmonks
  // -----------------------------------------------------------------------
  console.log('[sync-fixtures] Fetching season fixtures from Sportmonks...');

  const fixturesResult = await sportmonksClient.getSeasonFixtures(seasonApiId, [
    'localteam',
    'visitorteam',
    'venue',
  ]);

  if (!fixturesResult.success) {
    const msg = `Failed to fetch fixtures: ${fixturesResult.error}`;
    console.error(`[sync-fixtures] ${msg}`);
    if (fixturesResult.rateLimited) {
      return { fixturesSynced: 0, teamsSynced: 0, playersSynced: 0, errors: [msg], durationMs: Date.now() - startTime };
    }
    return { fixturesSynced: 0, teamsSynced: 0, playersSynced: 0, errors: [msg], durationMs: Date.now() - startTime };
  }

  const smFixtures: SmFixture[] = fixturesResult.data;
  console.log(`[sync-fixtures] Fetched ${smFixtures.length} fixtures from Sportmonks`);

  // -----------------------------------------------------------------------
  // Step 3: Load existing data maps for lookups
  // -----------------------------------------------------------------------

  // Load existing teams (api_id → UUID)
  const { data: existingTeams } = await supabase
    .from('v2_league_teams')
    .select('id, api_id')
    .eq('league_id', activeSeason.league_id);

  const teamApiMap = new Map<string, string>();
  if (existingTeams) {
    for (const t of existingTeams as DbTeam[]) {
      teamApiMap.set(t.api_id, t.id);
    }
  }

  // Load existing fixtures (api_id → { id, start_datetime, status })
  const { data: existingFixtures } = await supabase
    .from('v2_league_season_fixtures')
    .select('id, api_id, start_datetime, status')
    .eq('season_id', activeSeason.id);

  const fixtureApiMap = new Map<string, DbFixture>();
  if (existingFixtures) {
    for (const f of existingFixtures as DbFixture[]) {
      fixtureApiMap.set(f.api_id, f);
    }
  }

  // Collect unique team API IDs from fixtures for squad sync
  const uniqueTeamApiIds = new Set<number>();

  // -----------------------------------------------------------------------
  // Step 4: Process each fixture
  // -----------------------------------------------------------------------
  for (const smFixture of smFixtures) {
    try {
      // --- Upsert local team ---
      const homeTeamId = await upsertTeamFromFixture(
        supabase,
        smFixture.localteam,
        smFixture.localteam_id,
        activeSeason.league_id,
        teamApiMap
      );

      // --- Upsert visitor team ---
      const awayTeamId = await upsertTeamFromFixture(
        supabase,
        smFixture.visitorteam,
        smFixture.visitorteam_id,
        activeSeason.league_id,
        teamApiMap
      );

      if (!homeTeamId || !awayTeamId) {
        errors.push(`Missing team for fixture ${smFixture.id}`);
        continue;
      }

      // Track unique teams for squad sync
      uniqueTeamApiIds.add(smFixture.localteam_id);
      uniqueTeamApiIds.add(smFixture.visitorteam_id);

      // --- Upsert fixture ---
      const fixtureApiIdStr = String(smFixture.id);
      const existingFixture = fixtureApiMap.get(fixtureApiIdStr);
      const newStatus = mapFixtureStatus(smFixture.status);
      const newStartDatetime = smFixture.starting_at;
      const matchNumber = parseMatchNumber(smFixture.round);
      const venueName = smFixture.venue?.name ?? 'TBD';
      const roundStr = smFixture.round;

      if (existingFixture) {
        // Update existing fixture — respect protected statuses
        const updateData: Record<string, unknown> = {
          venue_name: venueName,
          match_number: matchNumber,
          round: roundStr,
        };

        // Detect start_datetime change → reset pre_match_synced
        if (existingFixture.start_datetime !== newStartDatetime) {
          updateData.start_datetime = newStartDatetime;
          updateData.pre_match_synced = false;
          console.log(
            `[sync-fixtures] Fixture ${smFixture.id} rescheduled: ${existingFixture.start_datetime} → ${newStartDatetime}`
          );
        }

        // Only update status if current status is NOT protected
        if (!isProtectedStatus(existingFixture.status)) {
          updateData.status = newStatus;
          updateData.status_changed_at = new Date().toISOString();
        }

        const { error: updateErr } = await supabase
          .from('v2_league_season_fixtures')
          .update(updateData)
          .eq('id', existingFixture.id);

        if (updateErr) {
          errors.push(`Failed to update fixture ${smFixture.id}: ${updateErr.message}`);
        } else {
          fixturesSynced++;
        }
      } else {
        // Insert new fixture — use upsert on api_id to handle re-runs
        // and playoff fixtures that may share match_number with regular season
        const { error: insertErr } = await supabase
          .from('v2_league_season_fixtures')
          .upsert({
            api_id: fixtureApiIdStr,
            league_id: activeSeason.league_id,
            season_id: activeSeason.id,
            round: roundStr,
            match_number: matchNumber,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            start_datetime: newStartDatetime,
            venue_name: venueName,
            venue_id: null,
            status: newStatus,
            status_changed_at: new Date().toISOString(),
            pre_match_synced: false,
          }, { onConflict: 'api_id' });

        if (insertErr) {
          errors.push(`Failed to upsert fixture ${String(smFixture.id)}: ${insertErr.message}`);
        } else {
          fixturesSynced++;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Error processing fixture ${smFixture.id}: ${message}`);
    }
  }

  console.log(`[sync-fixtures] Fixtures synced: ${fixturesSynced}`);

  // -----------------------------------------------------------------------
  // Step 5: Sync team squads
  // -----------------------------------------------------------------------
  console.log(`[sync-fixtures] Syncing squads for ${uniqueTeamApiIds.size} teams...`);

  // Reload team map after fixture upserts (new teams may have been inserted)
  const { data: refreshedTeams } = await supabase
    .from('v2_league_teams')
    .select('id, api_id')
    .eq('league_id', activeSeason.league_id);

  const refreshedTeamMap = new Map<string, string>();
  if (refreshedTeams) {
    for (const t of refreshedTeams as DbTeam[]) {
      refreshedTeamMap.set(t.api_id, t.id);
    }
  }

  // Load existing players (api_id → UUID)
  const { data: existingPlayers } = await supabase
    .from('v2_players')
    .select('id, api_id');

  const playerApiMap = new Map<string, string>();
  if (existingPlayers) {
    for (const p of existingPlayers as DbPlayer[]) {
      playerApiMap.set(p.api_id, p.id);
    }
  }

  for (const teamApiId of uniqueTeamApiIds) {
    try {
      const teamDbId = refreshedTeamMap.get(String(teamApiId));
      if (!teamDbId) {
        errors.push(`Team ${teamApiId} not found in DB for squad sync`);
        continue;
      }

      const squadResult = await sportmonksClient.getTeamSquad(teamApiId, seasonApiId);
      if (!squadResult.success) {
        errors.push(`Failed to fetch squad for team ${teamApiId}: ${squadResult.error}`);
        continue;
      }

      const squad: SmPlayer[] = squadResult.data;
      const currentPlayerIds: string[] = [];

      for (const smPlayer of squad) {
        const playerId = await upsertPlayer(supabase, smPlayer, playerApiMap);
        if (playerId) {
          currentPlayerIds.push(playerId);

          // Upsert v2_league_season_team_players
          const { error: linkErr } = await supabase
            .from('v2_league_season_team_players')
            .upsert(
              {
                league_id: activeSeason.league_id,
                season_id: activeSeason.id,
                team_id: teamDbId,
                player_id: playerId,
              },
              { onConflict: 'season_id,team_id,player_id' }
            );

          if (linkErr) {
            errors.push(`Failed to link player ${smPlayer.id} to team ${teamApiId}: ${linkErr.message}`);
          } else {
            playersSynced++;
          }
        }
      }

      // Delete stale player-team links (handles mid-season trades)
      if (currentPlayerIds.length > 0) {
        const { error: deleteErr } = await supabase
          .from('v2_league_season_team_players')
          .delete()
          .eq('season_id', activeSeason.id)
          .eq('team_id', teamDbId)
          .not('player_id', 'in', `(${currentPlayerIds.join(',')})`);

        if (deleteErr) {
          errors.push(`Failed to clean stale players for team ${teamApiId}: ${deleteErr.message}`);
        }
      }

      teamsSynced++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Error syncing squad for team ${teamApiId}: ${message}`);
    }
  }

  console.log(`[sync-fixtures] Teams synced: ${teamsSynced}, Players synced: ${playersSynced}`);

  const durationMs = Date.now() - startTime;
  console.log(`[sync-fixtures] Completed in ${durationMs}ms`);

  return { fixturesSynced, teamsSynced, playersSynced, errors, durationMs };
}

// ---------------------------------------------------------------------------
// Team upsert helper
// ---------------------------------------------------------------------------

/**
 * Upsert a team into v2_league_teams.
 * INSERT only if the team does not exist. Never overwrite name/color/logo from seed data.
 * Returns the DB UUID for the team.
 */
async function upsertTeamFromFixture(
  supabase: SupabaseClient,
  smTeam: SmTeam | undefined,
  teamApiId: number,
  leagueId: string,
  teamApiMap: Map<string, string>
): Promise<string | null> {
  const apiIdStr = String(teamApiId);
  const existing = teamApiMap.get(apiIdStr);
  if (existing) return existing;

  // Team not in DB yet — insert it (will only happen for newly added teams)
  if (!smTeam) {
    console.warn(`[sync-fixtures] No team data for API ID ${teamApiId}, cannot insert`);
    return null;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('v2_league_teams')
    .insert({
      api_id: apiIdStr,
      league_id: leagueId,
      name: smTeam.name,
      code: smTeam.code,
      color: '#666666', // Default — curated colors come from seed data
      logo_url: smTeam.image_path,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertErr) {
    // Could be a race condition / duplicate — try fetching
    const { data: refetch } = await supabase
      .from('v2_league_teams')
      .select('id')
      .eq('api_id', apiIdStr)
      .single();

    if (refetch) {
      teamApiMap.set(apiIdStr, refetch.id);
      return refetch.id;
    }
    console.error(`[sync-fixtures] Failed to insert team ${teamApiId}: ${insertErr.message}`);
    return null;
  }

  teamApiMap.set(apiIdStr, inserted.id);
  return inserted.id;
}

// ---------------------------------------------------------------------------
// Player upsert helper
// ---------------------------------------------------------------------------

/**
 * Upsert a player into v2_players.
 * Updates role/batting_style/bowling_style on existing players.
 * Returns the DB UUID for the player.
 */
async function upsertPlayer(
  supabase: SupabaseClient,
  smPlayer: SmPlayer,
  playerApiMap: Map<string, string>
): Promise<string | null> {
  const apiIdStr = String(smPlayer.id);
  const existing = playerApiMap.get(apiIdStr);

  const playerData = {
    api_id: apiIdStr,
    name: smPlayer.fullname,
    role: smPlayer.position?.name ?? null,
    batting_style: smPlayer.battingstyle ?? null,
    bowling_style: smPlayer.bowlingstyle ?? null,
    is_active: true,
  };

  if (existing) {
    // Update existing player metadata
    const { error: updateErr } = await supabase
      .from('v2_players')
      .update({
        name: playerData.name,
        role: playerData.role,
        batting_style: playerData.batting_style,
        bowling_style: playerData.bowling_style,
      })
      .eq('id', existing);

    if (updateErr) {
      console.error(`[sync-fixtures] Failed to update player ${smPlayer.id}: ${updateErr.message}`);
    }
    return existing;
  }

  // Insert new player
  const { data: inserted, error: insertErr } = await supabase
    .from('v2_players')
    .insert(playerData)
    .select('id')
    .single();

  if (insertErr) {
    // Race condition — try fetching
    const { data: refetch } = await supabase
      .from('v2_players')
      .select('id')
      .eq('api_id', apiIdStr)
      .single();

    if (refetch) {
      playerApiMap.set(apiIdStr, refetch.id);
      return refetch.id;
    }
    console.error(`[sync-fixtures] Failed to insert player ${smPlayer.id}: ${insertErr.message}`);
    return null;
  }

  playerApiMap.set(apiIdStr, inserted.id);
  return inserted.id;
}

// ---------------------------------------------------------------------------
// Edge Function handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // Service role key: try custom secret first, then auto-injected, then Authorization header
    // Supabase reserves SUPABASE_* prefix so custom secret uses SB_SERVICE_ROLE_KEY
    const serviceRoleKey =
      Deno.env.get('SB_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or service role key. Set SB_SERVICE_ROLE_KEY via: supabase secrets set SB_SERVICE_ROLE_KEY=eyJ...' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-fixtures] Using key length: ${String(serviceRoleKey.length)}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    console.log(`[sync-fixtures] Starting daily fixture sync... (URL: ${supabaseUrl}, key length: ${serviceRoleKey.length})`);
    const summary = await syncFixtures(supabase);

    const hasErrors = summary.errors.length > 0;
    if (hasErrors) {
      console.error(
        `[sync-fixtures] Completed with ${summary.errors.length} errors:`,
        summary.errors
      );
    }

    return new Response(JSON.stringify(summary), {
      status: hasErrors ? 207 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sync-fixtures] Unhandled error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
