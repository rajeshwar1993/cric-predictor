import { test, expect } from '@playwright/test'

/**
 * Predict flow: Gang page → Predict page → Fill scenarios → Submit
 *
 * Requires:
 * - An authenticated user who is a member of a gang
 * - A fixture with seeded scenarios in the prediction window
 *   (start_datetime between 12h and 45min from now)
 *
 * Tests are marked .skip until auth bypass fixture and test data
 * seeding (gang, fixture, scenarios) are implemented.
 */

test.describe('Predict flow', () => {
  test.skip('should show upcoming match on gang page', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    // TODO: Navigate to gang with seeded fixture
    await page.goto('/gang/test-gang-id')

    // An upcoming match card should be visible
    await expect(page.getByText(/upcoming|predict/i)).toBeVisible()
  })

  test.skip('should navigate to predict page from gang page', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    await page.goto('/gang/test-gang-id')

    // Click on the upcoming match to open prediction page
    await page.getByRole('link', { name: /predict|make predictions/i }).click()

    await expect(page).toHaveURL(/\/predict/)
  })

  test.skip('should fill all scenarios and submit predictions', async ({ page }) => {
    // TODO: Login via auth bypass fixture
    // TODO: Navigate to predict page for a fixture with seeded scenarios
    // The predict page URL pattern: /gang/{gangId}/predict/{fixtureId}
    await page.goto('/gang/test-gang-id/predict/test-fixture-id')

    // Scenarios should be visible
    // Each scenario has a prediction input (numeric, team selector, player picker, etc.)
    // Fill at least a few scenarios to verify the form works

    // Submit predictions
    await page.getByRole('button', { name: /submit|save|confirm/i }).click()

    // Should show success state
    await expect(page.getByText(/submitted|saved|success/i)).toBeVisible()
  })

  test.skip('should prevent prediction after deadline closes', async ({ page }) => {
    // TODO: Fixture with deadline in the past
    // Should show a "predictions closed" state, not the form
    await page.goto('/gang/test-gang-id/predict/test-past-fixture-id')

    await expect(page.getByText(/closed|locked|deadline passed/i)).toBeVisible()
  })
})
