import { test, expect } from '@playwright/test'

/**
 * Signup flow: Landing → Login → Onboarding → Dashboard
 *
 * This flow requires magic-link authentication. In a full E2E setup,
 * bypass the email flow by querying auth.users for the confirmation_token
 * via the Supabase service role key, or use supabase.auth.admin.generateLink().
 *
 * Tests are marked as .skip until the magic-link bypass fixture is implemented.
 */

test.describe('Signup flow', () => {
  test.skip('should navigate from landing to login page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bragg/i)

    // Click the primary CTA to go to login
    await page.getByRole('link', { name: /get started|sign up|login/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test.skip('should show email input on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  })

  test.skip('should send magic link and show confirmation', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('textbox', { name: /email/i }).fill('test-signup@bragg.test')
    await page.getByRole('button', { name: /send|continue|magic link/i }).click()

    // Should show a confirmation message (check your email)
    await expect(page.getByText(/check your email|magic link sent/i)).toBeVisible()
  })

  test.skip('should complete onboarding after magic link auth', async ({ page }) => {
    // TODO: Implement magic-link bypass via Supabase admin API
    // 1. Use supabase.auth.admin.generateLink({ type: 'magiclink', email })
    // 2. Navigate to the returned link
    // 3. Should redirect to /onboarding for first-time users

    await page.goto('/onboarding')

    // Fill onboarding form (display name, date of birth)
    await page.getByRole('textbox', { name: /display name|name/i }).fill('Smoke Test User')
    // Fill date of birth (must be 18+)
    // Submit onboarding
    await page.getByRole('button', { name: /continue|finish|let's go/i }).click()

    // Should land on dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test.skip('full signup journey: landing → login → onboarding → dashboard', async ({ page }) => {
    // TODO: Wire up with magic-link bypass fixture
    // This is the end-to-end happy path test combining all steps above.
    // Requires: globalSetup with Supabase service role key for auth bypass.

    await page.goto('/')
    await page.getByRole('link', { name: /get started|sign up|login/i }).click()
    await expect(page).toHaveURL(/\/login/)

    // Enter email and trigger magic link
    // Bypass magic link via admin API
    // Complete onboarding
    // Verify dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
