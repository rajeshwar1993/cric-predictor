import { test, expect } from '@playwright/test'

/**
 * Create gang flow: Dashboard → Create gang → Land on gang page
 *
 * Requires an authenticated user session. Tests are marked .skip until
 * the auth bypass fixture is implemented.
 */

test.describe('Create gang flow', () => {
  test.skip('should show create gang option on dashboard', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    await page.goto('/dashboard')

    await expect(page.getByRole('button', { name: /create.*gang|new.*gang/i })).toBeVisible()
  })

  test.skip('should create a gang and land on the gang page', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    await page.goto('/dashboard')

    // Open create gang form/modal
    await page.getByRole('button', { name: /create.*gang|new.*gang/i }).click()

    // Fill gang name
    await page.getByRole('textbox', { name: /gang name|name/i }).fill('Smoke Test Gang')

    // Submit
    await page.getByRole('button', { name: /create|submit/i }).click()

    // Should land on the new gang's page
    await expect(page).toHaveURL(/\/gang\//)
    await expect(page.getByText('Smoke Test Gang')).toBeVisible()
  })

  test.skip('should show the gang in the dashboard after creation', async ({ page }) => {
    // TODO: Login via auth bypass fixture + create gang via API
    await page.goto('/dashboard')

    // The newly created gang should appear in the dashboard list
    await expect(page.getByText('Smoke Test Gang')).toBeVisible()
  })
})
