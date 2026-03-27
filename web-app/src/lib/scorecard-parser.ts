import type { EventResponse } from "@/types/cricket-api";
import type { Database } from "@/types/database";
import { TEAM_NAME_TO_CODE } from "./constants";
import {
  safeInt,
  filterBatsmen,
  filterBowlers,
  getFirstInningsKey,
  getInningsKeys,
  getInningsRuns,
  parseTossWinner,
  parseMatchWinner,
  derivePowerplayScore,
  derivePowerplayWickets,
  deriveFirstWicketOver,
} from "./cricket-api/parsers";

type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];

/**
 * Convert an API team name to the team code used in our database.
 */
function toTeamCode(apiName: string | undefined | null): string | null {
  if (!apiName) return null;
  return TEAM_NAME_TO_CODE[apiName] || apiName;
}

/**
 * Parse an api-cricket.com event response into match result fields.
 * Works with both real API responses and mock data.
 */
export function parseScorecardToResults(event: EventResponse): MatchUpdate {
  const results: MatchUpdate = {};

  // Basic match info — parse from sentence-format fields
  results.toss_winner = toTeamCode(parseTossWinner(event.event_toss));
  results.match_winner = toTeamCode(parseMatchWinner(event.event_status_info));

  // Player of the match — directly available from api-cricket.com
  if (event.event_man_of_match && event.event_man_of_match.trim() !== "") {
    results.player_of_match = event.event_man_of_match.trim();
  }

  const inningsKeys = getInningsKeys(event.scorecard);
  if (inningsKeys.length === 0) {
    return results;
  }

  // First innings
  const firstKey = inningsKeys[0];
  const firstInnings = event.scorecard[firstKey] || [];
  const firstBatsmen = filterBatsmen(firstInnings);
  const firstBowlers = filterBowlers(firstInnings);

  // First innings score from extras
  const firstRuns = getInningsRuns(event.extra, firstKey);
  if (firstRuns !== null) {
    results.first_innings_score = firstRuns;
  }

  // First innings wickets from bowling stats
  results.first_innings_wickets = firstBowlers.reduce(
    (sum, b) => sum + safeInt(b.W),
    0
  );

  // Powerplay data — derived from ball-by-ball and fall-of-wickets
  const ppScore = derivePowerplayScore(event.comments);
  if (ppScore !== null) {
    results.powerplay_score = ppScore;
  }
  const ppWickets = derivePowerplayWickets(event.wickets);
  if (ppWickets !== null) {
    results.powerplay_wickets = ppWickets;
  }

  // First wicket over — derived from fall-of-wickets
  const fwo = deriveFirstWicketOver(event.wickets);
  if (fwo !== null) {
    results.first_wicket_over = fwo;
  }

  // Second innings
  const secondKey = inningsKeys.length > 1 ? inningsKeys[1] : null;

  // Total match stats — need both innings
  if (secondKey) {
    const secondInnings = event.scorecard[secondKey] || [];
    const secondBatsmen = filterBatsmen(secondInnings);
    const secondBowlers = filterBowlers(secondInnings);

    const secondRuns = getInningsRuns(event.extra, secondKey);
    if (firstRuns !== null && secondRuns !== null) {
      results.total_match_runs = firstRuns + secondRuns;
    }

    const firstWickets = firstBowlers.reduce((s, b) => s + safeInt(b.W), 0);
    const secondWickets = secondBowlers.reduce((s, b) => s + safeInt(b.W), 0);
    results.total_match_wickets = firstWickets + secondWickets;

    // Aggregate batting across both innings
    const allBatsmen = [...firstBatsmen, ...secondBatsmen];

    // Total sixes
    results.total_match_sixes = allBatsmen.reduce(
      (sum, b) => sum + safeInt(b["6s"]),
      0
    );

    // Top scorer
    let topScorerRuns = -1;
    let topScorerName = "";
    for (const b of allBatsmen) {
      const runs = safeInt(b.R);
      if (runs > topScorerRuns) {
        topScorerRuns = runs;
        topScorerName = b.player;
      }
    }
    if (topScorerRuns > 0) {
      results.top_scorer = topScorerName;
      results.top_scorer_runs = topScorerRuns;
    }

    // Most sixes player
    let mostSixesCount = 0;
    let mostSixesName = "";
    for (const b of allBatsmen) {
      const sixes = safeInt(b["6s"]);
      if (sixes > mostSixesCount) {
        mostSixesCount = sixes;
        mostSixesName = b.player;
      }
    }
    if (mostSixesCount > 0) {
      results.most_sixes_player = mostSixesName;
    }

    // Batsman scored fifty
    results.batsman_scored_fifty = allBatsmen.some((b) => safeInt(b.R) >= 50);

    // Top wicket taker
    const allBowlers = [...firstBowlers, ...secondBowlers];
    let topWickets = -1;
    let topBowlerName = "";
    for (const b of allBowlers) {
      const w = safeInt(b.W);
      if (w > topWickets) {
        topWickets = w;
        topBowlerName = b.player;
      }
    }
    if (topWickets > 0) {
      results.top_wicket_taker = topBowlerName;
      results.top_wicket_taker_wickets = topWickets;
    }

    // Bowler took three
    results.bowler_took_three = allBowlers.some((b) => safeInt(b.W) >= 3);
  }

  // Super over detection — more than 2 innings
  results.had_super_over = inningsKeys.length > 2;

  return results;
}
