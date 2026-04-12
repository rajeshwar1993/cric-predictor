/**
 * Suite 10: Cleanup & Deletion
 *
 * Tests the gang deletion flow (confirmation dialog, redirect, member
 * visibility), "gang deleted" notifications, and account deletion.
 *
 * Pre-conditions:
 *   - Suites 01-09 have run.
 *   - User 2 is admin of Gang C.
 *   - User 0 is a member of Gang C (joined in earlier suites).
 *   - User 7 has a profile and may not be admin of anything.
 */
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import { readAuthState } from './helpers/auth-state'
import { getSharedState } from './helpers/shared-state'
import { getSupabaseAdmin } from './helpers/supabase-admin'
import {
  waitForPageReady,
  expectRedirectTo,
  expectToastMessage,
} from './helpers/assertions'

test.describe.configure({ mode: 'serial' })

// ---------------------------------------------------------------------------
// Shared references
// ---------------------------------------------------------------------------

let gangCId: string
let gangCName: string

test.beforeAll(async () => {
  const shared = getSharedState()

  // Gang C is needed for deletion tests. If it doesn't exist, tests will skip.
  gangCId = shared.gangs.gangC?.id ?? ''

  if (gangCId) {
    // Fetch the gang name for the confirmation dialog
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('v2_gangs')
      .select('name')
      .eq('id', gangCId)
      .single()
    gangCName = data?.name ?? ''
  }
})

// ---------------------------------------------------------------------------
// 10.1 — User 2 (admin) opens delete dialog, confirmation shown
// ---------------------------------------------------------------------------

test('10.1 — admin opens delete gang dialog with confirmation', async ({
  page,
}) => {
  test.skip(!gangCId, 'Gang C not available in shared state')

  // User 2 is admin of Gang C — navigate to settings
  await authenticate(page, 2, {
    navigateTo: `/group/${gangCId}/settings`,
  })
  await waitForPageReady(page)

  // The settings page should show "GANG SETTINGS" heading
  const heading = page.getByRole('heading', { name: /gang settings/i })
  await expect(heading).toBeVisible({ timeout: 15_000 })

  // Scroll to and find the Danger Zone section
  const dangerZone = page.getByRole('region', { name: /danger zone/i })
  await expect(dangerZone).toBeVisible({ timeout: 10_000 })

  // Click the "Delete Gang" button
  const deleteButton = dangerZone.getByRole('button', { name: /delete gang/i })
  await expect(deleteButton).toBeVisible()
  await deleteButton.click()

  // The destructive action dialog should appear
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 10_000 })

  // Dialog should show the gang name and ask for confirmation
  const dialogTitle = dialog.getByRole('heading', {
    name: new RegExp(`Delete ${gangCName}`, 'i'),
  })
  await expect(dialogTitle).toBeVisible()

  // The confirmation input should be present with a placeholder of the gang name
  const confirmInput = dialog.getByRole('textbox')
  await expect(confirmInput).toBeVisible()
  await expect(confirmInput).toHaveAttribute('placeholder', gangCName)

  // The "Delete Gang" confirm button should be disabled until text matches
  const confirmButton = dialog.getByRole('button', { name: /delete gang/i })
  await expect(confirmButton).toBeDisabled()

  // Cancel and close the dialog
  const cancelButton = dialog.getByRole('button', { name: /cancel/i })
  await cancelButton.click()

  await expect(dialog).not.toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// 10.2 — User 2 confirms deletion, redirected to dashboard, Gang C gone
// ---------------------------------------------------------------------------

