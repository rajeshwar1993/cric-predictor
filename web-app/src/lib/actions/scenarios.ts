"use server";

import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
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
  return { success: true, data: scenario };
}

export async function approveScenario(
  groupId: string,
  scenarioId: string,
  points?: number
): Promise<ActionResponse> {
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
    points
  );
  if (!ok) {
    logError({ layer: "action", operation: "approveScenario", metadata: { userId: user.id, scenarioId } });
    return { success: false, error: "Failed to approve scenario" };
  }
  return { success: true };
}

export async function rejectScenario(
  groupId: string,
  scenarioId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can reject scenarios" };
  }

  const ok = await scenariosDal.updateScenarioApproval(scenarioId, "rejected");
  if (!ok) {
    logError({ layer: "action", operation: "rejectScenario", metadata: { userId: user.id, scenarioId } });
    return { success: false, error: "Failed to reject scenario" };
  }
  return { success: true };
}

export async function removeScenario(
  groupId: string,
  scenarioId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can remove scenarios" };
  }

  // Get the scenario to find its matchId for prediction lock check
  const { data: scenarioData } = await supabase
    .from("scenarios")
    .select("match_id")
    .eq("id", scenarioId)
    .single();

  if (scenarioData) {
    const hasPredictions = await scenariosDal.hasAnyPredictionsForMatch(groupId, scenarioData.match_id);
    if (hasPredictions) {
      return { success: false, error: "Scenarios are locked — members have already predicted" };
    }
  }

  const ok = await scenariosDal.removeScenario(scenarioId, user.id);
  if (!ok) {
    logError({ layer: "action", operation: "removeScenario", metadata: { userId: user.id, scenarioId } });
    return { success: false, error: "Failed to remove scenario" };
  }
  return { success: true };
}

export async function publishScenarios(
  groupId: string,
  matchId: number
): Promise<ActionResponse> {
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

  return { success: true };
}

export async function addCustomScenarioAsAdmin(
  groupId: string,
  matchId: number,
  title: string,
  options: string[],
  points: number
): Promise<ActionResponse<Scenario>> {
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

  return { success: true, data: scenario };
}
