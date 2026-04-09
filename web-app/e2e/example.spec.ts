import { expect, test } from '@playwright/test'

/**
 * Placeholder E2E test — verifies the app loads.
 * Replace with real user-flow tests as features are implemented.
 */
test('homepage loads successfully', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.*/)
})
