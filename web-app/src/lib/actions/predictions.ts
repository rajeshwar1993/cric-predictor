"use server";

import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
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
    return { success: false, error: "You are not a member of this group" };
  }

  // Check deadline via DAL
  const match = await matchesDal.getMatchDeadlineInfo(matchId);
  if (!match) return { success: false, error: "Match not found" };
  if (match.status !== "upcoming") {
    return { success: false, error: "Predictions are closed for this match" };
  }

  // Check group-level settings via DAL
  const settings = await matchesDal.getMatchGroupSettings(groupId, matchId);
  if (settings?.is_locked) {
    return { success: false, error: "Predictions are locked for this match" };
  }

  if (isDeadlinePassed(match.date, match.time_ist, settings?.prediction_deadline)) {
    return { success: false, error: "Prediction deadline has passed" };
  }

  // Verify scenarios belong to this group+match
  const scenarios = await scenariosDal.getScenariosForMatch(groupId, matchId);
  const validIds = new Set(scenarios.map((s) => s.id));

  const validPredictions = parsed.data.predictions.filter((p) =>
    validIds.has(p.scenarioId)
  );

  if (validPredictions.length === 0) {
    return { success: false, error: "No valid predictions to submit" };
  }

  const ok = await predictionsDal.upsertPredictions(user.id, validPredictions);
  if (!ok) {
    logError({ layer: "action", operation: "submitPredictions", metadata: { userId: user.id, groupId, matchId } });
    return { success: false, error: "Failed to save predictions" };
  }

  return { success: true };
}
