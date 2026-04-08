// =============================================================================
// Sportmonks Response Extractors
// LIVE-LIB-001 — One function per scenario slug to extract resolved values
// from Sportmonks fixture responses.
//
// All extractors return ExtractResult. Player/team extractors return
// Sportmonks API IDs (integers) — the caller maps to internal UUIDs.
// =============================================================================

import type { SmFixture, SmBatting, SmBowling, SmRun } from './sportmonks.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExtractResult =
  | { resolved: true; value: string }
  | { resolved: false; reason?: string };

/**
 * Fields extracted for the live scorecard upsert into v2_fixture_live_scores.
 * All fields are optional — the extractor returns what's available.
 */
export interface LiveScorecardData {
  home_team_score: string | null;
  away_team_score: string | null;
  home_team_overs: number | null;
  away_team_overs: number | null;
  batting_team_api_id: number | null;
  current_run_rate: number | null;
  striker_name: string | null;
  striker_score: string | null;
  non_striker_name: string | null;
  non_striker_score: string | null;
  current_bowler: string | null;
  current_partnership: string | null;
}

// ---------------------------------------------------------------------------
// Scenario slug union — for exhaustiveness checking
// ---------------------------------------------------------------------------

export type ScenarioSlug =
  | 'toss_winner'
  | 'match_winner'
  | 'top_scorer'
  | 'top_wicket_taker'
  | 'most_sixes_player'
  | 'player_of_match'
  | 'home_team_innings_score'
  | 'away_team_innings_score'
  | 'home_team_powerplay_runs'
  | 'away_team_powerplay_runs'
  | 'home_team_powerplay_wickets_lost'
  | 'away_team_powerplay_wickets_lost'
  | 'total_match_runs'
  | 'total_match_sixes'
  | 'total_match_wickets'
  | 'first_wicket_over'
  | 'fifty_scored'
  | 'bowler_three_wickets'
  | 'super_over';

// ---------------------------------------------------------------------------
// Bracket Mapping Utility
// ---------------------------------------------------------------------------

/**
 * Maps a raw numeric value to the matching bracket string from scenario options.
 *
 * Bracket format examples:
 *   "<140"       — matches values strictly less than 140
 *   "140-159"    — matches values from 140 to 159 inclusive
 *   "200+"       — matches values 200 and above
 *   "0", "1"     — exact match (for wickets: 0, 1, 2, 3)
 *   "4+"         — matches values 4 and above
 *   "4-5"        — matches values from 4 to 5 inclusive
 *   "6+"         — matches values 6 and above
 *
 * Returns null if no bracket matches.
 */
