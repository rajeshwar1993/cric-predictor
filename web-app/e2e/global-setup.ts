/**
 * E2E Global Setup — runs once before all test suites.
 *
 * 1. Cleans up leftover test data from previous (possibly failed) runs.
 * 2. Creates 8 test users via the Supabase Admin API.
 * 3. Stores user IDs/credentials in a shared auth state file.
 * 4. Looks up league/season IDs for fixture seeding in later suites.
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') })

import { getSupabaseAdmin } from './helpers/supabase-admin'
import { TEST_USERS, TEST_USER_PASSWORD } from './helpers/test-users'
import { writeAuthState, deleteAuthState, type AuthStateUser } from './helpers/auth-state'
import { cleanupTestGangs } from './helpers/gangs'
import { cleanupTestFixtures } from './helpers/fixtures'
import { deleteSharedState, updateSharedState } from './helpers/shared-state'

async function globalSetup() {
  console.warn('\n--- E2E Global Setup: Starting ---')
  const admin = getSupabaseAdmin()

  // ── Step 1: Clean up leftover data from previous runs ──────────────
  console.warn('  Cleaning up leftover test data...')

  const { data: existingUsersResult } = await admin.auth.admin.listUsers()
  const testUserEmails = new Set<string>(TEST_USERS.map((u) => u.email))
  const staleUsers =
    existingUsersResult?.users?.filter((u) => testUserEmails.has(u.email ?? '')) ?? []

  if (staleUsers.length > 0) {
    const staleUserIds = staleUsers.map((u) => u.id)

    // Clean up gangs created by stale users (cascades to scenarios, predictions, etc.)
    await cleanupTestGangs(staleUserIds)

    // Clean up test fixtures
    await cleanupTestFixtures()

    // Delete notifications for stale users
    await admin.from('v2_notifications').delete().in('user_id', staleUserIds)

    // Delete profiles
    await admin.from('v2_profiles').delete().in('id', staleUserIds)

    // Delete the auth users themselves
    for (const user of staleUsers) {
      await admin.auth.admin.deleteUser(user.id)
    }
    console.warn(`  Cleaned up ${staleUsers.length} stale test users`)
  }

  // Clean up state files from previous runs
  deleteAuthState()
  deleteSharedState()

  // ── Step 2: Create 8 test users ────────────────────────────────────
  console.warn('  Creating test users...')
  const createdUsers: AuthStateUser[] = []

  for (const testUser of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: testUser.email,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: testUser.displayName },
    })

    if (error) {
      throw new Error(`Failed to create test user ${testUser.email}: ${error.message}`)
    }

    createdUsers.push({
      index: testUser.index,
      email: testUser.email,
      password: TEST_USER_PASSWORD,
      userId: data.user.id,
      displayName: testUser.displayName,
    })
  }

  console.warn(`  Created ${createdUsers.length} test users`)

  // ── Step 3: Write auth state for tests to read ─────────────────────
  writeAuthState({
    users: createdUsers,
    createdAt: new Date().toISOString(),
  })

  // ── Step 4: Look up league/season IDs for fixture seeding ──────────
  const { data: league } = await admin
    .from('v2_leagues')
    .select('id')
    .limit(1)
    .single()

  const { data: season } = await admin
    .from('v2_seasons')
    .select('id')
    .limit(1)
    .single()

  if (league && season) {
    updateSharedState({
      leagueSeason: { leagueId: league.id, seasonId: season.id },
    })
    console.warn(`  Found league=${league.id}, season=${season.id}`)
  } else {
    console.warn('  WARNING: Could not find league/season data in staging. Fixture seeding may fail.')
  }

  // Look up 2 teams for test fixtures
  const { data: teams } = await admin
    .from('v2_league_teams')
    .select('id, code')
    .limit(2)

  if (teams && teams.length >= 2) {
    const [t0, t1] = teams
    updateSharedState({
      teams: {
        teamA: { id: t0!.id, code: t0!.code },
        teamB: { id: t1!.id, code: t1!.code },
      },
    })
    console.warn(`  Found teams: ${t0!.code}, ${t1!.code}`)
  }

  console.warn('--- E2E Global Setup: Complete ---\n')
}

export default globalSetup
