/**
 * Suite 03: Gang Join & Invite Codes
 *
 * Tests the full invite -> join -> approval flow across multiple
 * users and gangs. Exercises manual approval, auto-accept, invalid
 * codes, already-a-member, and clipboard copy.
 *
 * Depends on Suite 02 having created gangs A, B, C.
 */
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import { readAuthState } from './helpers/auth-state'
import { getSharedState } from './helpers/shared-state'
import {
  expectToastMessage,
  waitForPageReady,
} from './helpers/assertions'

test.describe.configure({ mode: 'serial' })

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Join a gang via invite code URL.
 * Opens `/join/<code>`, confirms the gang name, and clicks the Join button.
 */
async function joinViaInviteCode(
  browser: import('@playwright/test').Browser,
  userIndex: number,
  inviteCode: string,
  gangName: string,
): Promise<void> {
  const context = await browser.newContext()
  const page = await context.newPage()

  await authenticate(page, userIndex, {
    navigateTo: `/join/${inviteCode}`,
  })
  await waitForPageReady(page)

  // Verify gang name is shown on the join page
  await expect(page.getByText(gangName)).toBeVisible({ timeout: 10_000 })

  // Click Join Gang button
  await page.getByRole('button', { name: 'Join Gang' }).click()

  // Wait for result — either "Request sent!" toast or "You're in!" toast
  const toast = page.locator('[data-sonner-toast]')
  await expect(toast.first()).toBeVisible({ timeout: 10_000 })

  await context.close()
}

/**
 * As an admin, approve a specific user's pending join request.
 */
async function approveJoinRequest(
  browser: import('@playwright/test').Browser,
  adminIndex: number,
  gangId: string,
  memberDisplayName: string,
): Promise<void> {
  const context = await browser.newContext()
  const page = await context.newPage()

  await authenticate(page, adminIndex, {
    navigateTo: `/group/${gangId}`,
  })
  await waitForPageReady(page)

  // Find the pending requests section
  const pendingSection = page.getByLabel('Pending join requests')
  await expect(pendingSection).toBeVisible({ timeout: 10_000 })

  // Click approve for the specific user
  const approveButton = page.getByRole('button', {
    name: `Approve ${memberDisplayName}`,
  })
  await approveButton.click()

  // Wait for success toast
  await expectToastMessage(page, `${memberDisplayName} has been approved!`)

  await context.close()
}

// ─── Tests ───────────────────────────────────────────────────────────────

