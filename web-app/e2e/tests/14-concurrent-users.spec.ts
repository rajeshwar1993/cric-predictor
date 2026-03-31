import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAsBrowser } from "../helpers/auth";
import { getAdminClient } from "../helpers/supabase-admin";

/**
 * Create a fresh browser context and page, then inject auth cookies for the
 * given user email. Returns both the context (for cleanup) and the page.
 */
async function createAuthenticatedContext(
  browser: Browser,
  email: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsBrowser(page, email);
  return { context, page };
}

test.describe("Concurrent multi-user scenarios", () => {
  let contexts: BrowserContext[] = [];

  test.afterEach(async () => {
    // Close all browser contexts created during the test
    for (const ctx of contexts) {
      await ctx.close();
    }
    contexts = [];
  });

  test.afterAll(async () => {
    // Clean up any predictions created during concurrent tests
    const state = getTestState();
    const sb = getAdminClient();
    const groupId = state.group.id;
    const matchId = state.matches.match2.id;

    const { data: scenarios } = await sb
      .from("scenarios")
      .select("id")
      .eq("group_id", groupId)
      .eq("match_id", matchId);

    const scenarioIds = (scenarios || []).map((s) => s.id);
    if (scenarioIds.length > 0) {
      const userIds = [
        state.users.owner.id,
        state.users.admin.id,
        state.users.member.id,
      ];
      await sb
        .from("predictions")
        .delete()
        .in("scenario_id", scenarioIds)
        .in("user_id", userIds);
    }

    // Remove outsider membership if created during join test
    await sb
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", state.users.outsider.id);
  });

  test("three users submit predictions simultaneously", async ({
    browser,
  }) => {
    const state = getTestState();
    const groupId = state.group.id;
    // Use match2 to avoid conflicts with suite 09 which uses match1
    const matchId = state.matches.match2.id;
    const predictUrl = `/group/${groupId}/predict/${matchId}`;

    // Create 3 authenticated browser contexts
    const owner = await createAuthenticatedContext(
      browser,
      state.users.owner.email
    );
    const admin = await createAuthenticatedContext(
      browser,
      state.users.admin.email
    );
    const member = await createAuthenticatedContext(
      browser,
      state.users.member.email
    );
    contexts.push(owner.context, admin.context, member.context);

    // Navigate all three users to the prediction page
    await Promise.all([
      owner.page.goto(predictUrl),
      admin.page.goto(predictUrl),
      member.page.goto(predictUrl),
    ]);

    // Wait for scenario cards to load on all pages — match2 is CSK vs MI
    await Promise.all([
      expect(owner.page.getByText("Who will win?")).toBeVisible({
        timeout: 15_000,
      }),
      expect(admin.page.getByText("Who will win?")).toBeVisible({
        timeout: 15_000,
      }),
      expect(member.page.getByText("Who will win?")).toBeVisible({
        timeout: 15_000,
      }),
    ]);

    // Each user selects a different team — match2 is CSK vs MI
    await owner.page.getByRole("button", { name: /CSK/i }).first().click();
    await admin.page.getByRole("button", { name: /MI/i }).first().click();
    await member.page.getByRole("button", { name: /CSK/i }).first().click();

    // All three submit simultaneously
    await Promise.all([
      owner.page.getByRole("button", { name: /lock it in|submit|save/i }).click(),
      admin.page.getByRole("button", { name: /lock it in|submit|save/i }).click(),
      member.page
        .getByRole("button", { name: /lock it in|submit|save/i })
        .click(),
    ]);

    // Verify each sees success feedback
    await Promise.all([
      expect(
        owner.page.getByText(/locked in|success|saved/i).first()
      ).toBeVisible({ timeout: 10_000 }),
      expect(
        admin.page.getByText(/locked in|success|saved/i).first()
      ).toBeVisible({ timeout: 10_000 }),
      expect(
        member.page.getByText(/locked in|success|saved/i).first()
      ).toBeVisible({ timeout: 10_000 }),
    ]);

    // Verify in the database that all three predictions are saved correctly
    const sb = getAdminClient();
    const { data: scenarios } = await sb
      .from("scenarios")
      .select("id")
      .eq("group_id", groupId)
      .eq("match_id", matchId)
      .eq("system_category", "match_winner");

    expect(scenarios).not.toBeNull();
    const winnerScenarioId = scenarios![0].id;

    for (const [userId, expectedValue] of [
      [state.users.owner.id, "CSK"],
      [state.users.admin.id, "MI"],
      [state.users.member.id, "CSK"],
    ] as const) {
      const { data: prediction } = await sb
        .from("predictions")
        .select("value")
        .eq("scenario_id", winnerScenarioId)
        .eq("user_id", userId)
        .single();
      expect(prediction).not.toBeNull();
      expect(prediction!.value).toBe(expectedValue);
    }
  });

  test("user joins group while another user makes predictions", async ({
    browser,
  }) => {
    const state = getTestState();
    const groupId = state.group.id;
    const matchId = state.matches.match2.id;

    // Owner views group members, outsider joins, member submits prediction
    const ownerCtx = await createAuthenticatedContext(
      browser,
      state.users.owner.email
    );
    const outsiderCtx = await createAuthenticatedContext(
      browser,
      state.users.outsider.email
    );
    const memberCtx = await createAuthenticatedContext(
      browser,
      state.users.member.email
    );
    contexts.push(ownerCtx.context, outsiderCtx.context, memberCtx.context);

    // Navigate concurrently: owner to group page, outsider to join page,
    // member to prediction page
    await Promise.all([
      ownerCtx.page.goto(`/group/${groupId}`),
      outsiderCtx.page.goto(`/join/${state.group.invite_code}`),
      memberCtx.page.goto(`/group/${groupId}/predict/${matchId}`),
    ]);

    // Wait for pages to load
    await Promise.all([
      expect(
        ownerCtx.page.getByText("E2E Test Squad")
      ).toBeVisible({ timeout: 15_000 }),
      expect(
        outsiderCtx.page.getByText("E2E Test Squad")
      ).toBeVisible({ timeout: 15_000 }),
      expect(
        memberCtx.page.getByText("Who will win?")
      ).toBeVisible({ timeout: 15_000 }),
    ]);

    // Outsider joins and member submits prediction concurrently
    const joinBtn = outsiderCtx.page.getByRole("button", { name: /let me in|join/i });
    await expect(joinBtn).toBeVisible();

    // Select a prediction option on member's page (match2 is CSK vs MI)
    await memberCtx.page
      .getByRole("button", { name: /MI/i })
      .first()
      .click();

    // Execute both actions concurrently
    await Promise.all([
      joinBtn.click(),
      memberCtx.page
        .getByRole("button", { name: /lock it in|submit|save/i })
        .click(),
    ]);

    // Verify outsider got pending status
    await expect(
      outsiderCtx.page.getByText(/hang tight|pending|requested|awaiting|joined/i)
    ).toBeVisible({ timeout: 10_000 });

    // Verify member's prediction succeeded
    await expect(
      memberCtx.page.getByText(/locked in|success|saved/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("multiple users view dashboard simultaneously without session leakage", async ({
    browser,
  }) => {
    const state = getTestState();

    // Create contexts for three different users
    const ownerCtx = await createAuthenticatedContext(
      browser,
      state.users.owner.email
    );
    const adminCtx = await createAuthenticatedContext(
      browser,
      state.users.admin.email
    );
    const memberCtx = await createAuthenticatedContext(
      browser,
      state.users.member.email
    );
    contexts.push(ownerCtx.context, adminCtx.context, memberCtx.context);

    // All navigate to dashboard at the same time
    await Promise.all([
      ownerCtx.page.goto("/dashboard"),
      adminCtx.page.goto("/dashboard"),
      memberCtx.page.goto("/dashboard"),
    ]);

    // Each user should see the E2E Test Squad group on their dashboard
    await Promise.all([
      expect(ownerCtx.page.getByText("E2E Test Squad")).toBeVisible({
        timeout: 15_000,
      }),
      expect(adminCtx.page.getByText("E2E Test Squad")).toBeVisible({
        timeout: 15_000,
      }),
      expect(memberCtx.page.getByText("E2E Test Squad")).toBeVisible({
        timeout: 15_000,
      }),
    ]);

    // Verify each session shows the correct user — check display name is
    // present somewhere on the page (nav, avatar, profile section)
    await Promise.all([
      expect(
        ownerCtx.page.getByText("Squad Owner").first()
      ).toBeVisible(),
      expect(
        adminCtx.page.getByText("Squad Admin").first()
      ).toBeVisible(),
      expect(
        memberCtx.page.getByText("Squad Member").first()
      ).toBeVisible(),
    ]);
  });
});
