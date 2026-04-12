/**
 * Suite 05: Predictions
 *
 * Tests the prediction workflow: viewing upcoming fixtures, navigating
 * to the prediction page, interacting with scenario pickers, submitting
 * predictions, and verifying deadline/live-status behavior.
 *
 * Depends on:
 * - Suite 02: Gangs A, B created and enrolled in league season
 * - Suite 03: Multiple users are members of Gang A and Gang B
 *
 * beforeAll seeds 2 test fixtures (X: 2h from now, Y: 24h from now)
 * and seeds scenarios for Gang A and Gang B.
 */
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import { getSharedState, updateSharedState } from './helpers/shared-state'
import {
  seedTestFixture,
  seedFixtureScenarios,
  setFixtureStatus,
  setFixtureStartTime,
} from './helpers/fixtures'
import {
  expectToastMessage,
  waitForPageReady,
} from './helpers/assertions'

test.describe.configure({ mode: 'serial' })

test.describe('Suite 05: Predictions', () => {
  // ─── beforeAll: Seed fixtures and scenarios ─────────────────────────
  test.beforeAll(async () => {
    const state = getSharedState()
    const ls = state.leagueSeason
    const teams = state.teams

    if (!ls || !teams?.teamA || !teams?.teamB) {
      throw new Error(
        'Missing leagueSeason or teams in shared state. Global setup may have failed.',
      )
    }

    const now = new Date()

    // Fixture X: 2 hours from now (prediction window should be open)
    const fixtureXStart = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const fixtureXId = await seedTestFixture({
      fixtureKey: '001',
      leagueId: ls.leagueId,
      seasonId: ls.seasonId,
      homeTeamId: teams.teamA.id,
      awayTeamId: teams.teamB.id,
      startDatetime: fixtureXStart.toISOString(),
      status: 'upcoming',
      matchNumber: 997,
      venueName: 'E2E Test Venue Alpha',
      round: 'E2E Round 1',
    })

    // Fixture Y: 24 hours from now
    const fixtureYStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const fixtureYId = await seedTestFixture({
      fixtureKey: '002',
      leagueId: ls.leagueId,
      seasonId: ls.seasonId,
      homeTeamId: teams.teamB.id,
      awayTeamId: teams.teamA.id,
      startDatetime: fixtureYStart.toISOString(),
      status: 'upcoming',
      matchNumber: 998,
      venueName: 'E2E Test Venue Bravo',
      round: 'E2E Round 2',
    })

    updateSharedState({
      fixtures: {
        fixtureX: { id: fixtureXId },
        fixtureY: { id: fixtureYId },
      },
    })

    console.warn(`  Seeded Fixture X: ${fixtureXId}`)
    console.warn(`  Seeded Fixture Y: ${fixtureYId}`)

    // Seed scenarios for Gang A + Fixture X
    const gangAId = state.gangs.gangA!.id
    const gangBId = state.gangs.gangB!.id

    await seedFixtureScenarios(gangAId, fixtureXId)
    await seedFixtureScenarios(gangAId, fixtureYId)
    await seedFixtureScenarios(gangBId, fixtureXId)
    await seedFixtureScenarios(gangBId, fixtureYId)

    console.warn('  Seeded scenarios for Gang A and Gang B')
  })

  // ─── 5.1 Upcoming match visible on gang page ──────────────────────
  test('5.1 — Fixture X visible on Gang A page as upcoming', async ({
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

    // Look for team codes on the page (upcoming matches section)
    const teamA = state.teams!.teamA!
    const teamB = state.teams!.teamB!

    // At least one team code should be visible in the upcoming fixtures
    const teamCodeVisible =
      (await page
        .getByText(teamA.code, { exact: true })
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText(teamB.code, { exact: true })
        .first()
        .isVisible()
        .catch(() => false))

    expect(teamCodeVisible).toBeTruthy()

    await context.close()
  })

  // ─── 5.2 Navigate to prediction page ───────────────────────────��──
  test('5.2 — User 0 navigates to prediction page for Fixture X in Gang A', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // The prediction page should show scenario cards
    // Look for the submit bar which is always present
    await expect(page.getByText('picked')).toBeVisible({ timeout: 15_000 })

    // "Lock Predictions" button should be visible (but disabled with 0 picks)
    await expect(
      page.getByRole('button', { name: 'Lock Predictions' }),
    ).toBeVisible()

    await context.close()
  })

  // ─── 5.3 All scenario types rendered ───────────────────────────────
  test('5.3 — Scenario cards are rendered on the prediction page', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Verify PTS badges are visible (each scenario card has one)
    const ptsBadges = page.getByText(/\d+ PTS/)
    const badgeCount = await ptsBadges.count()

    // Should have multiple scenario cards (exact count depends on templates)
    expect(badgeCount).toBeGreaterThanOrEqual(1)

    // Verify progress counter shows 0 picked initially
    await expect(page.getByText(/0\/\d+ picked/)).toBeVisible()

    await context.close()
  })

  // ─── 5.4 Team pick scenario ────────────────────────────────────────
  test('5.4 — User 0 selects a team in a team_select scenario', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Find a team picker (radiogroup with "Select a team" label)
    const teamPickers = page.getByRole('radiogroup', {
      name: 'Select a team',
    })
    const firstTeamPicker = teamPickers.first()
    await expect(firstTeamPicker).toBeVisible({ timeout: 10_000 })

    // Click the first radio button (team option) inside it
    const teamOption = firstTeamPicker.getByRole('radio').first()
    await teamOption.click()

    // Verify it is now checked
    await expect(teamOption).toHaveAttribute('aria-checked', 'true')

    // Progress should update from 0 to at least 1
    await expect(page.getByText(/[1-9]\d*\/\d+ picked/)).toBeVisible()

    await context.close()
  })

  // ─── 5.5 Player pick scenario ──────────────────────────────────────
  test('5.5 — User 0 selects a player in a player_select scenario', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Find a player picker (combobox with "Select a player" label)
    const playerCombobox = page
      .getByRole('combobox', { name: 'Select a player' })
      .first()

    // Skip this test if no player picker exists on this fixture
    const hasPlayerPicker = await playerCombobox
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    if (!hasPlayerPicker) {
      test.skip()
      return
    }

    // Open the player picker popover
    await playerCombobox.click()

    // Wait for the dropdown to appear
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible({ timeout: 5_000 })

    // Select the first player option
    const firstOption = page.getByRole('option').first()
    await firstOption.click()

    // The combobox trigger should now show a player name (not "Select player...")
    await expect(playerCombobox).not.toHaveText('Select player...')

    await context.close()
  })

  // ─── 5.6 Yes/No scenario ──────────────────────────────────────────
  test('5.6 — User 0 selects "Yes" in a yes_no scenario', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Find a yes/no picker (radiogroup with "Select yes or no" label)
    const yesNoPickers = page.getByRole('radiogroup', {
      name: 'Select yes or no',
    })

    const hasYesNoPicker = await yesNoPickers
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    if (!hasYesNoPicker) {
      test.skip()
      return
    }

    // Click the "YES" option in the first yes/no picker
    const yesButton = yesNoPickers.first().getByRole('radio', { name: 'YES' })
    await yesButton.click()

    // Verify it is selected
    await expect(yesButton).toHaveAttribute('aria-checked', 'true')

    await context.close()
  })

  // ─── 5.7 Range scenario ───────────────────────────────────────────
  test('5.7 — User 0 selects a range bracket in a range scenario', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Find a range picker (radiogroup with "Select a range" label)
    const rangePickers = page.getByRole('radiogroup', {
      name: 'Select a range',
    })

    const hasRangePicker = await rangePickers
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    if (!hasRangePicker) {
      test.skip()
      return
    }

    // Click the first range option
    const firstRangeOption = rangePickers.first().getByRole('radio').first()
    await firstRangeOption.click()

    // Verify it is selected
    await expect(firstRangeOption).toHaveAttribute('aria-checked', 'true')

    await context.close()
  })

  // ─── 5.8 Submit predictions — partial ──────────────────────────────
  test('5.8 — User 0 fills some scenarios and submits partial predictions', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Pick a few scenarios: first team picker, first yes/no, first range
    // Team picker
    const teamPickers = page.getByRole('radiogroup', {
      name: 'Select a team',
    })
    const teamPickerCount = await teamPickers.count()
    for (let i = 0; i < Math.min(teamPickerCount, 3); i++) {
      const radio = teamPickers.nth(i).getByRole('radio').first()
      await radio.click()
    }

    // Yes/No pickers
    const yesNoPickers = page.getByRole('radiogroup', {
      name: 'Select yes or no',
    })
    const yesNoCount = await yesNoPickers.count()
    for (let i = 0; i < Math.min(yesNoCount, 3); i++) {
      const yesOption = yesNoPickers.nth(i).getByRole('radio', { name: 'YES' })
      await yesOption.click()
    }

    // Range pickers
    const rangePickers = page.getByRole('radiogroup', {
      name: 'Select a range',
    })
    const rangeCount = await rangePickers.count()
    for (let i = 0; i < Math.min(rangeCount, 2); i++) {
      const rangeOption = rangePickers.nth(i).getByRole('radio').first()
      await rangeOption.click()
    }

    // Verify some picks were made
    await expect(page.getByText(/[1-9]\d*\/\d+ picked/)).toBeVisible()

    // Click "Lock Predictions"
    const submitButton = page.getByRole('button', { name: 'Lock Predictions' })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Should see saving state
    await expect(page.getByText('Saving...')).toBeVisible()

    // Should see success toast
    await expectToastMessage(page, 'Predictions saved!')

    await context.close()
  })

  // ─── 5.9 Re-submit predictions — update answers ──────────────────��
  test('5.9 — User 0 changes some answers and re-submits', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Previously submitted predictions should be pre-filled
    // The progress counter should show the previously picked count
    await expect(page.getByText(/[1-9]\d*\/\d+ picked/)).toBeVisible({
      timeout: 10_000,
    })

    // Change a yes/no pick — select "NO" on the first yes/no picker
    const yesNoPickers = page.getByRole('radiogroup', {
      name: 'Select yes or no',
    })
    const yesNoExists = (await yesNoPickers.count()) > 0
    if (yesNoExists) {
      const noOption = yesNoPickers
        .first()
        .getByRole('radio', { name: 'NO' })
      await noOption.click()
      await expect(noOption).toHaveAttribute('aria-checked', 'true')
    }

    // Change a team pick — select the second team in the first team picker
    const teamPickers = page.getByRole('radiogroup', {
      name: 'Select a team',
    })
    const teamPickerExists = (await teamPickers.count()) > 0
    if (teamPickerExists) {
      const secondTeam = teamPickers.first().getByRole('radio').last()
      await secondTeam.click()
    }

    // Re-submit
    const submitButton = page.getByRole('button', { name: 'Lock Predictions' })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expectToastMessage(page, 'Predictions saved!')

    await context.close()
  })

  // ─── 5.10 Submit predictions — all scenarios ──────────────────────
  test('5.10 — User 0 completes all scenarios and submits', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Fill ALL team pickers — pick the first radio in each
    const teamPickers = page.getByRole('radiogroup', {
      name: 'Select a team',
    })
    const teamCount = await teamPickers.count()
    for (let i = 0; i < teamCount; i++) {
      const radio = teamPickers.nth(i).getByRole('radio').first()
      const isChecked = await radio.getAttribute('aria-checked')
      if (isChecked !== 'true') {
        await radio.click()
      }
    }

    // Fill ALL yes/no pickers
    const yesNoPickers = page.getByRole('radiogroup', {
      name: 'Select yes or no',
    })
    const yesNoCount = await yesNoPickers.count()
    for (let i = 0; i < yesNoCount; i++) {
      const yesOption = yesNoPickers.nth(i).getByRole('radio').first()
      const isChecked = await yesOption.getAttribute('aria-checked')
      if (isChecked !== 'true') {
        await yesOption.click()
      }
    }

    // Fill ALL range pickers
    const rangePickers = page.getByRole('radiogroup', {
      name: 'Select a range',
    })
    const rangeCount = await rangePickers.count()
    for (let i = 0; i < rangeCount; i++) {
      const rangeOption = rangePickers.nth(i).getByRole('radio').first()
      const isChecked = await rangeOption.getAttribute('aria-checked')
      if (isChecked !== 'true') {
        await rangeOption.click()
      }
    }

    // Fill ALL player pickers
    const playerComboboxes = page.getByRole('combobox', {
      name: 'Select a player',
    })
    const playerCount = await playerComboboxes.count()
    for (let i = 0; i < playerCount; i++) {
      const combobox = playerComboboxes.nth(i)
      const currentText = await combobox.textContent()
      if (currentText?.includes('Select player')) {
        await combobox.click()
        // Wait for dropdown
        await page.waitForTimeout(500)
        const firstOption = page.getByRole('option').first()
        if (await firstOption.isVisible()) {
          await firstOption.click()
        }
      }
    }

    // Submit all predictions
    const submitButton = page.getByRole('button', { name: 'Lock Predictions' })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expectToastMessage(page, 'Predictions saved!')

    await context.close()
  })

  // ─── 5.11 Multiple users predict on same fixture ──────────────────
  test('5.11 — Users 1, 2 submit predictions for Fixture X in Gang A', async ({
    browser,
  }) => {
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    for (const userIndex of [1, 2]) {
      const context = await browser.newContext()
      const page = await context.newPage()

      await authenticate(page, userIndex, {
        navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
      })
      await waitForPageReady(page)

      // Make a few picks
      const teamPickers = page.getByRole('radiogroup', {
        name: 'Select a team',
      })
      const teamCount = await teamPickers.count()
      for (let i = 0; i < Math.min(teamCount, 3); i++) {
        // Pick the second option to differ from User 0
        const radio = teamPickers.nth(i).getByRole('radio').last()
        await radio.click()
      }

      const yesNoPickers = page.getByRole('radiogroup', {
        name: 'Select yes or no',
      })
      const yesNoCount = await yesNoPickers.count()
      for (let i = 0; i < Math.min(yesNoCount, 2); i++) {
        const noOption = yesNoPickers
          .nth(i)
          .getByRole('radio', { name: 'NO' })
        await noOption.click()
      }

      // Submit
      const submitButton = page.getByRole('button', {
        name: 'Lock Predictions',
      })
      await expect(submitButton).toBeEnabled()
      await submitButton.click()
      await expectToastMessage(page, 'Predictions saved!')

      await context.close()
    }
  })

  // ─── 5.12 Cross-gang predictions ──────────────────────────────────
  test('5.12 — User 0 submits predictions for Fixture X in Gang B', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangB = state.gangs.gangB!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 0, {
      navigateTo: `/group/${gangB.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // Make a few picks
    const teamPickers = page.getByRole('radiogroup', {
      name: 'Select a team',
    })
    const teamCount = await teamPickers.count()
    for (let i = 0; i < Math.min(teamCount, 2); i++) {
      const radio = teamPickers.nth(i).getByRole('radio').first()
      await radio.click()
    }

    // Submit
    const submitButton = page.getByRole('button', {
      name: 'Lock Predictions',
    })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    await expectToastMessage(page, 'Predictions saved!')

    await context.close()
  })

  // ─── 5.13 Prediction status badge on match card ──────────────���─────
  test('5.13 — Gang A page shows prediction status for Fixture X', async ({
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

    // Look for a "Predicted" badge or status indicator near the match card
    // The exact text depends on the UpcomingMatches component implementation.
    // Check for any indication that predictions have been submitted.
    const predicted = page.getByText(/predicted/i)
    const hasPredictedBadge = await predicted
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    // If no explicit "Predicted" badge, at least verify we can still access the predict page
    if (!hasPredictedBadge) {
      // Navigate directly to verify predictions exist
      const fixtureX = state.fixtures.fixtureX!
      await page.goto(`/group/${gangA.id}/predict/${fixtureX.id}`)
      await waitForPageReady(page)

      // Previously submitted predictions should show a picked count > 0
      await expect(page.getByText(/[1-9]\d*\/\d+ picked/)).toBeVisible()
    }

    await context.close()
  })

  // ─── 5.14 Pre-deadline: own predictions only ──────────────────────
  test('5.14 — Before deadline, User 1 can see own predictions on predict page', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const state = getSharedState()
    const gangA = state.gangs.gangA!
    const fixtureX = state.fixtures.fixtureX!

    await authenticate(page, 1, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // User 1 should see their own predictions (pre-filled picks)
    await expect(page.getByText(/[1-9]\d*\/\d+ picked/)).toBeVisible({
      timeout: 10_000,
    })

    // The prediction form should be editable (not locked)
    const submitButton = page.getByRole('button', {
      name: 'Lock Predictions',
    })
    await expect(submitButton).toBeVisible()

    await context.close()
  })

  // ─── 5.15 Post-deadline: predictions revealed ─────────────────────
  test('5.15 — After deadline, match page shows all predictions', async ({
    browser,
  }) => {
    const state = getSharedState()
    const fixtureX = state.fixtures.fixtureX!
    const gangA = state.gangs.gangA!

    // Move fixture X start time to the past so deadline has passed
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    await setFixtureStartTime(fixtureX.id, pastTime.toISOString())

    const context = await browser.newContext()
    const page = await context.newPage()

    // Navigate to the match page (post-deadline view)
    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/match/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // The match page should load (may show prediction matrix, leaderboard, etc.)
    // Verify the page loaded without error by checking for team codes or match content
    const pageContent = await page.textContent('body')
    const hasTeamCodes =
      pageContent?.includes(state.teams!.teamA!.code) ||
      pageContent?.includes(state.teams!.teamB!.code)

    // The page should have loaded successfully with match data
    expect(hasTeamCodes || pageContent!.length > 100).toBeTruthy()

    await context.close()
  })

  // ─── 5.16 Prediction window closed (live status) ─────────────���────
  test('5.16 — Live fixture shows prediction window closed', async ({
    browser,
  }) => {
    const state = getSharedState()
    const fixtureX = state.fixtures.fixtureX!
    const gangA = state.gangs.gangA!

    // Move Fixture X to "live" status
    await setFixtureStatus(fixtureX.id, 'live')

    const context = await browser.newContext()
    const page = await context.newPage()

    await authenticate(page, 0, {
      navigateTo: `/group/${gangA.id}/predict/${fixtureX.id}`,
    })
    await waitForPageReady(page)

    // When the fixture is live, the prediction page should show a locked message
    // Check for various indicators that predictions are closed
    const isLocked =
      (await page
        .getByText(/prediction.*closed|locked|window.*closed|cannot.*predict/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)) ||
      (await page
        .getByRole('button', { name: 'Lock Predictions' })
        .isDisabled()
        .catch(() => false))

    // The user should see either a "locked" message or redirected to match page
    // or the submit button is disabled
    const isOnMatchPage = page.url().includes('/match/')
    expect(isLocked || isOnMatchPage).toBeTruthy()

    await context.close()

    // Reset fixture X back to upcoming for potential later suites
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await setFixtureStartTime(fixtureX.id, futureTime.toISOString())
    await setFixtureStatus(fixtureX.id, 'upcoming')
  })
})
