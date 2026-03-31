import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";
import { getAdminClient } from "../helpers/supabase-admin";

test.describe("Prediction submission", () => {
  let groupId: string;
  let matchId: number;

  test.beforeAll(() => {
    const state = getTestState();
    groupId = state.group.id;
    matchId = state.matches.match1.id;
  });

  test.afterAll(async () => {
    // Clean up predictions created during these tests
    const state = getTestState();
    const sb = getAdminClient();

    // Get all scenario IDs for this match+group
    const { data: scenarios } = await sb
      .from("scenarios")
      .select("id")
      .eq("group_id", groupId)
      .eq("match_id", matchId);

    const scenarioIds = (scenarios || []).map((s) => s.id);
    if (scenarioIds.length > 0) {
      // Delete predictions for test users on these scenarios
      const userIds = [
        state.users.member.id,
        state.users.owner.id,
        state.users.admin.id,
      ];
      await sb
        .from("predictions")
        .delete()
        .in("scenario_id", scenarioIds)
        .in("user_id", userIds);
    }
  });

  test("member sees prediction form with scenario cards", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/predict/${matchId}`
    );

    // Prediction form should show scenario cards
    await expect(page.getByText("Who will win?")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("member can select and submit a prediction", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/predict/${matchId}`
    );

    // Wait for scenario cards to load
    await expect(page.getByText("Who will win?")).toBeVisible({
      timeout: 15_000,
    });

    // Click a team option for "Who will win?" — match1 is RCB vs SRH
    const teamOption = page.getByRole("button", { name: /RCB/i }).first();
    await teamOption.click();

    // Submit predictions
    const submitButton = page.getByRole("button", {
      name: /lock it in|submit|save/i,
    });
    await submitButton.click();

    // Verify success feedback
    await expect(
      page.getByText(/locked in|success|saved/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("prediction persists after page reload", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/predict/${matchId}`
    );

    // Wait for page to load
    await expect(page.getByText("Who will win?")).toBeVisible({
      timeout: 15_000,
    });

    // The previously selected prediction (RCB) should still be selected
    // Look for a selected/active state on the RCB option
    const rcbOption = page.getByRole("button", { name: /RCB/i }).first();
    await expect(rcbOption).toBeVisible();

    // The option should show as selected (e.g., aria-pressed, data-selected, or a visual class)
    const isSelected = await rcbOption.evaluate((el) => {
      return (
        el.getAttribute("aria-pressed") === "true" ||
        el.getAttribute("data-selected") === "true" ||
        el.classList.contains("selected") ||
        el.classList.contains("active") ||
        el.getAttribute("data-state") === "selected"
      );
    });
    expect(isSelected).toBeTruthy();
  });

  test("pending user cannot access predict page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.pending.email,
      `/group/${groupId}/predict/${matchId}`
    );

    // Pending user should be redirected away from the predict page
    await expect(page).not.toHaveURL(/\/predict\//);
  });
});
