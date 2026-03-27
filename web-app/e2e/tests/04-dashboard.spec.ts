import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";

test.describe("Dashboard", () => {
  test("logged in as owner sees 'Your Squads' heading", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");
    const heading = page.getByRole("heading", { name: /your squads/i });
    await expect(heading).toBeVisible();
  });

  test("group card for 'E2E Test Squad' is visible", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");
    await expect(page.getByText("E2E Test Squad")).toBeVisible();
  });

  test("group card has link to the group page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");

    const groupLink = page.getByRole("link", { name: /E2E Test Squad/i });
    await expect(groupLink).toBeVisible();
    await groupLink.click();
    await expect(page).toHaveURL(new RegExp(`/group/${state.group.id}`));
  });

  test('"Start a New Squad" section is visible', async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");
    await expect(
      page.getByText(/start a new squad|create.*squad/i)
    ).toBeVisible();
  });
});
