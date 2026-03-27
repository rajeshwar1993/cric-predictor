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
