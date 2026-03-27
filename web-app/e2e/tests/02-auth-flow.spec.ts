import { test, expect } from "@playwright/test";
import { getTestState } from "../global-setup";
import { loginAsBrowser, loginAndGoto } from "../helpers/auth";

test.describe("Auth flow", () => {
  test("login page shows email input", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByRole("textbox", { name: /email/i });
    await expect(emailInput).toBeVisible();
  });

  test("injected session grants access to /dashboard", async ({ page }) => {
    const state = getTestState();
    await loginAndGoto(page, state.users.owner.email, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    // Should see dashboard content, not be redirected to login
    await expect(page.locator("body")).not.toContainText("Sign in");
  });

  test("invalid/expired session redirects to /login", async ({ page }) => {
    const baseUrl =
      process.env.QA_BASE_URL || "http://localhost:3000";
    const domain = new URL(baseUrl).hostname;

    // Set a fake auth cookie that looks like a Supabase token but is invalid
    await page.context().addCookies([
      {
        name: "sb-fake-auth-token.0",
        value: "base64-" + Buffer.from('{"access_token":"expired.invalid.token","refresh_token":"bad","expires_in":0,"expires_at":0,"token_type":"bearer","user":{}}').toString("base64"),
        domain,
        path: "/",
        httpOnly: false,
        secure: baseUrl.startsWith("https"),
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("authenticated user on / redirects to /dashboard", async ({ page }) => {
    const state = getTestState();
    await loginAsBrowser(page, state.users.owner.email);
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("authenticated user on /login redirects to /dashboard", async ({
    page,
  }) => {
    const state = getTestState();
    await loginAsBrowser(page, state.users.owner.email);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
