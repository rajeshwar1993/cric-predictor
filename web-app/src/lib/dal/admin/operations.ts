import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  CRON_JOBS,
  getNextRun,
  formatTimeUntil,
} from '@/lib/cron-registry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgeFunctionHealth {
  name: string
  description: string
  status: 'healthy' | 'stale' | 'unknown'
  lastActivity: string | null
  message: string
  /** Cron registry key for triggering */
  cronKey: string
  /** Human-readable schedule label */
  scheduleLabel: string
  /** When the next cron run is expected (ISO string), null for sub-minute */
  nextRun: string | null
  /** Human-readable time until next run */
  nextRunLabel: string
}

export interface OperationalAlert {
  severity: 'info' | 'warning' | 'critical'
  source: string
  message: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a cron-job-keyed lookup map for O(1) access */
const CRON_JOB_MAP = new Map(CRON_JOBS.map((j) => [j.key, j]))

function cronMeta(key: string): Pick<EdgeFunctionHealth, 'cronKey' | 'scheduleLabel' | 'nextRun' | 'nextRunLabel'> {
  const job = CRON_JOB_MAP.get(key)
  if (!job) {
    throw new Error(`Unknown cron key: "${key}" — check CRON_JOBS registry`)
  }
  const next = getNextRun(job.cronExpression)
  return {
    cronKey: job.key,
    scheduleLabel: job.scheduleLabel,
    nextRun: next?.toISOString() ?? null,
    nextRunLabel: next ? formatTimeUntil(next) : '~15s (continuous)',
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Infer edge function health from data state.
 * Returns one entry per cron function with schedule metadata.
 */
export async function getOperationalHealth(): Promise<EdgeFunctionHealth[]> {
  const supabase = createServiceRoleClient()
  const healthChecks: EdgeFunctionHealth[] = []

  const STALE_THRESHOLD_HOURS = 6
  const now = new Date()

  // 1. Fixture sync — check last fixture created_at
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
      ...cronMeta('sync-fixtures'),
    })
  } else {
    healthChecks.push({
      name: 'Fixture Sync',
      description: 'Syncs fixture data from external API',
      status: 'unknown',
      lastActivity: null,
      message: 'No fixtures found',
      ...cronMeta('sync-fixtures'),
    })
  }

  // 2. Pre-match sync — check last pre_match_synced fixture via status_changed_at
  const { data: latestPreMatch } = await supabase
    .from('v2_league_season_fixtures')
    .select('status_changed_at')
    .eq('pre_match_synced', true)
    .order('status_changed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestPreMatch) {
    const lastSync = new Date(latestPreMatch.status_changed_at)
    const hoursSince =
      (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Pre-Match Sync',
      description: 'Catches last-minute fixture timing changes before match start',
      status: hoursSince > STALE_THRESHOLD_HOURS ? 'stale' : 'healthy',
      lastActivity: latestPreMatch.status_changed_at,
      message: `Last pre-match sync ${Math.round(hoursSince)}h ago`,
      ...cronMeta('sync-fixtures-pre-match'),
    })
  } else {
    healthChecks.push({
      name: 'Pre-Match Sync',
      description: 'Catches last-minute fixture timing changes before match start',
      status: 'unknown',
      lastActivity: null,
      message: 'No pre-match syncs recorded',
      ...cronMeta('sync-fixtures-pre-match'),
    })
  }

  // 3. Live poll & resolve — check last_polled_at
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
      name: 'Live Poll & Resolve',
      description: 'Live score polling and progressive scenario resolution',
      status: hoursSince > STALE_THRESHOLD_HOURS ? 'stale' : 'healthy',
      lastActivity: latestPoll.last_polled_at,
      message: `Last polled ${Math.round(hoursSince)}h ago`,
      ...cronMeta('live-poll-resolve-fixtures'),
    })
  } else {
    healthChecks.push({
      name: 'Live Poll & Resolve',
      description: 'Live score polling and progressive scenario resolution',
      status: 'unknown',
      lastActivity: null,
      message: 'No polling activity recorded',
      ...cronMeta('live-poll-resolve-fixtures'),
    })
  }

  // 4. Seed scenarios — check last seeded scenario
  const { data: latestScenario } = await supabase
    .from('v2_fixture_scenarios')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestScenario) {
    const lastSeeded = new Date(latestScenario.created_at)
    const hoursSince =
      (now.getTime() - lastSeeded.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Seed Scenarios',
      description: 'Seeds fixture scenarios for eligible gang/fixture pairs',
      status: hoursSince > STALE_THRESHOLD_HOURS * 12 ? 'stale' : 'healthy',
      lastActivity: latestScenario.created_at,
      message: `Last scenario seeded ${Math.round(hoursSince)}h ago`,
      ...cronMeta('seed-scenarios'),
    })
  } else {
    healthChecks.push({
      name: 'Seed Scenarios',
      description: 'Seeds fixture scenarios for eligible gang/fixture pairs',
      status: 'unknown',
      lastActivity: null,
      message: 'No scenarios seeded yet',
      ...cronMeta('seed-scenarios'),
    })
  }

  // 5. Deadline reminders — check last deadline_reminder notification
  const { data: latestReminder } = await supabase
    .from('v2_notifications')
    .select('created_at')
    .eq('type', 'deadline_reminder')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestReminder) {
    const lastReminder = new Date(latestReminder.created_at)
    const hoursSince =
      (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Deadline Reminders',
      description: 'Sends notifications before prediction deadline closes',
      status: hoursSince > STALE_THRESHOLD_HOURS * 12 ? 'stale' : 'healthy',
      lastActivity: latestReminder.created_at,
      message: `Last reminder ${Math.round(hoursSince)}h ago`,
      ...cronMeta('deadline-reminders'),
    })
  } else {
    healthChecks.push({
      name: 'Deadline Reminders',
      description: 'Sends notifications before prediction deadline closes',
      status: 'unknown',
      lastActivity: null,
      message: 'No deadline reminders sent yet',
      ...cronMeta('deadline-reminders'),
    })
  }

  // 6. Rate limit cleanup — check if there are old entries
  const { count } = await supabase
    .from('v2_rate_limits')
    .select('*', { count: 'exact', head: true })
    .lt('window_start', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

  healthChecks.push({
    name: 'Rate Limit Cleanup',
    description: 'Deletes rate limit entries older than 24 hours',
    status: (count ?? 0) > 0 ? 'stale' : 'healthy',
    lastActivity: null,
    message:
      (count ?? 0) > 0
        ? `${count} stale entries awaiting cleanup`
        : 'No stale entries',
    ...cronMeta('cleanup-rate-limits'),
  })

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
