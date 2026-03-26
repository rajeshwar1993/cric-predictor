import { createClient } from "@/lib/supabase/server";
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
}

export async function getUpcomingMatches(limit = 5): Promise<Match[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .gte("date", today)
    .in("status", ["upcoming"])
    .order("date", { ascending: true })
    .order("time_ist", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

export async function getMatchById(matchId: number): Promise<Match | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) return null;
  return data;
}

export async function getMatchesForDate(date: string): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("date", date)
    .order("time_ist", { ascending: true });

  if (error || !data) return [];
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

  if (error) return null;
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

  if (error) return null;
  return data;
}

export async function updateMatchResults(
  matchId: number,
  results: MatchUpdate
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ ...results, status: "completed", resolved_at: new Date().toISOString() })
    .eq("id", matchId);

  return !error;
}

export async function getMatchDeadlineInfo(matchId: number): Promise<MatchDeadlineInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("date, time_ist, status")
    .eq("id", matchId)
    .single();

  if (error) return null;
  return data;
}

export async function getMatchGroupSettings(
  groupId: string,
  matchId: number
): Promise<MatchGroupSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_group_settings")
    .select("prediction_deadline, is_locked")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .single();

  if (error) return null;
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
  return !error;
}

export async function resolveMatchPredictions(matchId: number): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_match_predictions", {
    p_match_id: matchId,
  });
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

  return !error;
}
