import type { ScorecardResponse } from "@/types/cricket-api";
import type { Database } from "@/types/database";
import { TEAM_NAME_TO_CODE } from "./constants";

type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];

/**
 * Convert an API team name to the team code used in our database.
 */
function toTeamCode(apiName: string | undefined): string | null {
  if (!apiName) return null;
  return TEAM_NAME_TO_CODE[apiName] || apiName;
}

/**
 * Parse a CricketData.org scorecard response into match result fields.
 * Works with both real API responses and mock data.
 */
export function parseScorecardToResults(scorecard: ScorecardResponse): MatchUpdate {
  const results: MatchUpdate = {};

  // Basic match info — convert full names to team codes
  results.toss_winner = toTeamCode(scorecard.tossWinner);
  results.match_winner = toTeamCode(scorecard.matchWinner);

  if (!scorecard.scorecard || scorecard.scorecard.length === 0) {
    return results;
  }

  // First innings
  const firstInnings = scorecard.scorecard[0];
  if (firstInnings) {
    results.first_innings_score = firstInnings.totals.r;
    results.first_innings_wickets = firstInnings.totals.w;

    // Powerplay: sum of first 6 overs batting
    const ppBatters = firstInnings.batting.filter((b) => {
      // Approximate: batters who faced balls in first 6 overs
      // More accurate with ball-by-ball data, but this gives a reasonable estimate
      return true;
    });
    // Use totals if < 6 overs, otherwise estimate
    if (firstInnings.totals.o <= 6) {
      results.powerplay_score = firstInnings.totals.r;
      results.powerplay_wickets = firstInnings.totals.w;
    }
  }

  // Second innings
  const secondInnings = scorecard.scorecard[1];

  // Total match stats
  if (firstInnings && secondInnings) {
    results.total_match_runs =
      firstInnings.totals.r + secondInnings.totals.r;
    results.total_match_wickets =
      firstInnings.totals.w + secondInnings.totals.w;

    // Total sixes
    const allBatting = [
      ...firstInnings.batting,
      ...secondInnings.batting,
    ];
    results.total_match_sixes = allBatting.reduce(
      (sum, b) => sum + (b["6s"] || 0),
      0
    );

    // Top scorer
    const topBatter = allBatting.reduce((top, b) =>
      b.r > (top?.r || 0) ? b : top
    );
    if (topBatter) {
      results.top_scorer = topBatter.batsman.name;
      results.top_scorer_runs = topBatter.r;
    }

    // Most sixes player
    const mostSixes = allBatting.reduce((top, b) =>
      (b["6s"] || 0) > (top?.["6s"] || 0) ? b : top
    );
    if (mostSixes && mostSixes["6s"] > 0) {
      results.most_sixes_player = mostSixes.batsman.name;
    }

    // Batsman scored fifty
    results.batsman_scored_fifty = allBatting.some((b) => b.r >= 50);

    // Top wicket taker
    const allBowling = [
      ...firstInnings.bowling,
      ...(secondInnings?.bowling || []),
    ];
    const topBowler = allBowling.reduce((top, b) =>
      b.w > (top?.w || 0) ? b : top
    );
    if (topBowler) {
      results.top_wicket_taker = topBowler.bowler.name;
      results.top_wicket_taker_wickets = topBowler.w;
    }

    // Bowler took three
    results.bowler_took_three = allBowling.some((b) => b.w >= 3);
  }

  // Super over detection
  results.had_super_over = scorecard.scorecard.length > 2;

  return results;
}
