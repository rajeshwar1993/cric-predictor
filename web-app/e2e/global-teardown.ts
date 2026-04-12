/**
 * E2E Global Teardown — runs once after all test suites.
 *
 * 1. Cleans up test fixtures and their associated data.
 * 2. Cleans up gangs created by test users.
 * 3. Deletes notifications and profiles for test users.
 * 4. Deletes the test users via the Supabase Admin API.
 * 5. Removes state files from disk.
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') })

import { getSupabaseAdmin } from './helpers/supabase-admin'
import { readAuthState, deleteAuthState } from './helpers/auth-state'
import { cleanupTestGangs } from './helpers/gangs'
import { cleanupTestFixtures } from './helpers/fixtures'
import { deleteSharedState } from './helpers/shared-state'

async function globalTeardown() {
  console.warn('\n--- E2E Global Teardown: Starting ---')
  const admin = getSupabaseAdmin()

  try {
    const state = readAuthState()
    const userIds = state.users.map((u) => u.userId)

    // 1. Clean up test fixtures and their data
    console.warn('  Cleaning up test fixtures...')
    await cleanupTestFixtures()

    // 2. Clean up gangs created by test users
    console.warn('  Cleaning up test gangs...')
    await cleanupTestGangs(userIds)

    // 3. Delete notifications for test users
    console.warn('  Cleaning up notifications...')
    await admin.from('v2_notifications').delete().in('user_id', userIds)

    // 4. Delete test user profiles
    console.warn('  Deleting test user profiles...')
    await admin.from('v2_profiles').delete().in('id', userIds)

    // 5. Delete test users via Admin API
    console.warn('  Deleting test users...')
    for (const user of state.users) {
      await admin.auth.admin.deleteUser(user.userId)
    }
    console.warn(`  Deleted ${state.users.length} test users`)
  } catch (err) {
    // Non-fatal — log and continue so the process exits cleanly
    console.error('  Warning: teardown error (non-fatal):', err)
  }

  // 6. Clean up state files
  deleteAuthState()
  deleteSharedState()

  console.warn('--- E2E Global Teardown: Complete ---\n')
}

export default globalTeardown