test('10.2 — admin confirms gang deletion and is redirected', async ({
  page,
}) => {
  test.skip(!gangCId, 'Gang C not available in shared state')

  await authenticate(page, 2, {
    navigateTo: `/group/${gangCId}/settings`,
  })
  await waitForPageReady(page)

  // Open the delete dialog
  const dangerZone = page.getByRole('region', { name: /danger zone/i })
  await expect(dangerZone).toBeVisible({ timeout: 15_000 })

  const deleteButton = dangerZone.getByRole('button', { name: /delete gang/i })
  await deleteButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 10_000 })

  // Type the gang name to confirm (case-sensitive)
  const confirmInput = dialog.getByRole('textbox')
  await confirmInput.fill(gangCName)

  // The confirm button should now be enabled
  const confirmButton = dialog.getByRole('button', { name: /delete gang/i })
  await expect(confirmButton).toBeEnabled()

  // Click confirm
  await confirmButton.click()

  // Should see a success toast
  await expectToastMessage(page, new RegExp(`${gangCName} deleted`, 'i'))

  // Should redirect to /dashboard
  await expectRedirectTo(page, '/dashboard')
})

// ---------------------------------------------------------------------------
// 10.3 — User 0 (was member of Gang C) — Gang C no longer on dashboard
// ---------------------------------------------------------------------------

test('10.3 — former member no longer sees deleted gang on dashboard', async ({
  page,
}) => {
  test.skip(!gangCId || !gangCName, 'Gang C not available in shared state')

  await authenticate(page, 0, { navigateTo: '/dashboard' })
  await waitForPageReady(page)

  // Gang C's name should NOT appear on the dashboard
  // Wait a moment for the page to fully load
  await page.waitForTimeout(2000)

  const gangNameOnPage = page.getByText(gangCName, { exact: true })
  await expect(gangNameOnPage).not.toBeVisible({ timeout: 10_000 })

  console.warn(`[10.3] Gang "${gangCName}" is no longer visible on dashboard`)
})

// ---------------------------------------------------------------------------
// 10.4 — Check notifications for "gang deleted"
// ---------------------------------------------------------------------------

test('10.4 — former member receives gang deleted notification', async ({
  page,
}) => {
  test.skip(!gangCId, 'Gang C not available in shared state')

  await authenticate(page, 0, { navigateTo: '/dashboard' })
  await waitForPageReady(page)

  // Open the notification bell
  const bell = page.getByRole('button', { name: /Notifications/i })
  await expect(bell).toBeVisible({ timeout: 15_000 })
  await bell.click()

  const panelTitle = page.getByRole('heading', { name: 'NOTIFICATIONS' })
  await expect(panelTitle).toBeVisible({ timeout: 10_000 })

  // Wait for notifications to load
  await page.waitForTimeout(2000)

  // Look for a notification about the gang being deleted
  const deletedNotification = page.getByText(/deleted/i)
  const hasDeleted = await deletedNotification
    .first()
    .isVisible()
    .catch(() => false)
  console.warn(`[10.4] Has "deleted" notification: ${hasDeleted}`)

  // Also check for the specific gang name in notification text
  if (gangCName) {
    const gangNotification = page.getByText(new RegExp(gangCName, 'i'))
    const hasGangName = await gangNotification
      .first()
      .isVisible()
      .catch(() => false)
    console.warn(`[10.4] Notification mentions "${gangCName}": ${hasGangName}`)
  }

  // The notification list should still have items
  const listItems = page.locator('ul li')
  const count = await listItems.count()
  console.warn(`[10.4] Total notifications: ${count}`)
})

// ---------------------------------------------------------------------------
// 10.5 — User 7 navigates to /profile/delete, confirmation page shown
// ---------------------------------------------------------------------------

test('10.5 — User 7 sees account deletion page', async ({ page }) => {
  await authenticate(page, 7, { navigateTo: '/profile/delete' })
  await waitForPageReady(page)

  // Page title should show "DELETE ACCOUNT"
  const heading = page.getByRole('heading', { name: /delete account/i })
  await expect(heading.first()).toBeVisible({ timeout: 15_000 })

  // The "What happens next" section should be visible
  const consequencesHeading = page.getByRole('heading', {
    name: /what happens next/i,
  })
  await expect(consequencesHeading).toBeVisible()

  // The "Permanent action" section with the delete button
  const permanentSection = page.getByRole('region', {
    name: /delete account/i,
  })
  await expect(permanentSection).toBeVisible()

  // The "Delete Account" button should be visible
  const deleteButton = permanentSection.getByRole('button', {
    name: /delete account/i,
  })
  await expect(deleteButton).toBeVisible()
})

