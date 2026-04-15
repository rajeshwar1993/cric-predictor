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

/** Row shape for v2_cron_run_status (not yet in generated DB types) */
interface CronRunStatus {
  job_key: string
  status: string
  started_at: string
  completed_at: string
  duration_ms: number
  summary: Record<string, unknown> | null
  error_count: number
  updated_at: string
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
  const now = new Date()

  // 1. Fixture sync — read actual run status from v2_cron_run_status
  //    (replaces proxy-based status_changed_at which was polluted by live-poll)
  const { data: syncRunRaw } = await supabase
    .from('v2_cron_run_status' as 'v2_rate_limits')
    .select('*')
    .eq('job_key' as 'user_id', 'sync-fixtures')
    .maybeSingle()
  const syncRun = syncRunRaw as unknown as CronRunStatus | null

  if (syncRun) {
    const lastRun = new Date(syncRun.completed_at)
    const hoursSince =
      (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)
    const failed = syncRun.status === 'failed'
    const runSummary = syncRun.summary as Record<string, number> | null
    healthChecks.push({
      name: 'Fixture Sync',
      description: 'Syncs fixture data from external API',
      status: failed ? 'stale' : hoursSince > 30 ? 'stale' : 'healthy',
      lastActivity: syncRun.completed_at,
      message: failed
        ? `Last run failed (${syncRun.error_count} error(s), ${syncRun.duration_ms}ms)`
        : `Last synced ${Math.round(hoursSince)}h ago (${syncRun.duration_ms}ms, ${runSummary?.fixturesSynced ?? 0} fixtures)`,
      ...cronMeta('sync-fixtures'),
    })
  } else {
    healthChecks.push({
      name: 'Fixture Sync',
      description: 'Syncs fixture data from external API',
      status: 'unknown',
      lastActivity: null,
      message: 'No run recorded yet',
      ...cronMeta('sync-fixtures'),
    })
  }

  // 2. Pre-match sync — event-driven (only runs for fixtures starting soon).
  //    Count how many fixtures are pending pre-match sync to show actionable info.
  const { count: pendingPreMatch } = await supabase
    .from('v2_league_season_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('pre_match_synced', false)
    .eq('status', 'upcoming')

  const { count: completedPreMatch } = await supabase
    .from('v2_league_season_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('pre_match_synced', true)

  const pending = pendingPreMatch ?? 0
  const completed = completedPreMatch ?? 0
  healthChecks.push({
    name: 'Pre-Match Sync',
    description: 'Catches last-minute fixture timing changes before match start',
    status: completed > 0 || pending === 0 ? 'healthy' : 'unknown',
    lastActivity: null,
    message:
      pending > 0
        ? `${pending} upcoming fixture(s) awaiting pre-match sync`
        : `All fixtures synced (${completed} total)`,
    ...cronMeta('sync-fixtures-pre-match'),
  })

  // 3. Live poll & resolve — check last_polled_at (reliably updated every cycle)
  const { data: latestPoll } = await supabase
    .from('v2_fixture_live_scores')
    .select('last_polled_at')
    .not('last_polled_at', 'is', null)
    .order('last_polled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Also check if any fixtures are currently live
  const { count: liveFixtureCount } = await supabase
    .from('v2_league_season_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'live')

  if (latestPoll?.last_polled_at) {
    const lastPoll = new Date(latestPoll.last_polled_at)
    const hoursSince =
      (now.getTime() - lastPoll.getTime()) / (1000 * 60 * 60)
    const hasLiveFixtures = (liveFixtureCount ?? 0) > 0
    healthChecks.push({
      name: 'Live Poll & Resolve',
      description: 'Live score polling and progressive scenario resolution',
      // Only stale if there are live fixtures but polling hasn't happened recently
      status: hasLiveFixtures && hoursSince > 0.1 ? 'stale' : 'healthy',
      lastActivity: latestPoll.last_polled_at,
      message: hasLiveFixtures
        ? `Polling ${liveFixtureCount} live fixture(s) · last ${Math.round(hoursSince)}h ago`
        : `Idle — no live fixtures · last polled ${Math.round(hoursSince)}h ago`,
      ...cronMeta('live-poll-resolve-fixtures'),
    })
  } else {
    healthChecks.push({
      name: 'Live Poll & Resolve',
      description: 'Live score polling and progressive scenario resolution',
      status: (liveFixtureCount ?? 0) > 0 ? 'stale' : 'healthy',
      lastActivity: null,
      message:
        (liveFixtureCount ?? 0) > 0
          ? `${liveFixtureCount} live fixture(s) but no polling recorded`
          : 'Idle — no live fixtures',
      ...cronMeta('live-poll-resolve-fixtures'),
    })
  }

  // 4. Seed scenarios — event-driven (seeds scenarios within 14h of match start).
  //    Use most recent scenario updated_at as activity indicator.
  const { data: latestScenario } = await supabase
    .from('v2_fixture_scenarios')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestScenario) {
    const lastActivity = new Date(latestScenario.updated_at)
    const hoursSince =
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    healthChecks.push({
      name: 'Seed Scenarios',
      description: 'Seeds fixture scenarios for eligible gang/fixture pairs',
      // Scenarios are event-driven; only stale if no activity for 24h+
      status: hoursSince > 24 ? 'stale' : 'healthy',
      lastActivity: latestScenario.updated_at,
      message: `Last activity ${Math.round(hoursSince)}h ago`,
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

  // 5. Deadline reminders — event-driven (only sends when deadlines approach).
  //    Show last reminder sent, but don't mark stale when nothing is due.
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
      // Event-driven — only stale if no reminders for 48h (implies missed deadlines)
      status: hoursSince > 48 ? 'stale' : 'healthy',
      lastActivity: latestReminder.created_at,
      message: `Last reminder sent ${Math.round(hoursSince)}h ago`,
      ...cronMeta('deadline-reminders'),
    })
  } else {
    healthChecks.push({
      name: 'Deadline Reminders',
      description: 'Sends notifications before prediction deadline closes',
      status: 'healthy',
      lastActivity: null,
      message: 'No reminders sent yet — triggers when deadlines approach',
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
