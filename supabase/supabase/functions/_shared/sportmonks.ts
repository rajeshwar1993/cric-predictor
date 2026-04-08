// =============================================================================
// Sportmonks Cricket API Client
// SYNC-LIB-001 — Shared module for all edge functions and cron jobs
// =============================================================================

// ---------------------------------------------------------------------------
// TypeScript Interfaces — based on actual Sportmonks response samples
// ---------------------------------------------------------------------------

/** Position within a player record */
export interface SmPosition {
  resource: string;
  id: number;
  name: string;
}

/** Player squad membership info */
export interface SmSquadInfo {
  season_id: number;
}

/** Player as returned by team squad endpoint */
export interface SmPlayer {
  resource: string;
  id: number;
  country_id: number;
  firstname: string;
  lastname: string;
  fullname: string;
  image_path: string;
  dateofbirth: string | null;
  gender: string;
  battingstyle: string | null;
  bowlingstyle: string | null;
  position: SmPosition | null;
  updated_at: string;
  squad?: SmSquadInfo;
}

/** Season within a league */
export interface SmSeason {
  resource: string;
  id: number;
  league_id: number;
  name: string;
  code: string;
  updated_at: string;
}

/** League (top-level or nested in fixture) */
export interface SmLeague {
  resource: string;
  id: number;
  season_id: number;
  country_id: number;
  name: string;
  code: string;
  image_path: string;
  type: string;
  updated_at: string;
  seasons?: SmSeason[];
}

/** Team as returned by Sportmonks */
export interface SmTeam {
  resource: string;
  id: number;
  name: string;
  code: string;
  image_path: string;
  country_id: number;
  national_team: boolean;
  updated_at: string;
  squad?: SmPlayer[];
}

/** Venue nested in fixture */
export interface SmVenue {
  resource: string;
  id: number;
  country_id: number;
  name: string;
  city: string;
  image_path: string;
  capacity: number | null;
  floodlight: boolean;
  updated_at: string;
}

/** DL data within a fixture */
export interface SmDlData {
  score: number | null;
  overs: number | null;
  wickets_out: number | null;
}

/** Runs per innings within a fixture */
export interface SmRun {
  resource: string;
  id: number;
  fixture_id: number;
  team_id: number;
  inning: number;
  score: number;
  wickets: number;
  overs: number;
  pp1: string | null;
  pp2: string | null;
  pp3: string | null;
  updated_at: string;
}

/** Batting entry within a fixture */
export interface SmBatting {
  resource: string;
  id: number;
  sort: number;
  fixture_id: number;
  team_id: number;
  active: boolean;
  scoreboard: string;
  player_id: number;
  wicket_id: number | null;
  ball: number;
  score_id: number | null;
  score: number;
  four_x: number;
  six_x: number;
  catch_stump_player_id: number | null;
  runout_by_id: number | null;
  batsmanout_id: number | null;
  bowling_player_id: number | null;
  fow_score: number;
  fow_balls: number;
  rate: number;
  updated_at: string;
}

/** Bowling entry within a fixture */
export interface SmBowling {
  resource: string;
  id: number;
  sort: number;
  fixture_id: number;
  team_id: number;
  active: boolean;
  scoreboard: string;
  player_id: number;
  overs: number;
  medians: number;
  runs: number;
  wickets: number;
  wide: number;
  noball: number;
  rate: number;
  updated_at: string;
}

