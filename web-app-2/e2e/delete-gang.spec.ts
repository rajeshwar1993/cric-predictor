import { test, expect } from '@playwright/test'

/**
 * Delete gang flow: Settings → Delete with confirm → Dashboard
 *
 * Requires:
 * - An authenticated user who is the admin of a gang
 *
 * Tests are marked .skip until auth bypass fixture and test data
 * seeding are implemented.
 */

test.describe('Delete gang flow', () => {
  test.skip('should show delete option in gang settings', async ({ page }) => {
    // TODO: Login as gang admin via auth bypass fixture
    await page.goto('/gang/test-gang-id/settings')

    await expect(page.getByRole('button', { name: /delete.*gang|remove.*gang/i })).toBeVisible()
  })

  test.skip('should require confirmation before deleting', async ({ page }) => {
    // TODO: Login as gang admin via auth bypass fixture
    await page.goto('/gang/test-gang-id/settings')

    // Click delete
    await page.getByRole('button', { name: /delete.*gang|remove.*gang/i }).click()

    // Confirmation dialog should appear
    await expect(page.getByText(/are you sure|confirm|cannot be undone/i)).toBeVisible()
  })

  test.skip('should delete gang and redirect to dashboard', async ({ page }) => {
    // TODO: Login as gang admin via auth bypass fixture
    await page.goto('/gang/test-gang-id/settings')

    // Click delete
    await page.getByRole('button', { name: /delete.*gang|remove.*gang/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes.*delete/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)

    // Gang should no longer appear
    // (This verifies the soft-delete is_deleted flag works from the user's perspective)
  })
})
