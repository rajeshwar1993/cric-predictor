import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAsBrowser, loginAndGoto } from "../helpers/auth";
import {
  createTestUser,
  deleteTestUser,
} from "../helpers/supabase-admin";
import { TEST_EMAIL_DOMAIN } from "../fixtures/test-users";

let freshUserId: string | null = null;
const freshUserEmail = `onboard-test@${TEST_EMAIL_DOMAIN}`;
const freshUserDisplayName = "Fresh Onboard User";

test.describe("Onboarding flow", () => {
  test.beforeAll(async () => {
    // Create a fresh user who has NOT been onboarded
    const user = await createTestUser(freshUserEmail, freshUserDisplayName);
    freshUserId = user.id;
  });

  test.afterAll(async () => {
    if (freshUserId) {
      await deleteTestUser(freshUserId);
      freshUserId = null;
    }
  });

  test("new user accessing /dashboard is redirected to /onboarding", async ({
    page,
  }) => {
    // Login without the bragg_onboarded cookie
    const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const { getSessionForUser } = await import("../helpers/auth");
    const session = await getSessionForUser(freshUserEmail);
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const domain = new URL(baseUrl).hostname;
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: "bearer",
      user: session.user,
    });
    const encoded = Buffer.from(cookieValue).toString("base64");

    // Set auth cookie but NOT the bragg_onboarded cookie
    await page.context().addCookies([
      {
        name: `${cookieName}.0`,
        value: `base64-${encoded}`,
        domain,
        path: "/",
        httpOnly: false,
        secure: baseUrl.startsWith("https"),
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("fill in onboarding form and submit", async ({ page }) => {
    // Login without onboarded cookie
    const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const { getSessionForUser } = await import("../helpers/auth");
    const session = await getSessionForUser(freshUserEmail);
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const domain = new URL(baseUrl).hostname;
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: "bearer",
      user: session.user,
    });
    const encoded = Buffer.from(cookieValue).toString("base64");

    await page.context().addCookies([
      {
        name: `${cookieName}.0`,
        value: `base64-${encoded}`,
        domain,
        path: "/",
        httpOnly: false,
        secure: baseUrl.startsWith("https"),
        sameSite: "Lax",
      },
    ]);

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/onboarding/);

    // Fill display name
    const displayNameInput = page.getByLabel(/display name/i);
    await displayNameInput.fill("E2E Onboarded");

    // Fill date of birth
    const dobInput = page.getByLabel(/date of birth/i);
    await dobInput.fill("2000-05-15");

    // Accept terms
    const termsCheckbox = page.getByRole("checkbox", { name: /terms/i });
    await termsCheckbox.check();

    // Submit the form
    const submitButton = page.getByRole("button", { name: /continue|submit|get started/i });
    await submitButton.click();

    // After onboarding, should be redirected to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("already-onboarded user is redirected from /onboarding to /dashboard", async ({
    page,
  }) => {
    const state = getTestState();
    // The owner user is already onboarded
    await loginAndGoto(page, state.users.owner.email, "/onboarding");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
