import { test, expect } from '@playwright/test'

/**
 * Join gang flow: Dashboard → Enter invite code → Join → Gang page
 *
 * Requires:
 * - An authenticated user session (different from the gang creator)
 * - A pre-existing gang with a known invite code
 *
 * Tests are marked .skip until the auth bypass fixture and test data
 * seeding are implemented.
 */

test.describe('Join gang flow', () => {
  test.skip('should show join gang option on dashboard', async ({ page }) => {
    // TODO: Login via auth bypass fixture (second user)
    await page.goto('/dashboard')

    await expect(page.getByRole('button', { name: /join.*gang|enter.*code/i })).toBeVisible()
  })

  test.skip('should join a gang with invite code (auto-accept)', async ({ page }) => {
    // TODO: Login as second user via auth bypass fixture
    // TODO: Gang must be created with auto_accept_joins = true
    await page.goto('/dashboard')

    // Open join gang form
    await page.getByRole('button', { name: /join.*gang|enter.*code/i }).click()

    // Enter invite code (seeded via globalSetup)
    await page.getByRole('textbox', { name: /invite code|code/i }).fill('TEST123')

    // Submit
    await page.getByRole('button', { name: /join|submit/i }).click()

    // Should land on the gang page (auto-accepted)
    await expect(page).toHaveURL(/\/gang\//)
  })

  test.skip('should show error for invalid invite code', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    await page.goto('/dashboard')

    await page.getByRole('button', { name: /join.*gang|enter.*code/i }).click()
    await page.getByRole('textbox', { name: /invite code|code/i }).fill('INVALID')
    await page.getByRole('button', { name: /join|submit/i }).click()

    // Should show an error message
    await expect(page.getByText(/not found|invalid|no gang/i)).toBeVisible()
  })
})
