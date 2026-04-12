/**
 * Suite 04: Gang Management
 *
 * Tests admin actions: settings updates, member removal, blocking,
 * unblocking, voluntary leave, and join request rejection.
 *
 * Depends on:
 * - Suite 02: Gang A created by User 0
 * - Suite 03: Users 1–6 are approved members of Gang A
 *
 * After this suite, Gang A state:
 * - User 0 (admin), User 1, User 2 remain active members
 * - User 3 left voluntarily (test 4.10)
 * - User 4 was blocked then unblocked (tests 4.7–4.9), then removed + unblocked
 * - User 5 was removed (test 4.5)
 * - User 6 auto-accepted in suite 03
 * - User 7's join request was rejected (test 4.11)
 * - Gang name was changed and restored (tests 4.2/4.12)
 */
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import { getSharedState } from './helpers/shared-state'
import {
  expectToastMessage,
  expectRedirectTo,
  waitForPageReady,
} from './helpers/assertions'

test.describe.configure({ mode: 'serial' })

test.describe('Suite 04: Gang Management', () => {
  // ─── 4.1 Non-admin cannot access settings ──────────────────────────
  test('4.1 — Non-admin User 1 navigating to settings is redirected', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 1, {
      navigateTo: `/group/${gangA.id}/settings`,
    })

    // Non-admin should be redirected away from settings
    // The settings page.tsx does: if (!isAdmin) redirect to gang page
    await page.waitForURL(`**/group/${gangA.id}`, { timeout: 15_000 })

    // Should NOT be on the settings page
    expect(page.url()).not.toContain('/settings')

    await context.close()
  })

  // ─── 4.2 Admin updates gang name ───────────────────────────────────
  test('4.2 — Admin (User 0) updates Gang A name to "E2E Alpha Squad Updated"', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    // Find the gang info section
    const gangInfoSection = page.getByLabel('Gang info')
    await expect(gangInfoSection).toBeVisible()

    // Find the name input inside the gang info section
    const nameInput = gangInfoSection.getByRole('textbox')
    await nameInput.clear()
    await nameInput.fill('E2E Alpha Squad Updated')

    // Click Save Name button
    const saveButton = page.getByRole('button', { name: 'Save Name' })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // Should see success toast
    await expectToastMessage(page, 'Gang name updated')

    // Navigate to gang page to verify
    await page.goto(`/group/${gangA.id}`)
    await waitForPageReady(page)

    await expect(
      page.getByRole('heading', { name: 'E2E Alpha Squad Updated' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 4.3 Admin updates prediction deadline ─────────────────────────
  test('4.3 — Admin updates prediction deadline from 45 to 30 minutes', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    // Find the prediction settings section
    const predSection = page.getByLabel('Prediction settings')
    await expect(predSection).toBeVisible()

    // Find the deadline input
    const deadlineInput = predSection.getByRole('spinbutton')
    await deadlineInput.clear()
    await deadlineInput.fill('30')

    // Click Save Deadline button
    const saveDeadlineBtn = page.getByRole('button', {
      name: 'Save Deadline',
    })
    await expect(saveDeadlineBtn).toBeEnabled()
    await saveDeadlineBtn.click()

    // Should see success toast
    await expectToastMessage(page, 'Prediction deadline updated')

    // The section should now show 30 in the prose
    await expect(predSection.getByText('30')).toBeVisible()

    await context.close()
  })

  // ─── 4.4 Admin toggles auto-accept off ─────────────────────────────
  test('4.4 — Admin toggles auto-accept off on Gang A', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    const autoAcceptSwitch = page.getByRole('switch', {
      name: 'Auto-accept join requests',
    })
    await expect(autoAcceptSwitch).toBeVisible()

    // It was enabled in suite 03 test 3.12, turn it off
    const isChecked = await autoAcceptSwitch.getAttribute('aria-checked')
    if (isChecked === 'true') {
      await autoAcceptSwitch.click()
      await expectToastMessage(page, 'Auto-accept disabled')
    }

    // Verify it's now off
    await expect(autoAcceptSwitch).toHaveAttribute('aria-checked', 'false')

    await context.close()
  })

  // ─── 4.5 Admin removes a member (User 5) ──────────────────────────
  test('4.5 — Admin removes User 5 (TestUser Foxtrot) from Gang A', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    // Find the member management section
    const memberSection = page.getByLabel('Member management')
    await expect(memberSection).toBeVisible()

    // Click the Remove button for TestUser Foxtrot
    const removeButton = page.getByRole('button', {
      name: 'Remove TestUser Foxtrot',
    })
    await removeButton.click()

    // A DestructiveActionDialog should appear asking to type the name
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Remove TestUser Foxtrot')).toBeVisible()

    // Type the confirm value (display name, case-insensitive)
    const confirmInput = dialog.getByPlaceholder('TestUser Foxtrot')
    await confirmInput.fill('TestUser Foxtrot')

    // Click the Remove Member button
    const confirmButton = dialog.getByRole('button', {
      name: 'Remove Member',
    })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    // Should see success toast
    await expectToastMessage(page, 'TestUser Foxtrot removed')

    await context.close()
  })

  // ─── 4.6 Removed member cannot see gang ────────────────────────────
  test('4.6 — User 5 (removed) no longer sees Gang A on dashboard', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 5, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    // Gang A should not be visible (either gone or the dashboard shows it differently)
    // Since the name was changed in 4.2:
    await expect(
      page.getByRole('link', { name: /View E2E Alpha Squad/i }),
    ).not.toBeVisible({ timeout: 5_000 })

    await context.close()
  })

  // ─── 4.7 Admin blocks a member (User 4) ───────────────────────────
  test('4.7 — Admin blocks User 4 (TestUser Echo) from Gang A', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    // Click Block button for TestUser Echo
    const blockButton = page.getByRole('button', {
      name: 'Block TestUser Echo',
    })
    await blockButton.click()

    // Should see success toast
    await expectToastMessage(page, 'TestUser Echo blocked')

    // The row should now show "Blocked" status
    await expect(page.getByText('Blocked')).toBeVisible()

    await context.close()
  })

  // ─── 4.8 Blocked user cannot rejoin ────────────────────────────────
  test('4.8 — User 4 (blocked) navigating to join link sees blocked message', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 4, {
      navigateTo: `/join/${gangA.inviteCode}`,
    })
    await waitForPageReady(page)

    // JoinPageAuth should detect the blocked membership and show "Access denied"
    await expect(page.getByText('Access denied')).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByText('You are not able to join this gang'),
    ).toBeVisible()

    await context.close()
  })

  // ─── 4.9 Admin unblocks a member (User 4) ─────────────────────────
  test('4.9 — Admin unblocks User 4 (TestUser Echo)', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    // Find the Unblock button for TestUser Echo
    const unblockButton = page.getByRole('button', {
      name: 'Unblock TestUser Echo',
    })
    await expect(unblockButton).toBeVisible()
    await unblockButton.click()

    // Should see success toast
    await expectToastMessage(page, 'TestUser Echo unblocked')

    await context.close()
  })

  // ─── 4.10 Member leaves gang voluntarily (User 3) ─────────────────
  test('4.10 — User 3 leaves Gang A voluntarily', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 3, {
      navigateTo: `/group/${gangA.id}`,
    })
    await waitForPageReady(page)

    // The "Leave Gang" button is on the gang page for non-admin members
    const leaveButton = page.getByRole('button', { name: 'Leave Gang' })
    await expect(leaveButton).toBeVisible()
    await leaveButton.click()

    // DestructiveActionDialog appears — need to type gang name to confirm
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Type the current gang name to confirm (was renamed in 4.2)
    const confirmInput = dialog.getByPlaceholder('E2E Alpha Squad Updated')
    await confirmInput.fill('E2E Alpha Squad Updated')

    // Click "Leave Gang" confirm button
    const confirmLeaveButton = dialog.getByRole('button', {
      name: 'Leave Gang',
    })
    await expect(confirmLeaveButton).toBeEnabled()
    await confirmLeaveButton.click()

    // Should see success toast and redirect to dashboard
    await expectToastMessage(page, /You have left/)
    await expectRedirectTo(page, '/dashboard')

    await context.close()
  })

  // ─── 4.11 Admin rejects a join request ─────────────────────────────
  test('4.11 — User 7 requests to join Gang A, User 0 rejects', async ({
    browser,
  }) => {
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    // Step 1: User 7 requests to join Gang A
    const joinerContext = await browser.newContext()
    const joinerPage = await joinerContext.newPage()

    await authenticate(joinerPage, 7, {
      navigateTo: `/join/${gangA.inviteCode}`,
    })
    await waitForPageReady(joinerPage)

    await joinerPage.getByRole('button', { name: 'Join Gang' }).click()
    await expectToastMessage(joinerPage, 'Request sent!')
    await joinerContext.close()

    // Step 2: Admin (User 0) rejects the request
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()

    await authenticate(adminPage, 0, {
      navigateTo: `/group/${gangA.id}`,
    })
    await waitForPageReady(adminPage)

    // Find pending requests section
    const pendingSection = adminPage.getByLabel('Pending join requests')
    await expect(pendingSection).toBeVisible({ timeout: 10_000 })

    // Click Reject for User 7
    const rejectButton = adminPage.getByRole('button', {
      name: 'Reject TestUser Hotel',
    })
    await rejectButton.click()

    // Should see success toast
    await expectToastMessage(adminPage, 'TestUser Hotel has been declined')

    await adminContext.close()
  })

  // ─── 4.12 Restore gang name ────────────────────────────────────────
  test('4.12 — Admin restores Gang A name to "E2E Alpha Squad"', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(page)

    // Find the gang info section and name input
    const gangInfoSection = page.getByLabel('Gang info')
    const nameInput = gangInfoSection.getByRole('textbox')
    await nameInput.clear()
    await nameInput.fill('E2E Alpha Squad')

    // Click Save Name
    const saveButton = page.getByRole('button', { name: 'Save Name' })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    await expectToastMessage(page, 'Gang name updated')

    // Verify on gang page
    await page.goto(`/group/${gangA.id}`)
    await waitForPageReady(page)

    await expect(
      page.getByRole('heading', { name: 'E2E Alpha Squad' }),
    ).toBeVisible()

    await context.close()
  })
})
