"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/logger";
import { trackServerEvent, ANALYTICS_EVENTS } from "@/lib/analytics/server";
import * as predictionsDal from "@/lib/dal/predictions";
import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
import * as matchesDal from "@/lib/dal/matches";
import { submitPredictionsSchema } from "@/lib/validators";
import { isDeadlinePassed } from "@/lib/utils";
import type { ActionResponse } from "@/types";

export async function submitPredictions(
  groupId: string,
  matchId: number,
  predictions: Array<{ scenarioId: string; value: string }>
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "submitPredictions", metadata: { groupId, matchId, predictionCount: predictions.length } });

  const parsed = submitPredictionsSchema.safeParse({ predictions });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Check group membership
  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || membership.status !== "approved") {
    return { success: false, error: "You're not in this squad" };
  }

  // Check deadline via DAL
  const match = await matchesDal.getMatchDeadlineInfo(matchId);
  if (!match) return { success: false, error: "Match not found" };
  if (match.status !== "upcoming") {
    return { success: false, error: "Picks are closed for this match" };
  }

  // Check group-level settings via DAL
  const settings = await matchesDal.getMatchGroupSettings(groupId, matchId);
  if (settings?.is_locked) {
    return { success: false, error: "Picks are locked for this match" };
  }

  if (isDeadlinePassed(match.date, match.time_ist, settings?.prediction_deadline)) {
    return { success: false, error: "Too late — the deadline has passed" };
  }

  // Verify scenarios belong to this group+match
  const scenarios = await scenariosDal.getScenariosForMatch(groupId, matchId);
  const validIds = new Set(scenarios.map((s) => s.id));

  const validPredictions = parsed.data.predictions.filter((p) =>
    validIds.has(p.scenarioId)
  );

  if (validPredictions.length === 0) {
    return { success: false, error: "No valid picks to lock in" };
  }

  const ok = await predictionsDal.upsertPredictions(user.id, validPredictions);
  if (!ok) {
    logError({ layer: "action", operation: "submitPredictions", metadata: { userId: user.id, groupId, matchId } });
    return { success: false, error: "Couldn't lock those in — try again" };
  }

  trackServerEvent(user.id, ANALYTICS_EVENTS.PREDICTION_SUBMITTED, { group_id: groupId, match_id: matchId, prediction_count: validPredictions.length, total_scenarios: scenarios.length });
  revalidatePath(`/group/${groupId}/predict/${matchId}`);
  revalidatePath(`/group/${groupId}/match/${matchId}`);
  return { success: true };
}
