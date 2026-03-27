import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAndGoto } from "../helpers/auth";

test.describe("Edge cases", () => {
  let groupId: string;
  let matchId: number;

  test.beforeAll(() => {
    const state = getTestState();
    groupId = state.group.id;
    matchId = state.matches.match1.id;
  });

  test("invalid group UUID returns 404 or redirects", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      "/group/00000000-0000-0000-0000-000000000000"
    );

    // Should see a 404 page or be redirected to dashboard
    const is404 = await page
      .getByText(/not found|404|doesn't exist|does not exist/i)
      .first()
      .isVisible()
      .catch(() => false);
    const isRedirected = page.url().includes("/dashboard") || page.url().includes("/login");

    expect(is404 || isRedirected).toBeTruthy();
  });

  test("invalid match ID returns 404", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.member.email,
      `/group/${groupId}/predict/99999`
    );

    // Should see a 404 or be redirected
    const is404 = await page
      .getByText(/not found|404|no match|doesn't exist|does not exist/i)
      .first()
      .isVisible()
      .catch(() => false);
    const isRedirected =
      !page.url().includes("/predict/99999");

    expect(is404 || isRedirected).toBeTruthy();
  });

  test("outsider cannot access group page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.outsider.email,
      `/group/${groupId}`
    );

    // Outsider should be redirected to dashboard or see an error
    const isRedirected =
      page.url().includes("/dashboard") || page.url().includes("/login");
    const isError = await page
      .getByText(/not a member|access denied|not found|unauthorized/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(isRedirected || isError).toBeTruthy();
  });

  test("pending user cannot access predict page", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(
      page,
      state.users.pending.email,
      `/group/${groupId}/predict/${matchId}`
    );

    // Pending user should be redirected away from the predict page
    const isRedirected = !page.url().includes("/predict/");
    const isBlocked = await page
      .getByText(/pending|not approved|access denied/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(isRedirected || isBlocked).toBeTruthy();
  });
});
