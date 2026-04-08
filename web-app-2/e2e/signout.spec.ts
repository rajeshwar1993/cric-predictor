import { test, expect } from '@playwright/test'

/**
 * Sign out flow: User menu → Sign out → Landing page
 *
 * Requires an authenticated user session. Tests are marked .skip until
 * the auth bypass fixture is implemented.
 */

test.describe('Sign out flow', () => {
  test.skip('should show sign out option in user menu', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    await page.goto('/dashboard')

    // Open user menu (avatar/profile button in the header)
    await page.getByRole('button', { name: /profile|account|menu|avatar/i }).click()

    await expect(page.getByRole('menuitem', { name: /sign out|log out/i })).toBeVisible()
  })

  test.skip('should sign out and redirect to landing page', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    await page.goto('/dashboard')

    // Open user menu and click sign out
    await page.getByRole('button', { name: /profile|account|menu|avatar/i }).click()
    await page.getByRole('menuitem', { name: /sign out|log out/i }).click()

    // Should redirect to landing page
    await expect(page).toHaveURL('/')
  })

  test.skip('should not be able to access dashboard after sign out', async ({ page }) => {
    // TODO: Login via auth bypass fixture, then sign out
    await page.goto('/dashboard')

    // Open user menu and sign out
    await page.getByRole('button', { name: /profile|account|menu|avatar/i }).click()
    await page.getByRole('menuitem', { name: /sign out|log out/i }).click()
    await expect(page).toHaveURL('/')

    // Try to access a protected route
    await page.goto('/dashboard')

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
  })
})