export function mapToBracket(value: number, options: string[]): string | null {
  for (const option of options) {
    const trimmed = option.trim();

    // Exact number match: "0", "1", "2", "3"
    if (/^\d+$/.test(trimmed)) {
      if (value === parseInt(trimmed, 10)) {
        return option;
      }
      continue;
    }

    // Less-than: "<140"
    const ltMatch = trimmed.match(/^<(\d+)$/);
    if (ltMatch) {
      if (value < parseInt(ltMatch[1], 10)) {
        return option;
      }
      continue;
    }

    // Plus (greater-or-equal): "200+", "4+", "6+"
    const plusMatch = trimmed.match(/^(\d+)\+$/);
    if (plusMatch) {
      if (value >= parseInt(plusMatch[1], 10)) {
        return option;
      }
      continue;
    }

    // Range: "140-159", "4-5"
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const low = parseInt(rangeMatch[1], 10);
      const high = parseInt(rangeMatch[2], 10);
      if (value >= low && value <= high) {
        return option;
      }
      continue;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: get runs entry for a specific team
// ---------------------------------------------------------------------------

function getRunsForTeam(fixture: SmFixture, teamId: number): SmRun | null {
  if (!fixture.runs || fixture.runs.length === 0) return null;
  // Filter by team_id, NOT by inning number (home team may bat second)
  return fixture.runs.find((r) => r.team_id === teamId) ?? null;
}

// ---------------------------------------------------------------------------
// Helper: get first innings batting entries
// ---------------------------------------------------------------------------

function getFirstInningsBatting(fixture: SmFixture): SmBatting[] {
  if (!fixture.batting || fixture.batting.length === 0) return [];
  return fixture.batting.filter((b) => b.scoreboard === 'S1');
}

// ---------------------------------------------------------------------------
// Scenario Extractors
// ---------------------------------------------------------------------------

/**
 * Scenario 1: toss_winner
 * Returns the Sportmonks team API ID of the toss winner.
 */
export function extractTossWinner(fixture: SmFixture): ExtractResult {
  if (fixture.toss_won_team_id == null) {
    return { resolved: false, reason: 'toss_won_team_id is null' };
  }
  return { resolved: true, value: String(fixture.toss_won_team_id) };
}

/**
 * Scenario 2: match_winner
 * Returns the Sportmonks team API ID of the match winner.
 */
export function extractMatchWinner(fixture: SmFixture): ExtractResult {
  if (fixture.winner_team_id == null) {
    return { resolved: false, reason: 'winner_team_id is null' };
  }
  return { resolved: true, value: String(fixture.winner_team_id) };
}

/**
 * Scenario 3: top_scorer
 * Returns the Sportmonks player API ID of the top run scorer.
 * Tiebreaker: fewer balls faced.
 */
export function extractTopScorer(fixture: SmFixture): ExtractResult {
  if (!fixture.batting || fixture.batting.length === 0) {
    return { resolved: false, reason: 'No batting data available' };
  }

  // Only resolve when match is finished — mid-match batting data is incomplete
  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  let topPlayer: SmBatting | null = null;
  for (const b of fixture.batting) {
    if (!topPlayer) {
      topPlayer = b;
      continue;
    }
    if (
      b.score > topPlayer.score ||
      (b.score === topPlayer.score && b.ball < topPlayer.ball)
    ) {
      topPlayer = b;
    }
  }

  if (!topPlayer) {
    return { resolved: false, reason: 'No batting entries found' };
  }

  return { resolved: true, value: String(topPlayer.player_id) };
}

/**
 * Scenario 4: top_wicket_taker
 * Returns the Sportmonks player API ID of the top wicket-taker.
 * Tiebreaker: fewer runs conceded.
 */
export function extractTopWicketTaker(fixture: SmFixture): ExtractResult {
  if (!fixture.bowling || fixture.bowling.length === 0) {
    return { resolved: false, reason: 'No bowling data available' };
  }

  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  let topBowler: SmBowling | null = null;
  for (const b of fixture.bowling) {
    if (!topBowler) {
      topBowler = b;
      continue;
    }
    if (
      b.wickets > topBowler.wickets ||
      (b.wickets === topBowler.wickets && b.runs < topBowler.runs)
    ) {
      topBowler = b;
    }
  }

  if (!topBowler) {
    return { resolved: false, reason: 'No bowling entries found' };
  }

  return { resolved: true, value: String(topBowler.player_id) };
}

/**
 * Scenario 5: most_sixes_player
 * Returns the Sportmonks player API ID of the player who hit the most sixes.
 * Aggregates across both innings (handles super over edge case).
 * Tiebreaker: fewer balls faced.
 */
export function extractMostSixesPlayer(fixture: SmFixture): ExtractResult {
  if (!fixture.batting || fixture.batting.length === 0) {
    return { resolved: false, reason: 'No batting data available' };
  }

  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  // Aggregate six_x and balls per player across both innings
  const playerStats = new Map<number, { sixes: number; balls: number }>();
  for (const b of fixture.batting) {
    const existing = playerStats.get(b.player_id);
    if (existing) {
      existing.sixes += b.six_x;
      existing.balls += b.ball;
    } else {
      playerStats.set(b.player_id, { sixes: b.six_x, balls: b.ball });
    }
  }

  let topPlayerId: number | null = null;
  let topSixes = -1;
  let topBalls = Infinity;

  for (const [playerId, stats] of playerStats) {
    if (
      stats.sixes > topSixes ||
      (stats.sixes === topSixes && stats.balls < topBalls)
    ) {
      topPlayerId = playerId;
      topSixes = stats.sixes;
      topBalls = stats.balls;
    }
  }

  if (topPlayerId == null) {
    return { resolved: false, reason: 'No batting entries found' };
  }

  return { resolved: true, value: String(topPlayerId) };
}

/**
 * Scenario 6: player_of_match
 * Returns the Sportmonks player API ID. May be null for hours post-match.
 */
export function extractPlayerOfMatch(fixture: SmFixture): ExtractResult {
  if (fixture.man_of_match_id == null) {
    return { resolved: false, reason: 'man_of_match_id is null (may take hours post-match)' };
  }
  return { resolved: true, value: String(fixture.man_of_match_id) };
}

/**
 * Scenario 7: home_team_innings_score
 * Returns the raw score (numeric) as a string. Caller maps to bracket.
 * Uses team_id filter, NOT inning number (home may bat second).
 */
export function extractHomeTeamInningsScore(fixture: SmFixture): ExtractResult {
  const runs = getRunsForTeam(fixture, fixture.localteam_id);
  if (!runs) {
    return { resolved: false, reason: 'No runs data for home team' };
  }

  // Only resolve after the team's innings is complete (overs == 20 for T20,
  // or match is finished — team may be chased out early)
  const status = fixture.status?.toLowerCase();
  const isFinished = status === 'finished';
  const isInningsComplete = runs.overs >= 20 || runs.wickets >= 10;

  if (!isFinished && !isInningsComplete) {
    return { resolved: false, reason: 'Home team innings not complete' };
  }

  return { resolved: true, value: String(runs.score) };
}

/**
 * Scenario 8: away_team_innings_score
 * Same logic as home_team_innings_score but for visitorteam.
 */
export function extractAwayTeamInningsScore(fixture: SmFixture): ExtractResult {
  const runs = getRunsForTeam(fixture, fixture.visitorteam_id);
  if (!runs) {
    return { resolved: false, reason: 'No runs data for away team' };
  }

  const status = fixture.status?.toLowerCase();
  const isFinished = status === 'finished';
  const isInningsComplete = runs.overs >= 20 || runs.wickets >= 10;

  if (!isFinished && !isInningsComplete) {
    return { resolved: false, reason: 'Away team innings not complete' };
  }

  return { resolved: true, value: String(runs.score) };
}

/**
 * Scenario 9: home_team_powerplay_runs
 * Captured live when home team's max overs first crosses 6.0.
 * previousMaxOvers is the previously tracked max for this team.
 * Returns the score at the time of the powerplay snapshot.
 */
export function extractHomeTeamPowerplayRuns(
  fixture: SmFixture,
  previousMaxOvers: number | null
): ExtractResult {
  return extractPowerplayRuns(fixture, fixture.localteam_id, previousMaxOvers);
}

/**
 * Scenario 10: away_team_powerplay_runs
 */
export function extractAwayTeamPowerplayRuns(
  fixture: SmFixture,
  previousMaxOvers: number | null
): ExtractResult {
  return extractPowerplayRuns(fixture, fixture.visitorteam_id, previousMaxOvers);
}

/**
 * Scenario 11: home_team_powerplay_wickets_lost
 * Captured at the same snapshot as powerplay runs.
 */
export function extractHomeTeamPowerplayWickets(
  fixture: SmFixture,
  previousMaxOvers: number | null
): ExtractResult {
  return extractPowerplayWickets(fixture, fixture.localteam_id, previousMaxOvers);
}

/**
 * Scenario 12: away_team_powerplay_wickets_lost
 */
export function extractAwayTeamPowerplayWickets(
  fixture: SmFixture,
  previousMaxOvers: number | null
): ExtractResult {
  return extractPowerplayWickets(fixture, fixture.visitorteam_id, previousMaxOvers);
}

/**
 * Scenario 13: total_match_runs
 * Sum of score across all innings. Only resolve when match is finished.
 */
export function extractTotalMatchRuns(fixture: SmFixture): ExtractResult {
  if (!fixture.runs || fixture.runs.length === 0) {
    return { resolved: false, reason: 'No runs data available' };
  }

  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  const total = fixture.runs.reduce((sum, r) => sum + r.score, 0);
  return { resolved: true, value: String(total) };
}

/**
 * Scenario 14: total_match_sixes
 * Sum of six_x across all batting entries. Only resolve when match is finished.
 */
export function extractTotalMatchSixes(fixture: SmFixture): ExtractResult {
  if (!fixture.batting || fixture.batting.length === 0) {
    return { resolved: false, reason: 'No batting data available' };
  }

  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  const total = fixture.batting.reduce((sum, b) => sum + b.six_x, 0);
  return { resolved: true, value: String(total) };
}

/**
 * Scenario 15: total_match_wickets
 * Sum of wickets from runs include (not batting). Only when finished.
 */
export function extractTotalMatchWickets(fixture: SmFixture): ExtractResult {
  if (!fixture.runs || fixture.runs.length === 0) {
    return { resolved: false, reason: 'No runs data available' };
  }

  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  const total = fixture.runs.reduce((sum, r) => sum + r.wickets, 0);
  return { resolved: true, value: String(total) };
}

/**
 * Scenario 17: first_wicket_over
 * Finds minimum fow_balls in first innings entries (where fow_balls > 0).
 * Converts to over number: floor(fow_balls) + 1.
 * Returns the raw over number as a string (caller maps to bracket).
 */
export function extractFirstWicketOver(fixture: SmFixture): ExtractResult {
  const firstInningsBatting = getFirstInningsBatting(fixture);
  if (firstInningsBatting.length === 0) {
    return { resolved: false, reason: 'No first innings batting data' };
  }

  // Find entries with fow_balls > 0 (dismissed batsmen)
  const dismissed = firstInningsBatting.filter((b) => b.fow_balls > 0);
  if (dismissed.length === 0) {
    return { resolved: false, reason: 'No wickets fallen yet in first innings' };
  }

  const minFowBalls = Math.min(...dismissed.map((b) => b.fow_balls));
  // Convert X.Y format to over number: floor(X) + 1
  // e.g., 6.2 means after 6 overs and 2 balls = wicket in over 7
  const overNumber = Math.floor(minFowBalls) + 1;

  return { resolved: true, value: String(overNumber) };
}

/**
 * Scenario 18: fifty_scored
 * Returns "Yes" or "No". Can resolve mid-match (as soon as any 50 is scored).
 * For "No" answer, requires match to be finished.
 */
export function extractFiftyScored(fixture: SmFixture): ExtractResult {
  if (!fixture.batting || fixture.batting.length === 0) {
    return { resolved: false, reason: 'No batting data available' };
  }

  const hasFifty = fixture.batting.some((b) => b.score >= 50);
  if (hasFifty) {
    return { resolved: true, value: 'Yes' };
  }

  // Can only confirm "No" when match is finished
  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'No fifty yet, match still in progress' };
  }

  return { resolved: true, value: 'No' };
}

