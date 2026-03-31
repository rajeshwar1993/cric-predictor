import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";
import {
  getAdminClient,
  addMemberToGroup,
} from "../helpers/supabase-admin";

test.describe("Member management", () => {
  test.afterAll(async () => {
    // Restore memberships to the original seeded state:
    // - pending user: member / pending
    // - member user: member / approved
    // - admin user: admin / approved
    const state = getTestState();
    const sb = getAdminClient();

    // Ensure pending user exists as pending member
    await sb
      .from("group_members")
      .delete()
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.pending.id);
    await addMemberToGroup(
      state.group.id,
      state.users.pending.id,
      "member",
      "pending"
    );

    // Ensure member user exists as approved member
    await sb
      .from("group_members")
      .delete()
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.member.id);
    await addMemberToGroup(
      state.group.id,
      state.users.member.id,
      "member",
      "approved"
    );

    // Ensure admin user exists as approved admin
    await sb
      .from("group_members")
      .delete()
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.admin.id);
    await addMemberToGroup(
      state.group.id,
      state.users.admin.id,
      "admin",
      "approved"
    );
  });

  test("owner visits admin page and sees pending members", async ({
    page,
  }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${state.group.id}/admin`
    );
    // Should see the pending user's name
    await expect(page.getByText("Pending User")).toBeVisible();
  });

  test("owner approves the pending user", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${state.group.id}/admin`
    );

    // Find the pending user's row and click approve (icon-only button, first in row)
    const pendingRow = page.getByText("Pending User").locator("..");
    const approveBtn = pendingRow.getByRole("button").first();
    await approveBtn.click();

    // Verify in DB
    const sb = getAdminClient();
    // Wait briefly for the update to propagate
    await page.waitForTimeout(1000);
    const { data } = await sb
      .from("group_members")
      .select("status")
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.pending.id)
      .single();
    expect(data!.status).toBe("approved");
  });

  test("approved user can access the group page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.pending.email,
      `/group/${state.group.id}`
    );
    // Should see the group name, not an error or redirect
    await expect(page.getByText("E2E Test Squad")).toBeVisible();
  });

  test("owner promotes member to admin", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${state.group.id}/admin`
    );

    // Find the member user's row and promote
    const memberRow = page.getByText("Squad Member").locator("..");
    const promoteBtn = memberRow
      .getByRole("button", { name: /promote|make admin/i })
      .or(page.getByRole("button", { name: /promote|make admin/i }).first());
    await promoteBtn.click();

    // Verify in DB
    await page.waitForTimeout(1000);
    const sb = getAdminClient();
    const { data } = await sb
      .from("group_members")
      .select("role")
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.member.id)
      .single();
    expect(data!.role).toBe("admin");
  });

  test("owner demotes admin back to member", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${state.group.id}/admin`
    );

    // Find the member user (now admin) and demote
    const adminRow = page.getByText("Squad Member").locator("..");
    const demoteBtn = adminRow
      .getByRole("button", { name: /demote|remove admin|make member/i })
      .or(
        page
          .getByRole("button", { name: /demote|remove admin|make member/i })
          .first()
      );
    await demoteBtn.click();

    // Verify in DB
    await page.waitForTimeout(1000);
    const sb = getAdminClient();
    const { data } = await sb
      .from("group_members")
      .select("role")
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.member.id)
      .single();
    expect(data!.role).toBe("member");
  });

  test("owner removes member", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.owner.email,
      `/group/${state.group.id}/admin`
    );

    // Find the member user and remove
    const memberRow = page.getByText("Squad Member").locator("..");
    const removeBtn = memberRow
      .getByRole("button", { name: /remove|kick/i })
      .or(page.getByRole("button", { name: /remove|kick/i }).first());
    await removeBtn.click();

    // Handle confirmation dialog if one appears
    const confirmBtn = page.getByRole("button", { name: /confirm|yes|remove/i });
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Verify in DB — member should be removed
    await page.waitForTimeout(1000);
    const sb = getAdminClient();
    const { data } = await sb
      .from("group_members")
      .select("*")
      .eq("group_id", state.group.id)
      .eq("user_id", state.users.member.id);
    expect(data).toHaveLength(0);
  });

  test("regular member cannot access /group/[id]/admin — gets redirected", async ({
    page,
  }) => {
    const state = getTestState();
    // Use the pending user who was approved but is a regular member (not admin)
    await loginAndGoto(
      page,
      state.users.pending.email,
      `/group/${state.group.id}/admin`
    );
    // Should be redirected away from admin page
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
