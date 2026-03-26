import { createClient } from "@/lib/supabase/server";
import type { Prediction } from "@/types";

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

  if (error || !data) return [];
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

  if (error || !data) return [];
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