/**
 * Scenario 19: bowler_three_wickets
 * Returns "Yes" or "No". Can resolve mid-match (as soon as any bowler takes 3+).
 * For "No" answer, requires match to be finished.
 */
export function extractBowlerThreeWickets(fixture: SmFixture): ExtractResult {
  if (!fixture.bowling || fixture.bowling.length === 0) {
    return { resolved: false, reason: 'No bowling data available' };
  }

  const hasThreeWickets = fixture.bowling.some((b) => b.wickets >= 3);
  if (hasThreeWickets) {
    return { resolved: true, value: 'Yes' };
  }

  // Can only confirm "No" when match is finished
  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'No 3-wicket haul yet, match still in progress' };
  }

  return { resolved: true, value: 'No' };
}

/**
 * Scenario 20: super_over
 * Returns "Yes" or "No". Only resolve when match is finished.
 */
export function extractSuperOver(fixture: SmFixture): ExtractResult {
  const status = fixture.status?.toLowerCase();
  if (status !== 'finished') {
    return { resolved: false, reason: 'Match not finished yet' };
  }

  return { resolved: true, value: fixture.super_over ? 'Yes' : 'No' };
}

// ---------------------------------------------------------------------------
// Live Scorecard Extractor
// ---------------------------------------------------------------------------

