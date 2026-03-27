import { getAdminClient } from "./supabase-admin";

/**
 * Simulate the toss happening (what the cron does when it detects matchStarted).
 * - Sets match to "live"
 * - Locks predictions for all groups
 * - Resolves toss_winner scenarios
 */
export async function simulateToss(matchId: number, tossWinner: string) {
  const sb = getAdminClient();

  await sb
    .from("matches")
    .update({
      status: "live",
      toss_winner: tossWinner,
      last_polled_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // Lock predictions for all groups with this match
  await sb
    .from("match_group_settings")
    .update({ is_locked: true })
    .eq("match_id", matchId);

  // Resolve toss_winner scenarios across all groups
  const { data: scenarios } = await sb
    .from("scenarios")
    .select("id, points")
    .eq("match_id", matchId)
    .eq("system_category", "toss_winner")
    .eq("is_resolved", false);

  for (const s of scenarios ?? []) {
    await sb
      .from("scenarios")
      .update({ correct_answer: tossWinner, is_resolved: true })
      .eq("id", s.id);

    await sb
      .from("predictions")
      .update({ is_correct: true, points_earned: s.points })
      .eq("scenario_id", s.id)
      .eq("value", tossWinner);

    await sb
      .from("predictions")
      .update({ is_correct: false, points_earned: 0 })
      .eq("scenario_id", s.id)
      .neq("value", tossWinner);
  }
}

/**
 * Simulate live score updates during a match.
 */
export async function simulateLiveScores(
  matchId: number,
  scoreA: string,
  scoreB: string
) {
  const sb = getAdminClient();
  await sb
    .from("matches")
    .update({
      current_score_a: scoreA,
      current_score_b: scoreB,
      last_polled_at: new Date().toISOString(),
    })
    .eq("id", matchId);
}

/**
 * Full match result set used for completion simulation.
 */
export interface MatchResults {
  match_winner: string;
  toss_winner: string;
  top_scorer: string;
  top_scorer_runs: number;
  top_wicket_taker: string;
  top_wicket_taker_wickets: number;
  player_of_match: string;
  first_innings_score: number;
  first_innings_wickets: number;
  total_match_runs: number;
  total_match_wickets: number;
  total_match_sixes: number;
  powerplay_score: number;
  powerplay_wickets: number;
  had_super_over: boolean;
  most_sixes_player: string;
  first_wicket_over: number;
  batsman_scored_fifty: boolean;
  bowler_took_three: boolean;
}

/**
 * Simulate a match completing and resolve all predictions.
 */
export async function simulateMatchCompleted(
  matchId: number,
  results: MatchResults
) {
  const sb = getAdminClient();

  await sb
    .from("matches")
    .update({
      status: "completed",
      resolved_at: new Date().toISOString(),
      ...results,
    })
    .eq("id", matchId);

  // Run the DB resolution function
  await sb.rpc("resolve_match_predictions", { p_match_id: matchId });
}

/** A realistic set of test match results. */
export const SAMPLE_RESULTS: MatchResults = {
  match_winner: "RCB",
  toss_winner: "RCB",
  top_scorer: "Virat Kohli",
  top_scorer_runs: 72,
  top_wicket_taker: "Mohammed Siraj",
  top_wicket_taker_wickets: 3,
  player_of_match: "Virat Kohli",
  first_innings_score: 186,
  first_innings_wickets: 5,
  total_match_runs: 357,
  total_match_wickets: 13,
  total_match_sixes: 18,
  powerplay_score: 52,
  powerplay_wickets: 1,
  had_super_over: false,
  most_sixes_player: "Travis Head",
  first_wicket_over: 4,
  batsman_scored_fifty: true,
  bowler_took_three: true,
};
