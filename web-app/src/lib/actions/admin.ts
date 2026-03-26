"use server";

import { createClient } from "@/lib/supabase/server";
import * as matchesDal from "@/lib/dal/matches";
import * as membersDal from "@/lib/dal/members";
import { enterResultSchema } from "@/lib/validators";
import type { ActionResponse } from "@/types";

export async function enterResults(
  groupId: string,
  matchId: number,
  results: Record<string, unknown>
): Promise<ActionResponse> {
  const parsed = enterResultSchema.safeParse({ matchId, ...results });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify caller is admin/owner in the group
  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can enter results" };
  }

  const { matchWinner, tossWinner, ...rest } = parsed.data;

  const ok = await matchesDal.updateMatchResults(matchId, {
    match_winner: matchWinner,
    toss_winner: tossWinner,
    top_scorer: rest.topScorer,
    top_scorer_runs: rest.topScorerRuns,
    top_wicket_taker: rest.topWicketTaker,
    top_wicket_taker_wickets: rest.topWicketTakerWickets,
    player_of_match: rest.playerOfMatch,
    first_innings_score: rest.firstInningsScore,
    first_innings_wickets: rest.firstInningsWickets,
    total_match_runs: rest.totalMatchRuns,
    total_match_wickets: rest.totalMatchWickets,
    total_match_sixes: rest.totalMatchSixes,
    powerplay_score: rest.powerplayScore,
    powerplay_wickets: rest.powerplayWickets,
    had_super_over: rest.hadSuperOver,
    most_sixes_player: rest.mostSixesPlayer,
    first_wicket_over: rest.firstWicketOver,
    batsman_scored_fifty: rest.batsmanScoredFifty,
    bowler_took_three: rest.bowlerTookThree,
  });

  if (!ok) return { success: false, error: "Failed to update match results" };

  // Trigger resolution via DAL
  const resolved = await matchesDal.resolveMatchPredictions(matchId);
  if (!resolved) {
    return { success: false, error: "Results saved but resolution failed" };
  }

  return { success: true };
}

export async function updateGroupSettings(
  groupId: string,
  matchId: number,
  settings: { predictionDeadline?: string; isLocked?: boolean }
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can update settings" };
  }

  const ok = await matchesDal.upsertMatchGroupSettings(groupId, matchId, {
    prediction_deadline: settings.predictionDeadline,
    is_locked: settings.isLocked,
  });

  if (!ok) return { success: false, error: "Failed to update settings" };
  return { success: true };
}