/**
 * Extracts all fields needed for v2_fixture_live_scores.
 * Returns structured data rather than ExtractResult.
 */
export function extractLiveScorecard(fixture: SmFixture): LiveScorecardData | null {
  if (!fixture.runs || fixture.runs.length === 0) {
    return null;
  }

  // Determine which team is currently batting
  // The team with the higher inning number is currently batting,
  // or if only one innings exists, that team is batting
  const sortedRuns = [...fixture.runs].sort((a, b) => b.inning - a.inning);
  const currentInningsRun = sortedRuns[0];
  const battingTeamApiId = currentInningsRun.team_id;

  // Get runs for each team
  const homeRuns = getRunsForTeam(fixture, fixture.localteam_id);
  const awayRuns = getRunsForTeam(fixture, fixture.visitorteam_id);

  // Format score strings: "score/wickets (overs)"
  const formatScore = (runs: SmRun | null): string | null => {
    if (!runs) return null;
    return `${runs.score}/${runs.wickets}`;
  };

  // Find active batsmen (on-strike and non-striker)
  let strikerName: string | null = null;
  let strikerScore: string | null = null;
  let nonStrikerName: string | null = null;
  let nonStrikerScore: string | null = null;

  if (fixture.batting) {
    // Active batsmen have active=true in the current innings
    const activeBatsmen = fixture.batting.filter(
      (b) => b.active && b.team_id === battingTeamApiId
    );

    // Sort by sort order — first active is typically the striker
    activeBatsmen.sort((a, b) => a.sort - b.sort);

    if (activeBatsmen.length >= 1) {
      const striker = activeBatsmen[0];
      strikerName = String(striker.player_id);
      strikerScore = `${striker.score} (${striker.ball})`;
    }
    if (activeBatsmen.length >= 2) {
      const nonStriker = activeBatsmen[1];
      nonStrikerName = String(nonStriker.player_id);
      nonStrikerScore = `${nonStriker.score} (${nonStriker.ball})`;
    }
  }

  // Find active bowler
  let currentBowler: string | null = null;
  if (fixture.bowling) {
    // Active bowler has active=true and is bowling against the batting team
    const activeBowler = fixture.bowling.find(
      (b) => b.active && b.team_id !== battingTeamApiId
    );
    if (activeBowler) {
      currentBowler = `${activeBowler.player_id}: ${activeBowler.overs}-${activeBowler.medians}-${activeBowler.runs}-${activeBowler.wickets}`;
    }
  }

  // Current run rate
  const currentRunRate =
    currentInningsRun.overs > 0
      ? Math.round((currentInningsRun.score / currentInningsRun.overs) * 100) / 100
      : null;

  return {
    home_team_score: formatScore(homeRuns),
    away_team_score: formatScore(awayRuns),
    home_team_overs: homeRuns?.overs ?? null,
    away_team_overs: awayRuns?.overs ?? null,
    batting_team_api_id: battingTeamApiId,
    current_run_rate: currentRunRate,
    last_6_balls: null, // Not directly available from fixture endpoint
    striker_name: strikerName,
    striker_score: strikerScore,
    non_striker_name: nonStrikerName,
    non_striker_score: nonStrikerScore,
    current_bowler: currentBowler,
    current_partnership: null, // Would need calculated from batting entries
  };
}

