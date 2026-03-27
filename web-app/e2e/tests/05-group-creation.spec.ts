import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";
import { getAdminClient } from "../helpers/supabase-admin";

let createdGroupId: string | null = null;

test.describe("Group creation", () => {
  test.afterAll(async () => {
    if (createdGroupId) {
      const sb = getAdminClient();
      await sb.from("groups").delete().eq("id", createdGroupId);
      createdGroupId = null;
    }
  });

  test("create a group with valid name", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");

    // Click the create/start squad button or link
    const createTrigger = page.getByRole("link", {
      name: /start a new squad|create.*squad/i,
    }).or(
      page.getByRole("button", { name: /start a new squad|create.*squad/i })
    );
    await createTrigger.click();

    // Fill in the group name
    const nameInput = page.getByLabel(/name/i).or(
      page.getByPlaceholder(/squad name/i)
    );
    await nameInput.fill("Test Squad Alpha");

    // Submit the form
    const submitBtn = page.getByRole("button", {
      name: /create|start|submit/i,
    });
    await submitBtn.click();

    // Should navigate to the new group page or back to dashboard
    await page.waitForURL(/\/(group\/|dashboard)/, { timeout: 15_000 });

    // Extract group ID if redirected to group page
    const url = page.url();
    const groupMatch = url.match(/\/group\/([a-f0-9-]+)/);
    if (groupMatch) {
      createdGroupId = groupMatch[1];
    }
  });

  test("group appears on dashboard", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");
    await expect(page.getByText("Test Squad Alpha")).toBeVisible();
  });

  test("navigate to the new group page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");

    const groupLink = page.getByRole("link", { name: /Test Squad Alpha/i });
    await groupLink.click();
    await expect(page).toHaveURL(/\/group\//);

    // Store group ID for cleanup if we haven't already
    if (!createdGroupId) {
      const url = page.url();
      const groupMatch = url.match(/\/group\/([a-f0-9-]+)/);
      if (groupMatch) {
        createdGroupId = groupMatch[1];
      }
    }
  });

  test("user is the owner of the created group", async ({ page }) => {
    const state = getTestState();
    // If we know the group ID, navigate directly
    if (createdGroupId) {
      await loginAndGoto(
        page,
        state.users.owner.email,
        `/group/${createdGroupId}`
      );
    } else {
      await loginAndGoto(page, state.users.owner.email, "/dashboard");
      await page.getByRole("link", { name: /Test Squad Alpha/i }).click();
    }

    // Owner should see admin/settings controls
    await expect(
      page.getByRole("link", { name: /admin|settings/i }).or(
        page.getByRole("button", { name: /admin|settings|manage/i })
      )
    ).toBeVisible();
  });
});
