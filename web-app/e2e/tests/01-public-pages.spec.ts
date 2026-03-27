import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("landing page loads with Bragg title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bragg/);
  });

  test('"Start Your Squad" link navigates to /login', async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /start your squad/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveURL(/\/privacy/);
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveURL(/\/terms/);
  });

  test("unauthenticated user visiting /dashboard gets redirected to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
