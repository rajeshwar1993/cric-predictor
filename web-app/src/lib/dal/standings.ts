import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { SeasonStanding, MatchLeaderboardEntry } from "@/types";

export async function getSeasonStandings(
  groupId: string
): Promise<SeasonStanding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("season_standings")
    .select("*")
    .eq("group_id", groupId)
    .order("rank", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getSeasonStandings", metadata: { groupId } }, error);
    return [];
  }
  return data;
}

/**
 * Fetch the current user's prediction summary for multiple matches within a group.
 * Returns one entry per match where the user has predictions.
 * Uses the match_leaderboard view which already aggregates predicted_count,
 * correct_count, resolved_count, and match_points.
 *
 * Returns a Map keyed by match_id for O(1) lookup in the component layer.
 */
export async function getUserMatchPredictionSummaries(
  groupId: string,
  userId: string,
  matchIds: number[]
): Promise<Map<number, MatchLeaderboardEntry>> {
  if (matchIds.length === 0) return new Map();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("match_leaderboard")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .in("match_id", matchIds);

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getUserMatchPredictionSummaries", metadata: { groupId, userId, matchIds } }, error);
    return new Map();
  }

  const map = new Map<number, MatchLeaderboardEntry>();
  for (const entry of data) {
    map.set(entry.match_id, entry);
  }
  return map;
}

export async function getMatchLeaderboard(
  groupId: string,
  matchId: number
): Promise<MatchLeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_leaderboard")
    .select("*")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .order("rank", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getMatchLeaderboard", metadata: { groupId, matchId } }, error);
    return [];
  }
  return data;
}