/** Fixture as returned by Sportmonks (season fixtures list and single fixture) */
export interface SmFixture {
  resource: string;
  id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  round: string;
  localteam_id: number;
  visitorteam_id: number;
  starting_at: string;
  type: string;
  live: boolean;
  status: string;
  last_period: string | null;
  note: string | null;
  venue_id: number | null;
  toss_won_team_id: number | null;
  winner_team_id: number | null;
  draw_noresult: string | null;
  man_of_match_id: number | null;
  man_of_series_id: number | null;
  total_overs_played: number | null;
  elected: string | null;
  super_over: boolean;
  follow_on: boolean;
  localteam_dl_data: SmDlData;
  visitorteam_dl_data: SmDlData;
  rpc_overs: number | null;
  rpc_target: number | null;
  // Included relations (present when requested via `include` param)
  localteam?: SmTeam;
  visitorteam?: SmTeam;
  venue?: SmVenue;
  runs?: SmRun[];
  batting?: SmBatting[];
  bowling?: SmBowling[];
  manofmatch?: SmPlayer;
  tosswon?: SmTeam;
}

// ---------------------------------------------------------------------------
// API Response wrappers
// ---------------------------------------------------------------------------

export interface SmSingleResponse<T> {
  data: T;
}

export interface SmListResponse<T> {
  data: T[];
}

// ---------------------------------------------------------------------------
// Client result types
// ---------------------------------------------------------------------------

export type SportmonksResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; rateLimited?: boolean };

// ---------------------------------------------------------------------------
// Common includes
// ---------------------------------------------------------------------------

export const COMMON_FIXTURE_INCLUDES =
  'batting,bowling,runs,manofmatch,tosswon,localteam,visitorteam';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://cricket.sportmonks.com/api/v2.0';
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1000;

function getConfig(): { token: string; baseUrl: string } {
  const token = Deno.env.get('SPORTMONKS_API_TOKEN');
  if (!token) {
    throw new Error('SPORTMONKS_API_TOKEN environment variable is not set');
  }
  const baseUrl =
    Deno.env.get('SPORTMONKS_BASE_URL') || DEFAULT_BASE_URL;
  return { token, baseUrl };
}

// ---------------------------------------------------------------------------
// Internal fetch with retry + rate-limit handling
// ---------------------------------------------------------------------------

