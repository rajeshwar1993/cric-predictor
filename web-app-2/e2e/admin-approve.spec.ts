import { test, expect } from '@playwright/test'

/**
 * Admin approve flow: Admin approves a pending gang member
 *
 * Requires:
 * - Two authenticated users: an admin (gang creator) and a pending member
 * - A gang with auto_accept_joins = false
 * - The pending member has requested to join
 *
 * Tests are marked .skip until auth bypass fixture and multi-user
 * test data seeding are implemented.
 */

test.describe('Admin approve member flow', () => {
  test.skip('should show pending member in gang settings', async ({ page }) => {
    // TODO: Login as gang admin via auth bypass fixture
    // TODO: Gang has a pending member (seeded via globalSetup)
    await page.goto('/gang/test-gang-id/settings')

    // Pending members section should be visible
    await expect(page.getByText(/pending|requests/i)).toBeVisible()
    // The pending member's name should appear
    await expect(page.getByText(/Pending User/i)).toBeVisible()
  })

  test.skip('should approve a pending member', async ({ page }) => {
    // TODO: Login as gang admin via auth bypass fixture
    await page.goto('/gang/test-gang-id/settings')

    // Find the pending member and click approve
    await page
      .getByRole('button', { name: /approve|accept/i })
      .first()
      .click()

    // Member should move from pending to approved state
    await expect(page.getByText(/approved|member added/i)).toBeVisible()
  })

  test.skip('approved member should see the gang on their dashboard', async ({ page }) => {
    // TODO: Login as the previously-pending member via auth bypass fixture
    await page.goto('/dashboard')

    // The gang should now appear in their dashboard
    await expect(page.getByText(/Test Gang/i)).toBeVisible()
  })
})
