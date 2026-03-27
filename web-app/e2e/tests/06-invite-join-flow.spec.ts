import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";
import { getAdminClient } from "../helpers/supabase-admin";

test.describe("Invite and join flow", () => {
  test.afterAll(async () => {
    // Clean up outsider's membership if they joined during these tests
    const state = getTestState();
    const sb = getAdminClient();
    await sb
      .from("group_members")
      .delete()
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.outsider.id);
  });

  test("owner sees invite link/buttons on group page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${state.group.id}`
    );
    // Should see invite-related UI (link, button, or share element)
    await expect(
      page.getByRole("button", { name: /invite|share|copy/i }).or(
        page.getByText(/invite/i)
      )
    ).toBeVisible();
  });

  test("outsider visiting /join/[inviteCode] sees group name", async ({
    page,
  }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.outsider.email,
      `/join/${state.group.invite_code}`
    );
    await expect(page.getByText("E2E Test Squad")).toBeVisible();
  });

  test("outsider joins via the join page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.outsider.email,
      `/join/${state.group.invite_code}`
    );

    // Click the join button
    const joinBtn = page.getByRole("button", { name: /join/i });
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();

    // Should see a success state — either redirected to group or shown confirmation
    await expect(
      page.getByText(/pending|requested|awaiting|joined/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("outsider gets pending status", async () => {
    const state = getTestState();
    const sb = getAdminClient();
    const { data } = await sb
      .from("group_members")
      .select("status")
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.outsider.id)
      .single();
    expect(data).not.toBeNull();
    expect(data!.status).toBe("pending");
  });

  test("invalid invite code shows error", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.outsider.email,
      "/join/INVALID-CODE-999"
    );
    // Should show an error or "not found" message
    await expect(
      page.getByText(/not found|invalid|expired|doesn't exist/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