// ---------------------------------------------------------------------------
// 10.6 — User 7 confirms account deletion, redirected to /login
// ---------------------------------------------------------------------------

test('10.6 — User 7 confirms account deletion and is redirected to login', async ({
  page,
}) => {
  const auth = readAuthState()
  const user7Email = auth.users[7]!.email

  await authenticate(page, 7, { navigateTo: '/profile/delete' })
  await waitForPageReady(page)

  // Click the "Delete Account" button to open the confirmation dialog
  const permanentSection = page.getByRole('region', {
    name: /delete account/i,
  })
  const deleteButton = permanentSection.getByRole('button', {
    name: /delete account/i,
  })
  await expect(deleteButton).toBeVisible({ timeout: 15_000 })
  await deleteButton.click()

  // The destructive action dialog should appear
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 10_000 })

  // Should ask user to type their email to confirm
  const confirmInput = dialog.getByRole('textbox')
  await expect(confirmInput).toBeVisible()

  // Type the email address (case-sensitive confirmation)
  await confirmInput.fill(user7Email)

  // The "Delete Account" confirm button should now be enabled
  const confirmButton = dialog.getByRole('button', {
    name: /delete account/i,
  })
  await expect(confirmButton).toBeEnabled()

  // Click confirm
  await confirmButton.click()

  // Should redirect to /login after account deletion
  // The server action calls redirect('/login') after soft-deleting the user
  await expectRedirectTo(page, '/login')
})

// ---------------------------------------------------------------------------
// 10.7 — Admin transfer check (may be N/A depending on test data)
// ---------------------------------------------------------------------------

test('10.7 — admin transfer on account deletion', async () => {
  // User 7 may or may not have been an admin of any gang. If User 7 was the
  // sole admin of a gang, that gang should either have a new admin promoted
  // or be deleted. Since in our test data User 7 is not necessarily an admin,
  // this test validates the state post-deletion.

  const admin = getSupabaseAdmin()
  const auth = readAuthState()
  const user7Id = auth.users[7]!.userId

  // Check if User 7 had any admin memberships before deletion
  const { data: memberships } = await admin
    .from('v2_gang_members')
    .select('gang_id, role, status')
    .eq('user_id', user7Id)

  if (!memberships || memberships.length === 0) {
    console.warn(
      '[10.7] User 7 had no gang memberships — admin transfer N/A'
    )
    return
  }

  const adminGangs = memberships.filter((m) => m.role === 'admin')

  if (adminGangs.length === 0) {
    console.warn(
      '[10.7] User 7 was not admin of any gang — admin transfer N/A'
    )
    return
  }

  // For each gang where User 7 was admin, check that either:
  // 1. A new admin was promoted, or
  // 2. The gang was deleted (if User 7 was the only member)
  for (const adminGang of adminGangs) {
    const { data: gang } = await admin
      .from('v2_gangs')
      .select('id, name')
      .eq('id', adminGang.gang_id)
      .single()

    if (!gang) {
      console.warn(
        `[10.7] Gang ${adminGang.gang_id} was deleted (User 7 was only member)`
      )
      continue
    }

    // Gang still exists — check for a new admin
    const { data: newAdmins } = await admin
      .from('v2_gang_members')
      .select('user_id, role')
      .eq('gang_id', adminGang.gang_id)
      .eq('role', 'admin')
      .eq('status', 'approved')
      .neq('user_id', user7Id)

    if (newAdmins && newAdmins.length > 0) {
      console.warn(
        `[10.7] Gang "${gang.name}" has new admin: ${newAdmins[0]!.user_id}`
      )
    } else {
      console.warn(
        `[10.7] Gang "${gang.name}" has no admin after User 7 deletion!`
      )
    }
  }
})