// ---------------------------------------------------------------------------
// Internal Powerplay Helpers
// ---------------------------------------------------------------------------

/**
 * Shared powerplay runs extraction logic.
 * Captures the score when a team's overs first cross >= 6.0.
 */
function extractPowerplayRuns(
  fixture: SmFixture,
  teamId: number,
  previousMaxOvers: number | null
): ExtractResult {
  const runs = getRunsForTeam(fixture, teamId);
  if (!runs) {
    return { resolved: false, reason: 'No runs data for team' };
  }

  const currentOvers = runs.overs;

  // Already captured previously — previousMaxOvers >= 6 means we already
  // crossed the threshold. This should never happen because the cron
  // won't call this extractor once the scenario is resolved, but defend anyway.
  if (previousMaxOvers != null && previousMaxOvers >= 6) {
    return { resolved: false, reason: 'Powerplay already captured' };
  }

  // Haven't reached 6 overs yet
  if (currentOvers < 6) {
    return { resolved: false, reason: `Overs at ${currentOvers}, not yet 6` };
  }

  // Current overs >= 6 and previous max was < 6 (or null): this is the
  // first crossing of the powerplay threshold. Capture the snapshot.
  return { resolved: true, value: String(runs.score) };
}

/**
 * Shared powerplay wickets extraction logic.
 * Captures wickets at the same snapshot as powerplay runs.
 */
