import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { Scenario, ScenarioApproval } from "@/types";

export async function getScenariosForMatch(
  groupId: string,
  matchId: number
): Promise<Scenario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("is_removed", false)
    .in("approval_status", ["auto_approved", "approved"])
    .order("type", { ascending: true })
    .order("points", { ascending: false });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getScenariosForMatch", metadata: { groupId, matchId } }, error);
    return [];
  }
  return data as unknown as Scenario[];
}

export async function seedSystemScenarios(
  groupId: string,
  matchId: number
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_system_scenarios", {
    p_group_id: groupId,
    p_match_id: matchId,
  });
  if (error) logError({ layer: "dal", operation: "seedSystemScenarios", metadata: { groupId, matchId } }, error);
  return !error;
}

export async function createCustomScenario(params: {
  groupId: string;
  matchId: number;
  createdBy: string;
  title: string;
  options: string[];
  points: number;
}): Promise<Scenario | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      group_id: params.groupId,
      match_id: params.matchId,
      created_by: params.createdBy,
      type: "custom",
      title: params.title,
      options: params.options,
      points: params.points,
      approval_status: "pending",
    })
    .select()
    .single();

  if (error) {
    logError({ layer: "dal", operation: "createCustomScenario", metadata: { groupId: params.groupId, matchId: params.matchId } }, error);
    return null;
  }
  return data as unknown as Scenario;
}

export async function updateScenarioApproval(
  scenarioId: string,
  status: ScenarioApproval,
  points?: number,
  groupId?: string
): Promise<boolean> {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = { approval_status: status };
  if (points !== undefined) updateData.points = points;

  let query = supabase
    .from("scenarios")
    .update(updateData)
    .eq("id", scenarioId);

  // Defense-in-depth: ensure scenario belongs to the specified group
  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query.select("id");

  if (error) {
    logError({ layer: "dal", operation: "updateScenarioApproval", metadata: { scenarioId, status, groupId } }, error);
    return false;
  }
  if (!data || data.length === 0) {
    logError({ layer: "dal", operation: "updateScenarioApproval", metadata: { scenarioId, status, groupId, reason: "no rows affected" } });
    return false;
  }
  return true;
}

export async function resolveScenario(
  scenarioId: string,
  correctAnswer: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scenarios")
    .update({
      correct_answer: correctAnswer,
      is_resolved: true,
    })
    .eq("id", scenarioId);

  if (error) logError({ layer: "dal", operation: "resolveScenario", metadata: { scenarioId } }, error);
  return !error;
}

export async function removeScenario(
  scenarioId: string,
  removedBy: string,
  groupId?: string
): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase
    .from("scenarios")
    .update({ is_removed: true, removed_by: removedBy })
    .eq("id", scenarioId);

  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query.select("id");

  if (error) {
    logError({ layer: "dal", operation: "removeScenario", metadata: { scenarioId, removedBy, groupId } }, error);
    return false;
  }
  if (!data || data.length === 0) {
    logError({ layer: "dal", operation: "removeScenario", metadata: { scenarioId, removedBy, groupId, reason: "no rows affected" } });
    return false;
  }
  return true;
}

export async function getScenarioCountForMatch(groupId: string, matchId: number): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("scenarios")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("is_removed", false)
    .in("approval_status", ["auto_approved", "approved"]);
  if (error) logError({ layer: "dal", operation: "getScenarioCountForMatch", metadata: { groupId, matchId } }, error);
  return count || 0;
}

export async function hasAnyPredictionsForMatch(groupId: string, matchId: number): Promise<boolean> {
  const supabase = await createClient();
  // Get scenario IDs for this group+match, then check predictions
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("is_removed", false);

  if (!scenarios || scenarios.length === 0) return false;

  const ids = scenarios.map((s: { id: string }) => s.id);
  const { count, error } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .in("scenario_id", ids);

  if (error) logError({ layer: "dal", operation: "hasAnyPredictionsForMatch", metadata: { groupId, matchId } }, error);
  return (count || 0) > 0;
}

export async function getPendingCustomScenarios(
  groupId: string
): Promise<Scenario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("group_id", groupId)
    .eq("type", "custom")
    .eq("approval_status", "pending")
    .eq("is_removed", false)
    .order("created_at", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getPendingCustomScenarios", metadata: { groupId } }, error);
    return [];
  }
  return data as unknown as Scenario[];
}
