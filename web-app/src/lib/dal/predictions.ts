import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { Prediction, RevealPrediction } from "@/types";

export async function getPredictionsForUser(
  userId: string,
  scenarioIds: string[]
): Promise<Prediction[]> {
  if (scenarioIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId)
    .in("scenario_id", scenarioIds);

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getPredictionsForUser", metadata: { userId, scenarioCount: scenarioIds.length } }, error);
    return [];
  }
  return data;
}

export async function getPredictionsForScenario(
  scenarioId: string
): Promise<Prediction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("submitted_at", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getPredictionsForScenario", metadata: { scenarioId } }, error);
    return [];
  }
  return data;
}

export async function upsertPrediction(
  userId: string,
  scenarioId: string,
  value: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: userId,
      scenario_id: scenarioId,
      value,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scenario_id" }
  );

  if (error) logError({ layer: "dal", operation: "upsertPrediction", metadata: { userId, scenarioId } }, error);
  return !error;
}

export async function upsertPredictions(
  userId: string,
  predictions: Array<{ scenarioId: string; value: string }>
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const rows = predictions.map((p) => ({
    user_id: userId,
    scenario_id: p.scenarioId,
    value: p.value,
    submitted_at: now,
  }));

  const { error } = await supabase
    .from("predictions")
    .upsert(rows, { onConflict: "user_id,scenario_id" });

  if (error) logError({ layer: "dal", operation: "upsertPredictions", metadata: { userId, count: predictions.length } }, error);
  return !error;
}

export async function getUserPredictionCount(
  userId: string,
  groupId: string,
  matchId: number
): Promise<number> {
  const supabase = await createClient();

  // First get scenario IDs, then count predictions
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("is_removed", false)
    .in("approval_status", ["auto_approved", "approved"]);

  if (!scenarios || scenarios.length === 0) return 0;

  const scenarioIds = scenarios.map((s: { id: string }) => s.id);

  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("scenario_id", scenarioIds);

  return count || 0;
}

/**
 * Fetch all predictions for the given scenario IDs (all users).
 * Used by the Prediction Reveal Table to build the member x scenario matrix.
 * RLS enforces visibility: returns only own predictions pre-deadline,
 * all group members' predictions post-deadline.
 */
export async function getAllPredictionsForMatch(
  scenarioIds: string[]
): Promise<RevealPrediction[]> {
  if (scenarioIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("user_id, scenario_id, value, is_correct, points_earned")
    .in("scenario_id", scenarioIds);

  if (error || !data) {
    if (error)
      logError(
        {
          layer: "dal",
          operation: "getAllPredictionsForMatch",
          metadata: { scenarioCount: scenarioIds.length },
        },
        error
      );
    return [];
  }
  return data;
}

export async function getMembersWhoPredicted(
  groupId: string,
  matchId: number
): Promise<string[]> {
  const supabase = await createClient();

  // Uses SECURITY DEFINER function to bypass RLS —
  // returns only user IDs, not prediction values (no data leak).
  // This lets all group members see WHO has predicted, not WHAT.
  const { data, error } = await supabase.rpc("get_members_who_predicted", {
    p_group_id: groupId,
    p_match_id: matchId,
  });

  if (error) {
    logError({ layer: "dal", operation: "getMembersWhoPredicted", metadata: { groupId, matchId } }, error);
    return [];
  }

  return (data || []).map((row: { user_id: string }) => row.user_id);
}