test.describe('Suite 03: Gang Join & Invite Codes', () => {
  // ─── 3.1 Join via invite code — Gang A join page loads ─────────────
  test('3.1 — User 1 sees join page for Gang A with correct gang name', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 1, {
      navigateTo: `/join/${gangA.inviteCode}`,
    })
    await waitForPageReady(page)

    // Gang name visible on join page
    await expect(page.getByText('E2E Alpha Squad')).toBeVisible()

    // Join button visible
    await expect(
      page.getByRole('button', { name: 'Join Gang' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 3.2 Submit join request (manual approval) ─────────────────────
  test('3.2 — User 1 submits join request for Gang A — sees pending state', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 1, {
      navigateTo: `/join/${gangA.inviteCode}`,
    })
    await waitForPageReady(page)

    await page.getByRole('button', { name: 'Join Gang' }).click()

    // Should see "Request sent!" toast (auto_accept is false by default)
    await expectToastMessage(page, 'Request sent!')

    // Should see pending state
    await expect(page.getByText('Request sent')).toBeVisible()
    await expect(
      page.getByText('Waiting for admin approval'),
    ).toBeVisible()

    await context.close()
  })

  // ─── 3.3 Admin sees pending request ────────────────────────────────
  test('3.3 — User 0 (admin) sees User 1 pending request on Gang A', async ({
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

    // Pending requests section should be visible
    const pendingSection = page.getByLabel('Pending join requests')
    await expect(pendingSection).toBeVisible({ timeout: 10_000 })

    // User 1's name should appear
    await expect(pendingSection.getByText('TestUser Bravo')).toBeVisible()

    // Approve and Reject buttons should be visible
    await expect(
      page.getByRole('button', { name: 'Approve TestUser Bravo' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Reject TestUser Bravo' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 3.4 Admin approves join request ───────────────────────────────
  test('3.4 — User 0 approves User 1 — member count becomes 2', async ({
    browser,
  }) => {
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await approveJoinRequest(browser, 0, gangA.id, 'TestUser Bravo')

    // Verify member count updated by navigating to gang page again
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}`,
    })
    await waitForPageReady(page)

    await expect(page.getByText(/2\/20 members/)).toBeVisible({
      timeout: 10_000,
    })

    await context.close()
  })

  // ─── 3.5 Approved member sees gang on dashboard ────────────────────
  test('3.5 — User 1 sees Gang A on dashboard after approval', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 1, { navigateTo: '/dashboard' })
    await waitForPageReady(page)

    // Gang A card visible
    await expect(
      page.getByRole('link', { name: 'View E2E Alpha Squad gang' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 3.6 Join Gang A — Users 2, 3, 4, 5 ───────────────────────────
  test('3.6 — Users 2–5 join Gang A, User 0 approves each', async ({
    browser,
  }) => {
    const authState = readAuthState()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    for (const userIndex of [2, 3, 4, 5]) {
      const displayName = authState.users[userIndex]!.displayName

      // User joins
      await joinViaInviteCode(
        browser,
        userIndex,
        gangA.inviteCode,
        'E2E Alpha Squad',
      )

      // Admin approves
      await approveJoinRequest(browser, 0, gangA.id, displayName)
    }

    // Verify final member count is 6 (User 0 + Users 1-5)
    const context = await browser.newContext()
    const page = await context.newPage()
    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}`,
    })
    await waitForPageReady(page)
    await expect(page.getByText(/6\/20 members/)).toBeVisible({
      timeout: 10_000,
    })
    await context.close()
  })

  // ─── 3.7 Join via direct URL — Gang B ──────────────────────────────
  test('3.7 — User 3 navigates to /join/<Gang-B-code> — join page loads', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangB = state.gangs.gangB!

    await authenticate(page, 3, {
      navigateTo: `/join/${gangB.inviteCode}`,
    })
    await waitForPageReady(page)

    await expect(page.getByText('E2E Bravo Bunch')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Join Gang' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 3.8 Join Gang B — Users 0, 3, 4 ──────────────────────────────
  test('3.8 — Users 0, 3, 4 join Gang B, User 1 approves', async ({
    browser,
  }) => {
    const authState = readAuthState()
    const state = getSharedState()
    const gangB = state.gangs.gangB!

    for (const userIndex of [0, 3, 4]) {
      const displayName = authState.users[userIndex]!.displayName

      await joinViaInviteCode(
        browser,
        userIndex,
        gangB.inviteCode,
        'E2E Bravo Bunch',
      )

      await approveJoinRequest(browser, 1, gangB.id, displayName)
    }

    // Verify member count is 4 (User 1 + Users 0, 3, 4)
    const context = await browser.newContext()
    const page = await context.newPage()
    await authenticate(page, 1, {
      navigateTo: `/group/${gangB.id}`,
    })
    await waitForPageReady(page)
    await expect(page.getByText(/4\/20 members/)).toBeVisible({
      timeout: 10_000,
    })
    await context.close()
  })

  // ─── 3.9 Join Gang C — Users 0, 1 ─────────────────────────────────
  test('3.9 — Users 0, 1 join Gang C, User 2 approves', async ({
    browser,
  }) => {
    const authState = readAuthState()
    const state = getSharedState()
    const gangC = state.gangs.gangC!

    for (const userIndex of [0, 1]) {
      const displayName = authState.users[userIndex]!.displayName

      await joinViaInviteCode(
        browser,
        userIndex,
        gangC.inviteCode,
        'E2E Charlie Crew',
      )

      await approveJoinRequest(browser, 2, gangC.id, displayName)
    }

    // Verify member count is 3 (User 2 + Users 0, 1)
    const context = await browser.newContext()
    const page = await context.newPage()
    await authenticate(page, 2, {
      navigateTo: `/group/${gangC.id}`,
    })
    await waitForPageReady(page)
    await expect(page.getByText(/3\/20 members/)).toBeVisible({
      timeout: 10_000,
    })
    await context.close()
  })

  // ─── 3.10 Invalid invite code ──────────────────────────────────────
  test('3.10 — Invalid invite code ZZZZZZ shows error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 6, {
      navigateTo: '/join/ZZZZZZ',
    })
    await waitForPageReady(page)

    // The page should show an error state — either a 404 or "not found" message
    // The join page renders JoinPageUnauth or JoinPageAuth depending on auth.
    // For a non-existent code, the server resolves gang=null and shows an error.
    const errorVisible = await page
      .getByText(/not found|does not exist|invalid/i)
      .isVisible()
      .catch(() => false)

    // If no explicit error text, check if the page shows a 404
    const is404 = await page
      .getByText(/404|not found/i)
      .isVisible()
      .catch(() => false)

    expect(errorVisible || is404).toBeTruthy()

    await context.close()
  })

  // ─── 3.11 Already a member tries to join again ─────────────────────
  test('3.11 — User 1 (already in Gang A) navigating to join link shows already-member state', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    await authenticate(page, 1, {
      navigateTo: `/join/${gangA.inviteCode}`,
    })
    await waitForPageReady(page)

    // JoinPageAuth with existing approved membership should either:
    // - Show "You're already a member" message / redirect to gang page
    // - Or clicking Join shows the "already a member" toast and redirects
    // The server page detects existing membership and may show a different state.
    // Check for either a redirect to the gang page or a member-already state.

    // Wait a moment for any redirect to complete
    await page.waitForTimeout(2_000)

    // Check if redirected to gang page or shows already-member indicator
    const isOnGangPage = page.url().includes(`/group/${gangA.id}`)
    const hasAlreadyMemberText = await page
      .getByText(/already a member|already in/i)
      .isVisible()
      .catch(() => false)

    // If still on join page, click the button and check the response
    if (!isOnGangPage && !hasAlreadyMemberText) {
      // The page may show the join form for a "left" user to rejoin,
      // or may have a "Join Gang" button that triggers already_a_member error
      const joinButton = page.getByRole('button', { name: 'Join Gang' })
      if (await joinButton.isVisible()) {
        await joinButton.click()
        // Should get toast saying already a member and redirect
        await expectToastMessage(page, /already a member/i)
      }
    }

    // Should end up on the gang page or showing already-member state
    expect(
      isOnGangPage ||
        hasAlreadyMemberText ||
        page.url().includes(`/group/${gangA.id}`),
    ).toBeTruthy()

    await context.close()
  })

  // ─── 3.12 Auto-accept mode ─────────────────────────────────────────
  test('3.12 — Admin enables auto-accept, new user joins immediately', async ({
    browser,
  }) => {
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    // Step 1: Admin (User 0) enables auto-accept on Gang A
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()

    await authenticate(adminPage, 0, {
      navigateTo: `/group/${gangA.id}/settings`,
    })
    await waitForPageReady(adminPage)

    // Find the auto-accept switch and enable it
    const autoAcceptSwitch = adminPage.getByRole('switch', {
      name: 'Auto-accept join requests',
    })
    await expect(autoAcceptSwitch).toBeVisible()

    // If not already on, turn it on
    const isChecked = await autoAcceptSwitch.getAttribute('aria-checked')
    if (isChecked !== 'true') {
      await autoAcceptSwitch.click()
      await expectToastMessage(adminPage, 'Auto-accept enabled')
    }

    await adminContext.close()

    // Step 2: User 6 joins Gang A — should be auto-approved
    const joinerContext = await browser.newContext()
    const joinerPage = await joinerContext.newPage()

    await authenticate(joinerPage, 6, {
      navigateTo: `/join/${gangA.inviteCode}`,
    })
    await waitForPageReady(joinerPage)

    await expect(joinerPage.getByText('E2E Alpha Squad')).toBeVisible()
    await joinerPage.getByRole('button', { name: 'Join Gang' }).click()

    // Should get "You're in!" toast (auto-approved, not pending)
    await expectToastMessage(joinerPage, "You're in!")

    // Should see the "You're in!" success state with link to gang
    await expect(joinerPage.getByText("You're in!")).toBeVisible()

    await joinerContext.close()
  })

  // ─── 3.13 Copy invite to clipboard ─────────────────────────────────
  test('3.13 — Copy invite link button copies to clipboard', async ({
    browser,
  }) => {
    const state = getSharedState()
    const gangA = state.gangs.gangA!

    // Grant clipboard permission
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    })
    const page = await context.newPage()

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}`,
    })
    await waitForPageReady(page)

    // Click "Copy invite link" button
    const copyButton = page.getByRole('button', {
      name: 'Copy invite link',
    })
    await expect(copyButton).toBeVisible()
    await copyButton.click()

    // Button text should change to "Copied!"
    await expect(
      page.getByRole('button', { name: 'Invite link copied' }),
    ).toBeVisible()

    // Verify clipboard content contains the invite URL
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    )
    expect(clipboardText).toContain('/join/')
    expect(clipboardText).toContain(gangA.inviteCode)

    await context.close()
  })
})
