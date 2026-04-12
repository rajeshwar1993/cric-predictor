import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OverviewMetrics {
  users: {
    total: number
    active: number
    deleted: number
    onboarded: number
    notOnboarded: number
  }
  gangs: {
    total: number
    active: number
    deleted: number
  }
  predictions: {
    total: number
    today: number
  }
}

export type MatchStatus = Database['public']['Enums']['v2_match_status']

export type FixtureStatusCounts = Record<MatchStatus, number>

export interface SeasonProgress {
  id: string
  name: string
  year: number
  startDate: string | null
  endDate: string | null
  totalFixtures: number
  resolvedFixtures: number
  completedFixtures: number
  daysRemaining: number | null
}

export interface DataFreshnessCheck {
  label: string
  status: 'ok' | 'warn'
  detail: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_STATUSES: MatchStatus[] = [
  'upcoming',
  'live',
  'completed',
  'resolved',
  'abandoned',
  'no_result',
]

// ---------------------------------------------------------------------------
// DAL Functions
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate platform metrics: users, gangs, predictions.
 */
export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const supabase = createServiceRoleClient()

  // Run all count queries in parallel
  const [
    totalUsersRes,
    activeUsersRes,
    deletedUsersRes,
    onboardedUsersRes,
    notOnboardedUsersRes,
    totalGangsRes,
    activeGangsRes,
    deletedGangsRes,
    totalPredictionsRes,
    todayPredictionsRes,
  ] = await Promise.all([
    // Users
    supabase.from('v2_profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('v2_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false),
    supabase
      .from('v2_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', true),
    supabase
      .from('v2_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('onboarding_completed', true),
    supabase
      .from('v2_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('onboarding_completed', false),
    // Gangs
    supabase.from('v2_gangs').select('*', { count: 'exact', head: true }),
    supabase
      .from('v2_gangs')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false),
    supabase
      .from('v2_gangs')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', true),
    // Predictions
    supabase.from('v2_predictions').select('*', { count: 'exact', head: true }),
    supabase
      .from('v2_predictions')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', new Date().toISOString().split('T')[0]),
  ])

  return {
    users: {
      total: totalUsersRes.count ?? 0,
      active: activeUsersRes.count ?? 0,
      deleted: deletedUsersRes.count ?? 0,
      onboarded: onboardedUsersRes.count ?? 0,
      notOnboarded: notOnboardedUsersRes.count ?? 0,
    },
    gangs: {
      total: totalGangsRes.count ?? 0,
      active: activeGangsRes.count ?? 0,
      deleted: deletedGangsRes.count ?? 0,
    },
    predictions: {
      total: totalPredictionsRes.count ?? 0,
      today: todayPredictionsRes.count ?? 0,
    },
  }
}

/**
 * Count fixtures by status for the active season.
 */
export async function getFixtureStatusCounts(): Promise<FixtureStatusCounts> {
  const supabase = createServiceRoleClient()

  // Find the active season
  const { data: season } = await supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const defaults: FixtureStatusCounts = {
    upcoming: 0,
    live: 0,
    completed: 0,
    resolved: 0,
    abandoned: 0,
    no_result: 0,
  }

  if (!season) return defaults

  // Count fixtures per status in parallel
  const countResults = await Promise.all(
    ALL_STATUSES.map((status) =>
      supabase
        .from('v2_league_season_fixtures')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', season.id)
        .eq('status', status),
    ),
  )

  const counts = { ...defaults }
  ALL_STATUSES.forEach((status, index) => {
    const result = countResults[index]
    if (result) {
      counts[status] = result.count ?? 0
    }
  })

  return counts
}

/**
 * Get active season info with fixture progress.
 */
export async function getSeasonProgress(): Promise<SeasonProgress | null> {
  const supabase = createServiceRoleClient()

  const { data: season } = await supabase
    .from('v2_seasons')
    .select('id, name, year, start_date, end_date')
    .eq('is_active', true)
    .maybeSingle()

  if (!season) return null

  const [totalRes, resolvedRes, completedRes] = await Promise.all([
    supabase
      .from('v2_league_season_fixtures')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id),
    supabase
      .from('v2_league_season_fixtures')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id)
      .eq('status', 'resolved'),
    supabase
      .from('v2_league_season_fixtures')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id)
      .in('status', ['completed', 'resolved', 'abandoned', 'no_result']),
  ])

  let daysRemaining: number | null = null
  if (season.end_date) {
    const endDate = new Date(season.end_date + 'T23:59:59Z')
    const now = new Date()
    const diffMs = endDate.getTime() - now.getTime()
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  return {
    id: season.id,
    name: season.name,
    year: season.year,
    startDate: season.start_date,
    endDate: season.end_date,
    totalFixtures: totalRes.count ?? 0,
    resolvedFixtures: resolvedRes.count ?? 0,
    completedFixtures: completedRes.count ?? 0,
    daysRemaining,
  }
}