function extractPowerplayWickets(
  fixture: SmFixture,
  teamId: number,
  previousMaxOvers: number | null
): ExtractResult {
  const runs = getRunsForTeam(fixture, teamId);
  if (!runs) {
    return { resolved: false, reason: 'No runs data for team' };
  }

  const currentOvers = runs.overs;

  if (previousMaxOvers != null && previousMaxOvers >= 6) {
    return { resolved: false, reason: 'Powerplay already captured' };
  }

  if (currentOvers < 6) {
    return { resolved: false, reason: `Overs at ${currentOvers}, not yet 6` };
  }

  // Current overs >= 6 and previous max was < 6 (or null): capture snapshot.
  return { resolved: true, value: String(runs.wickets) };
}

// ---------------------------------------------------------------------------
// Dispatcher — maps a scenario slug to its extractor
// ---------------------------------------------------------------------------

/**
 * Calls the appropriate extractor for a given scenario slug.
 * Powerplay scenarios require previousMaxOvers context.
 *
 * Returns ExtractResult. The caller handles ID mapping and bracket conversion.
 */
export function extractForScenario(
  slug: ScenarioSlug,
  fixture: SmFixture,
  context?: {
    homeTeamPreviousMaxOvers?: number | null;
    awayTeamPreviousMaxOvers?: number | null;
  }
): ExtractResult {
  switch (slug) {
    case 'toss_winner':
      return extractTossWinner(fixture);
    case 'match_winner':
      return extractMatchWinner(fixture);
    case 'top_scorer':
      return extractTopScorer(fixture);
    case 'top_wicket_taker':
      return extractTopWicketTaker(fixture);
    case 'most_sixes_player':
      return extractMostSixesPlayer(fixture);
    case 'player_of_match':
      return extractPlayerOfMatch(fixture);
    case 'home_team_innings_score':
      return extractHomeTeamInningsScore(fixture);
    case 'away_team_innings_score':
      return extractAwayTeamInningsScore(fixture);
    case 'home_team_powerplay_runs':
      return extractHomeTeamPowerplayRuns(fixture, context?.homeTeamPreviousMaxOvers ?? null);
    case 'away_team_powerplay_runs':
      return extractAwayTeamPowerplayRuns(fixture, context?.awayTeamPreviousMaxOvers ?? null);
    case 'home_team_powerplay_wickets_lost':
      return extractHomeTeamPowerplayWickets(fixture, context?.homeTeamPreviousMaxOvers ?? null);
    case 'away_team_powerplay_wickets_lost':
      return extractAwayTeamPowerplayWickets(fixture, context?.awayTeamPreviousMaxOvers ?? null);
    case 'total_match_runs':
      return extractTotalMatchRuns(fixture);
    case 'total_match_sixes':
      return extractTotalMatchSixes(fixture);
    case 'total_match_wickets':
      return extractTotalMatchWickets(fixture);
    case 'first_wicket_over':
      return extractFirstWicketOver(fixture);
    case 'fifty_scored':
      return extractFiftyScored(fixture);
    case 'bowler_three_wickets':
      return extractBowlerThreeWickets(fixture);
    case 'super_over':
      return extractSuperOver(fixture);
    default: {
      // Exhaustiveness check — TypeScript will error if a slug is missed
      const _exhaustive: never = slug;
      return { resolved: false, reason: `Unknown scenario slug: ${_exhaustive}` };
    }
  }
}
