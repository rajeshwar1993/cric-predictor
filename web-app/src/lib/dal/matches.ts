import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { Database } from "@/types/database";

type Match = Database["public"]["Tables"]["matches"]["Row"];
type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];

export interface MatchDeadlineInfo {
  date: string;
  time_ist: string;
  status: string;
}

export interface MatchGroupSettings {
  prediction_deadline: string | null;
  is_locked: boolean;
  scenarios_published: boolean;
}

export async function getUpcomingMatches(limit = 5): Promise<Match[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Include both upcoming and live matches — live matches should still
  // appear on the squad page (with live scores instead of predict CTA).
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .gte("date", today)
    .in("status", ["upcoming", "live"])
    .order("date", { ascending: true })
    .order("time_ist", { ascending: true })
    .limit(limit);

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getUpcomingMatches", metadata: { limit } }, error);
    return [];
  }
  return data;
}

export async function getMatchById(matchId: number): Promise<Match | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getMatchById", metadata: { matchId } }, error);
    return null;
  }
  return data;
}

export async function getMatchesForDate(date: string): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("date", date)
    .order("time_ist", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getMatchesForDate", metadata: { date } }, error);
    return [];
  }
  return data;
}

export async function getNextMatch(): Promise<Match | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .in("status", ["upcoming", "live"])
    .order("date", { ascending: true })
    .order("time_ist", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getNextMatch", metadata: {} }, error);
    return null;
  }
  return data;
}

export async function getLastCompletedMatch(): Promise<Match | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "completed")
    .order("date", { ascending: false })
    .order("time_ist", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getLastCompletedMatch", metadata: {} }, error);
    return null;
  }
  return data;
}

export async function updateMatchResults(
  matchId: number,
  results: MatchUpdate
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ ...results, status: "completed", resolved_at: new Date().toISOString() })
    .eq("id", matchId)
    .select("id");

  if (error) {
    logError({ layer: "dal", operation: "updateMatchResults", metadata: { matchId } }, error);
    return false;
  }
  if (!data || data.length === 0) {
    logError({ layer: "dal", operation: "updateMatchResults", metadata: { matchId, reason: "no rows affected" } });
    return false;
  }
  return true;
}

export async function getMatchDeadlineInfo(matchId: number): Promise<MatchDeadlineInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("date, time_ist, status")
    .eq("id", matchId)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getMatchDeadlineInfo", metadata: { matchId } }, error);
    return null;
  }
  return data;
}

export async function getMatchGroupSettings(
  groupId: string,
  matchId: number
): Promise<MatchGroupSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_group_settings")
    .select("prediction_deadline, is_locked, scenarios_published")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getMatchGroupSettings", metadata: { groupId, matchId } }, error);
    return null;
  }
  return data;
}

export async function upsertMatchGroupSettings(
  groupId: string,
  matchId: number,
  settings: { prediction_deadline?: string; is_locked?: boolean }
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_group_settings")
    .upsert(
      {
        group_id: groupId,
        match_id: matchId,
        prediction_deadline: settings.prediction_deadline,
        is_locked: settings.is_locked,
      },
      { onConflict: "group_id,match_id" }
    );
  if (error) logError({ layer: "dal", operation: "upsertMatchGroupSettings", metadata: { groupId, matchId } }, error);
  return !error;
}

export async function resolveMatchPredictions(matchId: number): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_match_predictions", {
    p_match_id: matchId,
  });
  if (error) logError({ layer: "dal", operation: "resolveMatchPredictions", metadata: { matchId } }, error);
  return !error;
}

export async function publishMatchScenarios(
  groupId: string,
  matchId: number
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_group_settings")
    .upsert(
      { group_id: groupId, match_id: matchId, scenarios_published: true },
      { onConflict: "group_id,match_id" }
    );
  if (error) logError({ layer: "dal", operation: "publishMatchScenarios", metadata: { groupId, matchId } }, error);
  return !error;
}

export async function updateLiveSnapshot(
  matchId: number,
  snapshot: Pick<
    MatchUpdate,
    | "current_score_a"
    | "current_score_b"
    | "current_overs_a"
    | "current_overs_b"
    | "current_batting_team"
    | "live_scorecard_json"
    | "status"
  >
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ ...snapshot, last_polled_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) logError({ layer: "dal", operation: "updateLiveSnapshot", metadata: { matchId } }, error);
  return !error;
}
