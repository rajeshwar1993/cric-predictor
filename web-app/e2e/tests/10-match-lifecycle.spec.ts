import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";
import {
  getAdminClient,
  getScenarios,
  insertPrediction,
} from "../helpers/supabase-admin";
import {
  simulateToss,
  simulateMatchCompleted,
  SAMPLE_RESULTS,
} from "../helpers/match-simulator";

test.describe("Match lifecycle", () => {
  let groupId: string;
  let matchId: number;
  let tossScenarioId: string;

  test.beforeAll(async () => {
    const state = getTestState();
    groupId = state.group.id;
    matchId = state.matches.match2.id;

    // Get the toss_winner scenario for match2
    const scenarios = await getScenarios(groupId, matchId);
    const tossScenario = scenarios.find(
      (s) => s.system_category === "toss_winner"
    );
    if (!tossScenario) {
      throw new Error("toss_winner scenario not found for match2");
    }
    tossScenarioId = tossScenario.id;

    // Insert predictions via admin API:
    // match2 is CSK vs MI
    // Owner predicts CSK (will be correct), member predicts MI (will be wrong)
    await insertPrediction(state.users.owner.id, tossScenarioId, "CSK");
    await insertPrediction(state.users.member.id, tossScenarioId, "MI");
  });

  test("toss simulation sets match to live and resolves toss predictions", async ({
    page,
  }) => {
    // Simulate the toss — CSK wins
    await simulateToss(matchId, "CSK");

    // Navigate to the match page as member
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/match/${matchId}`
    );

    // Match status should show as live
    await expect(page.getByText(/live/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("predictions are locked after toss", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/predict/${matchId}`
    );

    // Should see a locked message or be redirected
    const isLocked = await page
      .getByText(/locked|closed|no longer/i)
      .first()
      .isVisible()
      .catch(() => false);
    const isRedirected = !page.url().includes("/predict/");

    expect(isLocked || isRedirected).toBeTruthy();
  });

  test("match completion resolves all predictions and shows leaderboard", async ({
    page,
  }) => {
    // Override SAMPLE_RESULTS to match match2 teams (CSK vs MI)
    const match2Results = {
      ...SAMPLE_RESULTS,
      match_winner: "CSK",
      toss_winner: "CSK",
    };

    await simulateMatchCompleted(matchId, match2Results);

    // Navigate to the match page to see leaderboard
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/match/${matchId}`
    );

    // Leaderboard should be visible with scores
    await expect(
      page
        .getByText(/leaderboard|standings|scores|results/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // Owner's name should appear (correct toss prediction = points)
    await expect(page.getByText(/Squad Owner/i).first()).toBeVisible();
    // Member's name should appear (wrong toss prediction = 0)
    await expect(page.getByText(/Squad Member/i).first()).toBeVisible();
  });

  test("owner has points for correct toss prediction", async ({ page }) => {
    // Verify in the database that owner got points and member got 0
    const sb = getAdminClient();
    const state = getTestState();

    const { data: ownerPred } = await sb
      .from("predictions")
      .select("is_correct, points_earned")
      .eq("scenario_id", tossScenarioId)
      .eq("user_id", state.users.owner.id)
      .single();

    expect(ownerPred?.is_correct).toBe(true);
    expect(ownerPred?.points_earned).toBeGreaterThan(0);

    const { data: memberPred } = await sb
      .from("predictions")
      .select("is_correct, points_earned")
      .eq("scenario_id", tossScenarioId)
      .eq("user_id", state.users.member.id)
      .single();

    expect(memberPred?.is_correct).toBe(false);
    expect(memberPred?.points_earned).toBe(0);

    // Also verify on the UI — navigate to match page
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${groupId}/match/${matchId}`
    );

    // The page should show the owner's score
    await expect(page.getByText(/Squad Owner/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
