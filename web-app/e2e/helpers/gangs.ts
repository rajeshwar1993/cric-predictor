/**
 * Gang data helpers for E2E tests.
 *
 * Uses the service role client to query/modify gang data
 * without RLS restrictions.
 */
import { getSupabaseAdmin } from './supabase-admin'

/**
 * Fetches the invite code for a gang.
 */
export async function getGangInviteCode(gangId: string): Promise<string> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('v2_gangs')
    .select('invite_code')
    .eq('id', gangId)
    .single()
  if (error) throw new Error(`Failed to get invite code for gang ${gangId}: ${error.message}`)
  return data.invite_code
}

/**
 * Fetches all members of a gang with their status and role.
 */
export async function getGangMembers(
  gangId: string
): Promise<Array<{ user_id: string; role: string; status: string }>> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('v2_gang_members')
    .select('user_id, role, status')
    .eq('gang_id', gangId)
  if (error) throw new Error(`Failed to get members for gang ${gangId}: ${error.message}`)
  return data
}

/**
 * Enrolls a gang in a league season (required for scenario seeding).
 * The `seed_fixture_scenarios_for_gang` RPC checks `v2_gang_league_seasons`
 * to find the sport and templates.
 * Idempotent via upsert.
 */
export async function enrollGangInLeagueSeason(
  gangId: string,
  leagueId: string,
  seasonId: string
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.from('v2_gang_league_seasons').upsert(
    {
      gang_id: gangId,
      league_id: leagueId,
      season_id: seasonId,
      is_active: true,
    },
    { onConflict: 'gang_id,league_id,season_id' }
  )
  if (error) throw new Error(`Failed to enroll gang ${gangId} in league season: ${error.message}`)
}

/**
 * Cleans up all gangs (and associated data) created by the given user IDs.
 * Hard-deletes for clean teardown.
 */
export async function cleanupTestGangs(testUserIds: string[]): Promise<void> {
  if (!testUserIds.length) return
  const admin = getSupabaseAdmin()

  // Find gangs created by test users
  const { data: gangs } = await admin
    .from('v2_gangs')
    .select('id')
    .in('created_by', testUserIds)

  if (!gangs?.length) return

  const gangIds = gangs.map((g) => g.id)

  // Delete in dependency order

  // 1. Predictions for scenarios in these gangs
  const { data: scenarios } = await admin
    .from('v2_fixture_scenarios')
    .select('id')
    .in('gang_id', gangIds)

  if (scenarios?.length) {
    const scenarioIds = scenarios.map((s) => s.id)
    await admin.from('v2_predictions').delete().in('scenario_id', scenarioIds)
  }

  // 2. Fixture scenarios
  await admin.from('v2_fixture_scenarios').delete().in('gang_id', gangIds)

  // 3. Gang fixture standings
  await admin.from('v2_gang_fixture_standings').delete().in('gang_id', gangIds)

  // 4. Gang season standings
  await admin.from('v2_gang_season_standings').delete().in('gang_id', gangIds)

  // 5. Gang league seasons
  await admin.from('v2_gang_league_seasons').delete().in('gang_id', gangIds)

  // 6. Gang members
  await admin.from('v2_gang_members').delete().in('gang_id', gangIds)

  // 7. Notifications referencing these gangs
  await admin.from('v2_notifications').delete().in('gang_id', gangIds)

  // 8. Delete the gangs themselves
  await admin.from('v2_gangs').delete().in('id', gangIds)
}
