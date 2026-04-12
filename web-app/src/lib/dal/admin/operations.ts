import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgeFunctionHealth {
  name: string
  description: string
  status: 'healthy' | 'stale' | 'unknown'
  lastActivity: string | null
  message: string
}

export interface OperationalAlert {
  severity: 'info' | 'warning' | 'critical'
  source: string
  message: string
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Infer edge function health from data state.
 */
export async function getOperationalHealth(): Promise<EdgeFunctionHealth[]> {
  const supabase = createServiceRoleClient()
  const healthChecks: EdgeFunctionHealth[] = []

  const STALE_THRESHOLD_HOURS = 6
  const now = new Date()

  // 1. Fixture sync — check last fixture updated_at
  const { data: latestFixture } = await supabase
    .from('v2_league_season_fixtures')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestFixture) {
    const lastUpdate = new Date(latestFixture.created_at)
    const hoursSince =
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Fixture Sync',
      description: 'Syncs fixture data from external API',
      status: hoursSince > STALE_THRESHOLD_HOURS * 24 ? 'stale' : 'healthy',
      lastActivity: latestFixture.created_at,
      message: `Last fixture created ${Math.round(hoursSince)}h ago`,
    })
  } else {
    healthChecks.push({
      name: 'Fixture Sync',
      description: 'Syncs fixture data from external API',
      status: 'unknown',
      lastActivity: null,
      message: 'No fixtures found',
    })
  }

  // 2. Live score polling — check last_polled_at
  const { data: latestPoll } = await supabase
    .from('v2_fixture_live_scores')
    .select('last_polled_at')
    .not('last_polled_at', 'is', null)
    .order('last_polled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestPoll?.last_polled_at) {
    const lastPoll = new Date(latestPoll.last_polled_at)
    const hoursSince =
      (now.getTime() - lastPoll.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Live Score Polling',
      description: 'Polls live scores during active matches',
      status: hoursSince > STALE_THRESHOLD_HOURS ? 'stale' : 'healthy',
      lastActivity: latestPoll.last_polled_at,
      message: `Last polled ${Math.round(hoursSince)}h ago`,
    })
  } else {
    healthChecks.push({
      name: 'Live Score Polling',
      description: 'Polls live scores during active matches',
      status: 'unknown',
      lastActivity: null,
      message: 'No polling activity recorded',
    })
  }

  // 3. Scenario resolution — check last resolved scenario
  const { data: latestResolution } = await supabase
    .from('v2_fixture_scenarios')
    .select('updated_at')
    .eq('is_resolved', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestResolution) {
    const lastResolved = new Date(latestResolution.updated_at)
    const hoursSince =
      (now.getTime() - lastResolved.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Scenario Resolution',
      description: 'Resolves scenarios after match events',
      status: hoursSince > STALE_THRESHOLD_HOURS * 12 ? 'stale' : 'healthy',
      lastActivity: latestResolution.updated_at,
      message: `Last resolution ${Math.round(hoursSince)}h ago`,
    })
  } else {
    healthChecks.push({
      name: 'Scenario Resolution',
      description: 'Resolves scenarios after match events',
      status: 'unknown',
      lastActivity: null,
      message: 'No scenarios resolved yet',
    })
  }

  // 4. Notification delivery — check last notification
  const { data: latestNotification } = await supabase
    .from('v2_notifications')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestNotification) {
    const lastNotif = new Date(latestNotification.created_at)
    const hoursSince =
      (now.getTime() - lastNotif.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Notification Delivery',
      description: 'Sends notifications for key events',
      status: hoursSince > STALE_THRESHOLD_HOURS * 12 ? 'stale' : 'healthy',
      lastActivity: latestNotification.created_at,
      message: `Last notification ${Math.round(hoursSince)}h ago`,
    })
  } else {
    healthChecks.push({
      name: 'Notification Delivery',
      description: 'Sends notifications for key events',
      status: 'unknown',
      lastActivity: null,
      message: 'No notifications sent yet',
    })
  }

  return healthChecks
}

/**
 * Aggregate alerts from various data anomalies.
 */
export async function getActiveAlerts(
  seasonId: string,
): Promise<OperationalAlert[]> {
  const supabase = createServiceRoleClient()
  const alerts: OperationalAlert[] = []

  // Check for live fixtures without live scores
  const { data: liveFixtures } = await supabase
    .from('v2_league_season_fixtures')
    .select('id')
    .eq('season_id', seasonId)
    .eq('status', 'live')

  if (liveFixtures && liveFixtures.length > 0) {
    const liveFixtureIds = liveFixtures.map((f) => f.id)
    const { data: liveScores } = await supabase
      .from('v2_fixture_live_scores')
      .select('fixture_id')
      .in('fixture_id', liveFixtureIds)

    const scoredFixtureIds = new Set(
      (liveScores ?? []).map((s) => s.fixture_id),
    )
    const missingScores = liveFixtureIds.filter(
      (id) => !scoredFixtureIds.has(id),
    )

    if (missingScores.length > 0) {
      alerts.push({
        severity: 'critical',
        source: 'Live Scores',
        message: `${missingScores.length} live fixture(s) without live score data`,
      })
    }
  }

  // Check for unresolved scenarios on completed fixtures
  const { data: completedFixtures } = await supabase
    .from('v2_league_season_fixtures')
    .select('id')
    .eq('season_id', seasonId)
    .in('status', ['completed', 'resolved'])

  if (completedFixtures && completedFixtures.length > 0) {
    const completedIds = completedFixtures.map((f) => f.id)
    const { data: unresolvedScenarios } = await supabase
      .from('v2_fixture_scenarios')
      .select('fixture_id')
      .in('fixture_id', completedIds)
      .eq('is_resolved', false)
      .eq('is_voided', false)

    const uniqueFixtures = new Set(
      (unresolvedScenarios ?? []).map((s) => s.fixture_id),
    )

    if (uniqueFixtures.size > 0) {
      alerts.push({
        severity: 'warning',
        source: 'Scenario Resolution',
        message: `${uniqueFixtures.size} completed fixture(s) with unresolved scenarios (${unresolvedScenarios?.length ?? 0} total)`,
      })
    }
  }

  // Check for completed fixtures without results
  if (completedFixtures && completedFixtures.length > 0) {
    const completedIds = completedFixtures.map((f) => f.id)
    const { data: results } = await supabase
      .from('v2_fixture_results')
      .select('fixture_id')
      .in('fixture_id', completedIds)

    const resultFixtureIds = new Set(
      (results ?? []).map((r) => r.fixture_id),
    )
    const missingResults = completedIds.filter(
      (id) => !resultFixtureIds.has(id),
    )

    if (missingResults.length > 0) {
      alerts.push({
        severity: 'warning',
        source: 'Fixture Results',
        message: `${missingResults.length} completed fixture(s) without result data`,
      })
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: 'info',
      source: 'System',
      message: 'No active alerts. All systems operating normally.',
    })
  }

  return alerts
}
