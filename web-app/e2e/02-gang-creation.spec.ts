/**
 * Suite 02: Gang Creation
 *
 * Tests creating gangs, validation errors, and verifying
 * gang pages and dashboard cards after creation.
 *
 * Stores Gang A, B, C in shared state for use by later suites.
 * After all gangs are created, enrolls each in the league season
 * so scenario seeding works in Suite 05.
 */
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import {
  expectToastMessage,
  waitForPageReady,
} from './helpers/assertions'
import { getSharedState, updateSharedState } from './helpers/shared-state'
import { getGangInviteCode, enrollGangInLeagueSeason } from './helpers/gangs'

test.describe.configure({ mode: 'serial' })

test.describe('Suite 02: Gang Creation', () => {
  // ─── 2.1 Create gang — form validation (empty) ─────────────────────
  test('2.1 — Submit empty gang name shows validation error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    // The create gang form is on the dashboard (either empty state or below grid)
    const gangNameInput = page.locator('#gang-name')
    await expect(gangNameInput).toBeVisible()

    // Clear the input and try to submit by pressing Enter on the form
    await gangNameInput.fill('')
    await gangNameInput.press('Enter')

    // The button should be disabled when name is too short (< 3 chars)
    // Verify the Create Gang button is disabled
    const createButton = page.getByRole('button', { name: 'Create Gang' })
    await expect(createButton).toBeDisabled()

    await context.close()
  })

  // ─── 2.2 Create gang — name too short ──────────────────────────────
  test('2.2 — Gang name "AB" (too short) shows validation error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    const gangNameInput = page.locator('#gang-name')
    await gangNameInput.fill('AB')

    // Button should be disabled because trimmedLength < 3
    const createButton = page.getByRole('button', { name: 'Create Gang' })
    await expect(createButton).toBeDisabled()

    // Force submit via Enter to trigger client-side validation
    await gangNameInput.press('Enter')

    // Expect inline validation error
    await expect(
      page.getByText('Gang name must be at least 3 characters'),
    ).toBeVisible()

    await context.close()
  })

  // ─── 2.3 Create Gang A — User 0 ────────────────────────────────────
  test('2.3 — User 0 creates "E2E Alpha Squad"', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    const gangNameInput = page.locator('#gang-name')
    await gangNameInput.fill('E2E Alpha Squad')

    const createButton = page.getByRole('button', { name: 'Create Gang' })
    await expect(createButton).toBeEnabled()
    await createButton.click()

    // Should show loading state
    await expect(page.getByText('Creating...')).toBeVisible()

    // Should show success toast
    await expectToastMessage(page, 'Gang created!')

    // Should redirect to gang page
    await page.waitForURL('**/group/**', { timeout: 15_000 })
    const url = new URL(page.url())
    const gangId = url.pathname.split('/group/')[1]?.split('/')[0]
    expect(gangId).toBeTruthy()

    // Wait for page to load
    await waitForPageReady(page)

    // Verify gang name is shown
    await expect(page.getByRole('heading', { name: 'E2E Alpha Squad' })).toBeVisible()

    // Verify member count shows 1
    await expect(page.getByText(/1\/20 members/)).toBeVisible()

    // Get invite code from DB and store in shared state
    const inviteCode = await getGangInviteCode(gangId!)
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/)

    updateSharedState({
      gangs: { gangA: { id: gangId!, inviteCode } },
    })

    await context.close()
  })

  // ─── 2.4 Create Gang B — User 1 ────────────────────────────────────
  test('2.4 — User 1 creates "E2E Bravo Bunch"', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 1, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    const gangNameInput = page.locator('#gang-name')
    await gangNameInput.fill('E2E Bravo Bunch')

    const createButton = page.getByRole('button', { name: 'Create Gang' })
    await createButton.click()

    await expectToastMessage(page, 'Gang created!')
    await page.waitForURL('**/group/**', { timeout: 15_000 })

    const url = new URL(page.url())
    const gangId = url.pathname.split('/group/')[1]?.split('/')[0]
    expect(gangId).toBeTruthy()

    const inviteCode = await getGangInviteCode(gangId!)

    updateSharedState({
      gangs: { gangB: { id: gangId!, inviteCode } },
    })

    await context.close()
  })

  // ─── 2.5 Create Gang C — User 2 ────────────────────────────────────
  test('2.5 — User 2 creates "E2E Charlie Crew"', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 2, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    const gangNameInput = page.locator('#gang-name')
    await gangNameInput.fill('E2E Charlie Crew')

    const createButton = page.getByRole('button', { name: 'Create Gang' })
    await createButton.click()

    await expectToastMessage(page, 'Gang created!')
    await page.waitForURL('**/group/**', { timeout: 15_000 })

    const url = new URL(page.url())
    const gangId = url.pathname.split('/group/')[1]?.split('/')[0]
    expect(gangId).toBeTruthy()

    const inviteCode = await getGangInviteCode(gangId!)

    updateSharedState({
      gangs: { gangC: { id: gangId!, inviteCode } },
    })

    await context.close()
  })

  // ─── 2.6 Gang A shows correct initial state ─────────────────────��──
  test('2.6 — User 0 views Gang A — shows name, 1 member, invite code', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}`,
    })
    await waitForPageReady(page)

    // Gang name
    await expect(
      page.getByRole('heading', { name: 'E2E Alpha Squad' }),
    ).toBeVisible()

    // Member count
    await expect(page.getByText(/1\/20 members/)).toBeVisible()

    // Invite share section should be visible (Copy invite link button)
    await expect(
      page.getByRole('button', { name: /Copy invite link/ }),
    ).toBeVisible()

    // Settings link visible for admin
    await expect(
      page.getByRole('link', { name: 'Gang settings' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 2.7 Dashboard shows created gang ──────────────────────────────
  test('2.7 — User 0 dashboard shows Gang A card', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    // Gang A card should be visible
    const gangCard = page.getByRole('link', {
      name: 'View E2E Alpha Squad gang',
    })
    await expect(gangCard).toBeVisible()

    // Card shows member count
    await expect(page.getByText('1/20 members')).toBeVisible()

    await context.close()
  })

  // ─── 2.8 Invite code is 6-char alphanumeric ────────────────────────
  test('2.8 — Invite code matches /^[A-Z0-9]{6}$/', async () => {
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    // Already verified in 2.3, but let's double-check against the DB
    const inviteCode = await getGangInviteCode(gangA.id)
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/)
  })

  // ─── afterAll: Enroll all gangs in league season ────────────────────
  test.afterAll(async () => {
    const state = getSharedState()
    const ls = state.leagueSeason

    if (!ls) {
      console.warn('No league/season in shared state — skipping gang enrollment')
      return
    }

    const gangIds = [
      state.gangs.gangA?.id,
      state.gangs.gangB?.id,
      state.gangs.gangC?.id,
    ].filter(Boolean) as string[]

    for (const gangId of gangIds) {
      await enrollGangInLeagueSeason(gangId, ls.leagueId, ls.seasonId)
    }

    console.warn(`  Enrolled ${gangIds.length} gangs in league season`)
  })
})
