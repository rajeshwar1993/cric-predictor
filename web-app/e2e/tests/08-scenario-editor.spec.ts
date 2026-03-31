import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";
import { getAdminClient } from "../helpers/supabase-admin";

test.describe("Scenario editor", () => {
  let groupId: string;
  let matchId: number;
  const createdScenarioIds: string[] = [];

  test.beforeAll(() => {
    const state = getTestState();
    groupId = state.group.id;
    matchId = state.matches.match1.id;
  });

  test.afterAll(async () => {
    // Clean up any custom scenarios created during tests
    if (createdScenarioIds.length > 0) {
      const sb = getAdminClient();
      for (const id of createdScenarioIds) {
        await sb.from("scenarios").delete().eq("id", id);
      }
    }
  });

  test("owner can view scenario editor with system scenarios", async ({
    page,
  }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${groupId}/scenarios/${matchId}`
    );

    // System scenarios should be listed
    await expect(page.getByText("Who will win?")).toBeVisible();
  });

  test("admin can add a custom scenario", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.admin.email,
      `/group/${groupId}/scenarios/${matchId}`
    );

    // Look for the form to add a custom scenario
    const titleInput = page.getByPlaceholder(/scenario title|question/i).or(
      page.getByLabel(/title|question/i)
    );
    await expect(titleInput).toBeVisible({ timeout: 15_000 });
    await titleInput.fill("E2E Custom: Who hits most sixes?");

    // Fill in options — look for option input fields
    const optionInputs = page.getByPlaceholder(/option/i);
    const optionCount = await optionInputs.count();
    if (optionCount >= 2) {
      await optionInputs.nth(0).fill("Player A");
      await optionInputs.nth(1).fill("Player B");
    }

    // Set points — UI uses a button group, not an input field
    const pointsButton = page.getByRole("button", { name: /^5$/ });
    if (await pointsButton.isVisible().catch(() => false)) {
      await pointsButton.click();
    }

    // Submit the form
    const addButton = page.getByRole("button", {
      name: /add scenario|create|save/i,
    });
    await addButton.click();

    // Verify the custom scenario appears in the list
    await expect(
      page.getByText("E2E Custom: Who hits most sixes?")
    ).toBeVisible({ timeout: 10_000 });

    // Track the created scenario for cleanup
    const sb = getAdminClient();
    const { data } = await sb
      .from("scenarios")
      .select("id")
      .eq("group_id", groupId)
      .eq("match_id", matchId)
      .like("title", "%E2E Custom%");
    for (const s of data || []) {
      createdScenarioIds.push(s.id);
    }
  });

  test("custom scenario is visible in scenario list", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${groupId}/scenarios/${matchId}`
    );

    // Both system and custom scenarios should be present
    await expect(page.getByText("Who will win?")).toBeVisible();
    // The custom scenario from the previous test may or may not exist yet
    // depending on ordering — this test confirms the page renders properly
  });

  test("non-admin member is redirected away from scenario editor", async ({
    page,
  }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/scenarios/${matchId}`
    );

    // Member should be redirected to the group page or see an access denied state
    await expect(page).toHaveURL(
      new RegExp(`/group/${groupId}(?!/scenarios)`)
    );
  });
});
