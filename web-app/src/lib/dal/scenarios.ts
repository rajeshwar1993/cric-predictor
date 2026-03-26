import { createClient } from "@/lib/supabase/server";
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

  if (error || !data) return [];
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

  if (error) return null;
  return data as unknown as Scenario;
}

export async function updateScenarioApproval(
  scenarioId: string,
  status: ScenarioApproval,
  points?: number
): Promise<boolean> {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = { approval_status: status };
  if (points !== undefined) updateData.points = points;

  const { error } = await supabase
    .from("scenarios")
    .update(updateData)
    .eq("id", scenarioId);

  return !error;
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

  return !error;
}

export async function removeScenario(
  scenarioId: string,
  removedBy: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scenarios")
    .update({ is_removed: true, removed_by: removedBy })
    .eq("id", scenarioId);

  return !error;
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

  if (error || !data) return [];
  return data as unknown as Scenario[];
}
