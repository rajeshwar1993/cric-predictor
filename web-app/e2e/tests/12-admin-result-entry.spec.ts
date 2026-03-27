import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";

test.describe("Admin result entry", () => {
  let groupId: string;

  test.beforeAll(() => {
    const state = getTestState();
    groupId = state.group.id;
  });

  test("owner can see result entry form on admin page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${groupId}/admin`
    );

    // Admin page should load with result entry section
    await expect(
      page
        .getByText(/result|admin|manage/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // Look for a form or section related to entering match results
    const resultSection = page
      .getByText(/enter result|match result|resolve/i)
      .first();
    const formElement = page.locator("form").first();

    const hasResultSection = await resultSection
      .isVisible()
      .catch(() => false);
    const hasForm = await formElement.isVisible().catch(() => false);

    expect(hasResultSection || hasForm).toBeTruthy();
  });

  test("non-admin member is redirected from admin page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/admin`
    );

    // Member should be redirected away from admin page
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