/**
 * Check data freshness: fixture sync age, live score polling, unseeded scenarios, pre-match sync.
 */
export async function getDataFreshnessChecks(): Promise<DataFreshnessCheck[]> {
  const supabase = createServiceRoleClient()
  const checks: DataFreshnessCheck[] = []

  // 1. Fixture sync freshness: check most recent fixture updated_at or created_at
  const { data: latestFixture } = await supabase
    .from('v2_league_season_fixtures')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestFixture) {
    const ageMs = Date.now() - new Date(latestFixture.created_at).getTime()
    const ageHours = ageMs / (1000 * 60 * 60)
    checks.push({
      label: 'Fixture sync',
      status: ageHours > 26 ? 'warn' : 'ok',
      detail:
        ageHours > 26
          ? `Last fixture created ${Math.round(ageHours)}h ago`
          : `Last fixture created ${Math.round(ageHours)}h ago`,
    })
  } else {
    checks.push({
      label: 'Fixture sync',
      status: 'warn',
      detail: 'No fixtures found',
    })
  }

  // 2. Live score freshness: check if any live fixture has stale polling
  const { data: liveFixtures } = await supabase
    .from('v2_league_season_fixtures')
    .select('id')
    .eq('status', 'live')

  if (liveFixtures && liveFixtures.length > 0) {
    const liveFixtureIds = liveFixtures.map((f) => f.id)
    const { data: staleScores } = await supabase
      .from('v2_fixture_live_scores')
      .select('fixture_id, last_polled_at')
      .in('fixture_id', liveFixtureIds)
      .not('last_polled_at', 'is', null)

    const now = Date.now()
    const staleCount = (staleScores ?? []).filter((s) => {
      if (!s.last_polled_at) return false
      return now - new Date(s.last_polled_at).getTime() > 60_000
    }).length

    const missingScoreCount = liveFixtures.length - (staleScores ?? []).length

    if (staleCount > 0 || missingScoreCount > 0) {
      const issues: string[] = []
      if (staleCount > 0) issues.push(`${staleCount} stale`)
      if (missingScoreCount > 0) issues.push(`${missingScoreCount} missing`)
      checks.push({
        label: 'Live score polling',
        status: 'warn',
        detail: `${liveFixtures.length} live: ${issues.join(', ')}`,
      })
    } else {
      checks.push({
        label: 'Live score polling',
        status: 'ok',
        detail: `${liveFixtures.length} live, all fresh`,
      })
    }
  } else {
    checks.push({
      label: 'Live score polling',
      status: 'ok',
      detail: 'No live fixtures',
    })
  }

  // 3. Unseeded scenarios: fixtures with upcoming status that have no scenarios
  const { data: activeSeason } = await supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (activeSeason) {
    const { data: upcomingFixtures } = await supabase
      .from('v2_league_season_fixtures')
      .select('id')
      .eq('season_id', activeSeason.id)
      .eq('status', 'upcoming')

    if (upcomingFixtures && upcomingFixtures.length > 0) {
      const fixtureIds = upcomingFixtures.map((f) => f.id)
      const { data: seededFixtures } = await supabase
        .from('v2_fixture_scenarios')
        .select('fixture_id')
        .in('fixture_id', fixtureIds)

      const seededFixtureIds = new Set((seededFixtures ?? []).map((s) => s.fixture_id))
      const unseededCount = fixtureIds.filter((id) => !seededFixtureIds.has(id)).length

      checks.push({
        label: 'Scenario seeding',
        status: unseededCount > 0 ? 'warn' : 'ok',
        detail:
          unseededCount > 0
            ? `${unseededCount} upcoming fixture${unseededCount === 1 ? '' : 's'} without scenarios`
            : 'All upcoming fixtures seeded',
      })
    } else {
      checks.push({
        label: 'Scenario seeding',
        status: 'ok',
        detail: 'No upcoming fixtures',
      })
    }

    // 4. Pre-match sync: upcoming fixtures without pre_match_synced
    const { count: unsyncedCount } = await supabase
      .from('v2_league_season_fixtures')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', activeSeason.id)
      .eq('status', 'upcoming')
      .eq('pre_match_synced', false)
    const unsyncedTotal = unsyncedCount ?? 0
    checks.push({
      label: 'Pre-match sync',
      status: unsyncedTotal > 0 ? 'warn' : 'ok',
      detail:
        unsyncedTotal > 0
          ? `${unsyncedTotal} upcoming fixture${unsyncedTotal === 1 ? '' : 's'} not synced`
          : 'All upcoming fixtures synced',
    })
  } else {
    checks.push({
      label: 'Scenario seeding',
      status: 'warn',
      detail: 'No active season',
    })
    checks.push({
      label: 'Pre-match sync',
      status: 'warn',
      detail: 'No active season',
    })
  }

  return checks
}