async function fetchWithRetry<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<SportmonksResult<T>> {
  const { token, baseUrl } = getConfig();

  const url = new URL(`${baseUrl}/${endpoint}`);
  url.searchParams.set('api_token', token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // Redact token from any logged URL
  const safeUrl = url.toString().replace(token, '[REDACTED]');

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startMs = Date.now();

    try {
      const response = await fetch(url.toString());
      const durationMs = Date.now() - startMs;

      console.log(
        `[sportmonks] ${response.status} ${endpoint} (${durationMs}ms, attempt ${attempt + 1})`
      );

      // Rate limited — do NOT retry
      if (response.status === 429) {
        console.warn(`[sportmonks] Rate limited on ${safeUrl}`);
        return {
          success: false,
          error: `Rate limited (429) on ${endpoint}`,
          rateLimited: true,
        };
      }

      // Server error — retry
      if (response.status >= 500) {
        lastError = `Server error ${response.status} on ${endpoint}`;
        if (attempt < MAX_RETRIES) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(
            `[sportmonks] ${lastError} — retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
          );
          await sleep(backoff);
          continue;
        }
        return { success: false, error: lastError };
      }

      // Client error (4xx except 429) — no retry
      if (response.status >= 400) {
        const body = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status} on ${endpoint}: ${body.slice(0, 500)}`,
        };
      }

      // Success — parse JSON
      const json = await response.json();
      if (!json || typeof json !== 'object') {
        return {
          success: false,
          error: `Invalid JSON response from ${endpoint}`,
        };
      }

      return { success: true, data: json as T };
    } catch (err: unknown) {
      // Network error — retry
      const message = err instanceof Error ? err.message : String(err);
      lastError = `Network error on ${endpoint}: ${message}`;

      if (attempt < MAX_RETRIES) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `[sportmonks] ${lastError} — retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        );
        await sleep(backoff);
        continue;
      }
    }
  }

  return { success: false, error: lastError ?? 'Unknown error' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API methods
// ---------------------------------------------------------------------------

/**
 * Get all seasons for a league.
 * Endpoint: /leagues/{leagueId}?include=seasons
 */
export async function getLeagueSeasons(
  leagueId: number
): Promise<SportmonksResult<SmSeason[]>> {
  const result = await fetchWithRetry<SmSingleResponse<SmLeague>>(
    `leagues/${leagueId}`,
    { include: 'seasons' }
  );
  if (!result.success) return result;

  const seasons = result.data.data?.seasons;
  if (!seasons || !Array.isArray(seasons)) {
    return {
      success: false,
      error: `No seasons array in league ${leagueId} response`,
    };
  }
  return { success: true, data: seasons };
}

/**
 * Get team squad for a specific season.
 * Endpoint: /teams/{teamId}/squad/{seasonId}
 */
export async function getTeamSquad(
  teamId: number,
  seasonId: number
): Promise<SportmonksResult<SmPlayer[]>> {
  const result = await fetchWithRetry<SmSingleResponse<SmTeam>>(
    `teams/${teamId}/squad/${seasonId}`
  );
  if (!result.success) return result;

  const squad = result.data.data?.squad;
  if (!squad || !Array.isArray(squad)) {
    return {
      success: false,
      error: `No squad array in team ${teamId} response`,
    };
  }
  return { success: true, data: squad };
}

/**
 * Get all fixtures for a season.
 * Endpoint: /seasons/{seasonId}?include=fixtures[,localteam,visitorteam,venue,...]
 *
 * Note: The Sportmonks API returns fixtures nested under the season response
 * at /fixtures/... for a season. We use the fixtures endpoint filtered by season.
 */
export async function getSeasonFixtures(
  seasonId: number,
  includes?: string[]
): Promise<SportmonksResult<SmFixture[]>> {
  const params: Record<string, string> = {};
  if (includes && includes.length > 0) {
    params.include = includes.join(',');
  }

  const result = await fetchWithRetry<SmListResponse<SmFixture>>(
    `fixtures?filter[season_id]=${seasonId}`,
    params
  );
  if (!result.success) return result;

  const fixtures = result.data.data;
  if (!fixtures || !Array.isArray(fixtures)) {
    return {
      success: false,
      error: `No fixtures array in season ${seasonId} response`,
    };
  }
  return { success: true, data: fixtures };
}

/**
 * Get a single fixture by ID.
 * Endpoint: /fixtures/{fixtureId}?include=...
 */
export async function getFixture(
  fixtureId: number,
  includes?: string[]
): Promise<SportmonksResult<SmFixture>> {
  const params: Record<string, string> = {};
  if (includes && includes.length > 0) {
    params.include = includes.join(',');
  }

  const result = await fetchWithRetry<SmSingleResponse<SmFixture>>(
    `fixtures/${fixtureId}`,
    params
  );
  if (!result.success) return result;

  const fixture = result.data.data;
  if (!fixture || typeof fixture !== 'object' || !fixture.id) {
    return {
      success: false,
      error: `Invalid fixture data for fixture ${fixtureId}`,
    };
  }
  return { success: true, data: fixture };
}

/**
 * Get all current live fixtures.
 * Endpoint: /livescores?include=...
 */
export async function getLiveScores(
  includes?: string[]
): Promise<SportmonksResult<SmFixture[]>> {
  const params: Record<string, string> = {};
  if (includes && includes.length > 0) {
    params.include = includes.join(',');
  }

  const result = await fetchWithRetry<SmListResponse<SmFixture>>(
    'livescores',
    params
  );
  if (!result.success) return result;

  const fixtures = result.data.data;
  if (!fixtures || !Array.isArray(fixtures)) {
    // Empty data array is valid — no live matches
    return { success: true, data: [] };
  }
  return { success: true, data: fixtures };
}

// ---------------------------------------------------------------------------
// Convenience export for named import
// ---------------------------------------------------------------------------

export const sportmonksClient = {
  getLeagueSeasons,
  getTeamSquad,
  getSeasonFixtures,
  getFixture,
  getLiveScores,
};
