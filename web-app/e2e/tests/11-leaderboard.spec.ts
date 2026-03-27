import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";

test.describe("Leaderboard", () => {
  let groupId: string;
  let match2Id: number;

  test.beforeAll(() => {
    const state = getTestState();
    groupId = state.group.id;
    match2Id = state.matches.match2.id;
  });

  test("match leaderboard shows members with scores", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/match/${match2Id}`
    );

    // Leaderboard table or list should be visible
    await expect(
      page
        .getByText(/leaderboard|standings|scores|results/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // Both owner and member should appear (they both submitted predictions in test 10)
    await expect(page.getByText(/Squad Owner/i).first()).toBeVisible();
    await expect(page.getByText(/Squad Member/i).first()).toBeVisible();
  });

  test("season standings page shows cumulative data", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/standings`
    );

    // Standings table should be visible
    await expect(
      page
        .getByText(/standings|leaderboard|season|ranking/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // Both owner and member should appear in season standings
    await expect(page.getByText(/Squad Owner/i).first()).toBeVisible();
    await expect(page.getByText(/Squad Member/i).first()).toBeVisible();
  });
});
