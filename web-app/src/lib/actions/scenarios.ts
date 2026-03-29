"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/logger";
import { trackServerEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
import * as matchesDal from "@/lib/dal/matches";
import { createCustomScenarioSchema } from "@/lib/validators";
import type { ActionResponse, Scenario } from "@/types";

export async function createCustomScenario(
  groupId: string,
  matchId: number,
  title: string,
  options: string[],
  points: number
): Promise<ActionResponse<Scenario>> {
  logInfo({ layer: "action", operation: "createCustomScenario", metadata: { groupId, matchId } });

  const parsed = createCustomScenarioSchema.safeParse({
    groupId,
    matchId,
    title,
    options,
    points,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || membership.status !== "approved") {
    return { success: false, error: "You're not in this squad" };
  }

  const scenario = await scenariosDal.createCustomScenario({
    groupId: parsed.data.groupId,
    matchId: parsed.data.matchId,
    createdBy: user.id,
    title: parsed.data.title,
    options: parsed.data.options,
    points: parsed.data.points,
  });

  if (!scenario) {
    logError({ layer: "action", operation: "createCustomScenario", metadata: { userId: user.id, groupId, matchId } });
    return { success: false, error: "Couldn't submit your wild card — try again" };
  }
  trackServerEvent(user.id, ANALYTICS_EVENTS.SCENARIO_CUSTOM_CREATED, { group_id: groupId, match_id: matchId, title: parsed.data.title, option_count: parsed.data.options.length, points: parsed.data.points });
  revalidatePath(`/group/${groupId}/scenarios/${matchId}`);
  return { success: true, data: scenario };
}

export async function approveScenario(
  groupId: string,
  scenarioId: string,
  points?: number
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "approveScenario", metadata: { groupId, scenarioId } });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify caller is admin/owner
  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can approve scenarios" };
  }

  const ok = await scenariosDal.updateScenarioApproval(
    scenarioId,
    "approved",
    points,
    groupId
  );
  if (!ok) {
    logError({ layer: "action", operation: "approveScenario", metadata: { userId: user.id, scenarioId, groupId } });
    return { success: false, error: "Failed to approve scenario" };
  }
  trackServerEvent(user.id, ANALYTICS_EVENTS.SCENARIO_APPROVED, { group_id: groupId, scenario_id: scenarioId });
  revalidatePath(`/group/${groupId}`, "layout");
  return { success: true };
}

export async function rejectScenario(
  groupId: string,
  scenarioId: string
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "rejectScenario", metadata: { groupId, scenarioId } });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can reject scenarios" };
  }

  const ok = await scenariosDal.updateScenarioApproval(scenarioId, "rejected", undefined, groupId);
  if (!ok) {
    logError({ layer: "action", operation: "rejectScenario", metadata: { userId: user.id, scenarioId, groupId } });
    return { success: false, error: "Failed to reject scenario" };
  }
  trackServerEvent(user.id, ANALYTICS_EVENTS.SCENARIO_REJECTED, { group_id: groupId, scenario_id: scenarioId });
  revalidatePath(`/group/${groupId}`, "layout");
  return { success: true };
}

export async function removeScenario(
  groupId: string,
  scenarioId: string
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "removeScenario", metadata: { groupId, scenarioId } });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can remove scenarios" };
  }

  // Get the scenario — verify it belongs to this group (defense-in-depth)
  const { data: scenarioData } = await supabase
    .from("scenarios")
    .select("match_id, group_id")
    .eq("id", scenarioId)
    .eq("group_id", groupId)
    .single();

  if (!scenarioData) {
    return { success: false, error: "Scenario not found in this group" };
  }

  if (scenarioData) {
    const hasPredictions = await scenariosDal.hasAnyPredictionsForMatch(groupId, scenarioData.match_id);
    if (hasPredictions) {
      return { success: false, error: "Scenarios are locked — members have already predicted" };
    }
  }

  const ok = await scenariosDal.removeScenario(scenarioId, user.id, groupId);
  if (!ok) {
    logError({ layer: "action", operation: "removeScenario", metadata: { userId: user.id, scenarioId, groupId } });
    return { success: false, error: "Failed to remove scenario" };
  }
  trackServerEvent(user.id, ANALYTICS_EVENTS.SCENARIO_REMOVED, { group_id: groupId, scenario_id: scenarioId });
  revalidatePath(`/group/${groupId}`, "layout");
  return { success: true };
}

export async function publishScenarios(
  groupId: string,
  matchId: number
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "publishScenarios", metadata: { groupId, matchId } });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can publish scenarios" };
  }

  // Check at least 1 scenario exists
  const count = await scenariosDal.getScenarioCountForMatch(groupId, matchId);
  if (count === 0) {
    return { success: false, error: "Add at least one scenario before publishing" };
  }
  if (count > 20) {
    return { success: false, error: "Maximum 20 scenarios allowed per match" };
  }

  const ok = await matchesDal.publishMatchScenarios(groupId, matchId);
  if (!ok) {
    logError({ layer: "action", operation: "publishScenarios", metadata: { userId: user.id, groupId, matchId } });
    return { success: false, error: "Failed to publish scenarios" };
  }

  trackServerEvent(user.id, ANALYTICS_EVENTS.SCENARIO_PUBLISHED, { group_id: groupId, match_id: matchId, scenario_count: count });
  revalidatePath(`/group/${groupId}`, "layout");
  return { success: true };
}

export async function addCustomScenarioAsAdmin(
  groupId: string,
  matchId: number,
  title: string,
  options: string[],
  points: number
): Promise<ActionResponse<Scenario>> {
  logInfo({ layer: "action", operation: "addCustomScenarioAsAdmin", metadata: { groupId, matchId } });

  const parsed = createCustomScenarioSchema.safeParse({ groupId, matchId, title, options, points });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can add scenarios" };
  }

  // Check prediction lock
  const hasPredictions = await scenariosDal.hasAnyPredictionsForMatch(groupId, matchId);
  if (hasPredictions) {
    return { success: false, error: "Scenarios are locked — members have already predicted" };
  }

  // Check max 20
  const count = await scenariosDal.getScenarioCountForMatch(groupId, matchId);
  if (count >= 20) {
    return { success: false, error: "Maximum 20 scenarios per match" };
  }

  // Create as approved directly (admin-created, no pending status)
  const scenario = await scenariosDal.createCustomScenario({
    groupId: parsed.data.groupId,
    matchId: parsed.data.matchId,
    createdBy: user.id,
    title: parsed.data.title,
    options: parsed.data.options,
    points: parsed.data.points,
  });

  if (!scenario) {
    logError({ layer: "action", operation: "addCustomScenarioAsAdmin", metadata: { userId: user.id, groupId, matchId } });
    return { success: false, error: "Failed to add scenario" };
  }

  // Auto-approve since admin created it
  await scenariosDal.updateScenarioApproval(scenario.id, "approved");

  trackServerEvent(user.id, ANALYTICS_EVENTS.SCENARIO_CUSTOM_CREATED_BY_ADMIN, { group_id: groupId, match_id: matchId, title: parsed.data.title });
  revalidatePath(`/group/${groupId}/scenarios/${matchId}`);
  return { success: true, data: scenario };
}
