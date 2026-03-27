"use server";

import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
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
    return { success: false, error: "You are not a member of this group" };
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
    return { success: false, error: "Failed to create scenario" };
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

  const ok = await scenariosDal.removeScenario(scenarioId, user.id);
  if (!ok) {
    logError({ layer: "action", operation: "removeScenario", metadata: { userId: user.id, scenarioId } });
    return { success: false, error: "Failed to remove scenario" };
  }
  return { success: true };
}
