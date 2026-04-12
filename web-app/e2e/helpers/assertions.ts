/**
 * Common assertion helpers for E2E tests.
 *
 * Provides reusable patterns for checking toasts, redirects,
 * member counts, and page readiness.
 */
import { expect, type Page } from '@playwright/test'

/**
 * Waits for a Sonner toast to appear with the expected text.
 * The app renders toasts via `<Toaster>` (sonner) in the root layout.
 */
export async function expectToastMessage(page: Page, message: string | RegExp): Promise<void> {
  const toast = page.locator('[data-sonner-toast]')
  await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 10_000 })
}

/**
 * Asserts the page navigated to the expected path.
 */
export async function expectRedirectTo(page: Page, path: string): Promise<void> {
  await page.waitForURL(`**${path}*`, { timeout: 15_000 })
  expect(new URL(page.url()).pathname).toBe(path)
}

/**
 * Asserts the visible member count in the gang UI.
 * Looks for a `data-testid="member-count"` element or text matching the pattern.
 */
export async function expectMemberCount(page: Page, count: number): Promise<void> {
  const memberCount = page
    .getByTestId('member-count')
    .or(page.getByText(new RegExp(`${count}\\s+member`, 'i')))
  await expect(memberCount).toBeVisible({ timeout: 10_000 })
}

/**
 * Waits for a page to finish loading (network idle).
 * Useful after authentication redirects or navigation.
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
}

/**
 * Asserts that the page URL contains the expected path segment.
 * Less strict than `expectRedirectTo` — useful for partial matches.
 */
export async function expectUrlContains(page: Page, segment: string): Promise<void> {
  await page.waitForURL(`**${segment}**`, { timeout: 15_000 })
  expect(page.url()).toContain(segment)
}

/**
 * Waits for an element to not be visible (removed or hidden).
 */
export async function expectNotVisible(page: Page, testId: string): Promise<void> {
  await expect(page.getByTestId(testId)).not.toBeVisible({ timeout: 10_000 })
}
