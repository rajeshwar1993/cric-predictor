/**
 * Suite 01: Onboarding
 *
 * Tests the first-time user experience after authentication.
 * All 8 test users are onboarded in this suite so subsequent suites
 * can authenticate with `skipOnboardingCookie: false` (the default).
 *
 * Tests run serially — each builds on state from the previous.
 */
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import { readAuthState } from './helpers/auth-state'
import { expectRedirectTo, waitForPageReady } from './helpers/assertions'

test.describe.configure({ mode: 'serial' })

test.describe('Suite 01: Onboarding', () => {
  // ─── 1.1 First login redirects to /onboarding ─────────────────��────
  test('1.1 — First login redirects to /onboarding', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      skipOnboardingCookie: true,
      navigateTo: '/dashboard',
    })

    // The middleware should redirect unonboarded users to /onboarding
    await expectRedirectTo(page, '/onboarding')

    await context.close()
  })

  // ─── 1.2 Onboarding form validation — empty fields ─────────────────
  test('1.2 — Submit onboarding form empty shows validation errors', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      skipOnboardingCookie: true,
      navigateTo: '/onboarding',
    })

    await waitForPageReady(page)

    // Click submit without filling any fields
    await page.getByRole('button', { name: "Let's Go" }).click()

    // Expect validation error alerts
    const alerts = page.getByRole('alert')
    await expect(alerts.first()).toBeVisible({ timeout: 5_000 })

    // Expect specific error messages
    await expect(
      page.getByText('Display name must be at least 2 characters'),
    ).toBeVisible()
    await expect(page.getByText('Date of birth is required')).toBeVisible()
    await expect(
      page.getByText(
        'You must accept the Terms of Service and Privacy Policy',
      ),
    ).toBeVisible()

    await context.close()
  })

  // ─── 1.3 Onboarding form validation — underage ─────────────────────
  test('1.3 — Underage DOB shows age error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      skipOnboardingCookie: true,
      navigateTo: '/onboarding',
    })

    await waitForPageReady(page)

    // Fill display name (valid)
    await page.locator('#onboarding-display-name').fill('TestUser Alpha')

    // Fill DOB that makes user < 18 (born 2015-06-15 — would be ~11 years old)
    await page.locator('#onboarding-dob-day').fill('15')
    await page.locator('#onboarding-dob-month').fill('06')
    await page.locator('#onboarding-dob-year').fill('2015')

    // Check terms
    await page.locator('#onboarding-terms').click()

    // Submit
    await page.getByRole('button', { name: "Let's Go" }).click()

    // Expect underage error
    await expect(
      page.getByText('You must be 18 or older to use Bragg'),
    ).toBeVisible()

    await context.close()
  })

  // ─── 1.4 Onboarding form validation — display name too short ───────
  test('1.4 — Display name too short shows validation error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      skipOnboardingCookie: true,
      navigateTo: '/onboarding',
    })

    await waitForPageReady(page)

    // Fill 1-char display name
    await page.locator('#onboarding-display-name').fill('A')

    // Fill valid DOB (2000-01-15)
    await page.locator('#onboarding-dob-day').fill('15')
    await page.locator('#onboarding-dob-month').fill('01')
    await page.locator('#onboarding-dob-year').fill('2000')

    // Check terms
    await page.locator('#onboarding-terms').click()

    // Submit
    await page.getByRole('button', { name: "Let's Go" }).click()

    // Expect display name validation error
    await expect(
      page.getByText('Display name must be at least 2 characters'),
    ).toBeVisible()

    await context.close()
  })

  // ─── 1.5 Successful onboarding for User 0 ──────────────────────────
  test('1.5 — Successful onboarding redirects to /dashboard', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      skipOnboardingCookie: true,
      navigateTo: '/onboarding',
    })

    await waitForPageReady(page)

    // Fill valid display name
    await page.locator('#onboarding-display-name').fill('TestUser Alpha')

    // Fill valid DOB (2000-01-15)
    await page.locator('#onboarding-dob-day').fill('15')
    await page.locator('#onboarding-dob-month').fill('01')
    await page.locator('#onboarding-dob-year').fill('2000')

    // Accept terms
    await page.locator('#onboarding-terms').click()

    // Submit
    await page.getByRole('button', { name: "Let's Go" }).click()

    // Should show loading state
    await expect(page.getByText('Setting up...')).toBeVisible()

    // Should redirect to dashboard after onboarding completes
    await expectRedirectTo(page, '/dashboard')

    await context.close()
  })

  // ─── 1.6 Complete onboarding for Users 1–7 ─────────────────────────
  test('1.6 — Complete onboarding for Users 1–7', async ({ browser }) => {
    const authState = readAuthState()

    for (let i = 1; i <= 7; i++) {
      const user = authState.users[i]!
      const context = await browser.newContext()
      const page = await context.newPage()

      await authenticate(page, i, {
        skipOnboardingCookie: true,
        navigateTo: '/onboarding',
      })

      await waitForPageReady(page)

      // Fill display name from auth state
      await page.locator('#onboarding-display-name').fill(user.displayName)

      // Fill valid DOB — stagger years so they're all 18+ (1990+index)
      const year = 1990 + i
      await page.locator('#onboarding-dob-day').fill('15')
      await page.locator('#onboarding-dob-month').fill('03')
      await page.locator('#onboarding-dob-year').fill(String(year))

      // Accept terms
      await page.locator('#onboarding-terms').click()

      // Submit
      await page.getByRole('button', { name: "Let's Go" }).click()

      // Wait for redirect to dashboard
      await expectRedirectTo(page, '/dashboard')

      await context.close()
    }
  })

  // ─── 1.7 Onboarded user visiting /onboarding is redirected ─────────
  test('1.7 — Already onboarded user redirected from /onboarding to /dashboard', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Authenticate User 0 with the onboarding cookie set (default)
    await authenticate(page, 0, { navigateTo: '/onboarding' })

    // Should be redirected back to dashboard
    await expectRedirectTo(page, '/dashboard')

    await context.close()
  })

  // ─── 1.8 Dashboard shows empty state ───────────────────────────────
  test('1.8 — Dashboard with no gangs shows empty state', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    // Empty state message from GangsGrid
    await expect(page.getByText('No gangs yet')).toBeVisible()
    await expect(
      page.getByText(
        'Create a gang or join one with an invite code to start predicting.',
      ),
    ).toBeVisible()

    // Create gang form should be visible in empty state
    await expect(page.locator('#gang-name')).toBeVisible()

    // Join gang form should also be visible in empty state
    await expect(page.locator('#invite-code')).toBeVisible()

    await context.close()
  })
})
