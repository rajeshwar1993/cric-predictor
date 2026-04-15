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
  const now = new Date()

  // Batch-fetch all cron run statuses in a single query
  const { data: cronRunsRaw } = await supabase
    .from('v2_cron_run_status' as 'v2_rate_limits')
    .select('*')
  const cronRuns = (cronRunsRaw ?? []) as unknown as CronRunStatus[]
  const runMap = new Map(cronRuns.map((r) => [r.job_key, r]))

  // Also check if any fixtures are currently live (needed for live-poll context)
  const { count: liveFixtureCount } = await supabase
    .from('v2_league_season_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'live')
  const hasLiveFixtures = (liveFixtureCount ?? 0) > 0

  // Health check definitions: job key, display name, description, stale threshold (hours)
  const checks: Array<{
    key: string
    name: string
    description: string
    staleHours: number
    formatMessage: (run: CronRunStatus, hoursSince: number) => string
  }> = [
    {
      key: 'sync-fixtures',
      name: 'Fixture Sync',
      description: 'Syncs fixture data from external API',
      staleHours: 30,
      formatMessage: (run, h) => {
        const s = run.summary as Record<string, number> | null
        return `Last synced ${Math.round(h)}h ago (${run.duration_ms}ms, ${s?.fixturesSynced ?? 0} fixtures)`
      },
    },
    {
      key: 'sync-fixtures-pre-match',
      name: 'Pre-Match Sync',
      description: 'Catches last-minute fixture timing changes before match start',
      staleHours: 1,
      formatMessage: (run, h) => {
        const s = run.summary as Record<string, number> | null
        return `Last run ${Math.round(h * 60)}min ago (${run.duration_ms}ms, ${s?.fixturesChecked ?? 0} checked, ${s?.fixturesUpdated ?? 0} updated)`
      },
    },
    {
      key: 'live-poll-resolve-fixtures',
      name: 'Live Poll & Resolve',
      description: 'Live score polling and progressive scenario resolution',
      // Only truly stale if live fixtures exist; otherwise idle is fine
      staleHours: hasLiveFixtures ? 0.083 : 999,
      formatMessage: (run, h) => {
        const s = run.summary as Record<string, number> | null
        const polled = s?.fixturesPolled ?? 0
        if (hasLiveFixtures) {
          return `Polling ${liveFixtureCount} live fixture(s) · last ${Math.round(h * 60)}min ago (${polled} polled, ${s?.scenariosResolved ?? 0} resolved)`
        }
        return `Idle — no live fixtures · last run ${Math.round(h)}h ago`
      },
    },
    {
      key: 'seed-scenarios',
      name: 'Seed Scenarios',
      description: 'Seeds fixture scenarios for eligible gang/fixture pairs',
      staleHours: 2,
      formatMessage: (run, h) => {
        const s = run.summary as Record<string, number> | null
        return `Last run ${Math.round(h * 60)}min ago (${s?.pairs_found ?? 0} found, ${s?.pairs_seeded ?? 0} seeded)`
      },
    },
    {
      key: 'deadline-reminders',
      name: 'Deadline Reminders',
      description: 'Sends notifications before prediction deadline closes',
      staleHours: 1,
      formatMessage: (run, h) => {
        const s = run.summary as Record<string, number> | null
        return `Last run ${Math.round(h * 60)}min ago (${s?.reminders_sent ?? 0} sent, ${s?.pairs_checked ?? 0} pairs checked)`
      },
    },
    {
      key: 'cleanup-rate-limits',
      name: 'Rate Limit Cleanup',
      description: 'Deletes rate limit entries older than 24 hours',
      staleHours: 26,
      formatMessage: (run, h) => {
        const s = run.summary as Record<string, number> | null
        return `Last run ${Math.round(h)}h ago (${s?.rows_deleted ?? 0} rows cleaned)`
      },
    },
  ]

  const healthChecks: EdgeFunctionHealth[] = checks.map((check) => {
    const run = runMap.get(check.key)

    if (!run) {
      return {
        name: check.name,
        description: check.description,
        status: 'unknown' as const,
        lastActivity: null,
        message: 'No run recorded yet',
        ...cronMeta(check.key),
      }
    }

    const lastRun = new Date(run.completed_at)
    const hoursSince = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)
    const failed = run.status === 'failed'

    return {
      name: check.name,
      description: check.description,
      status: failed ? 'stale' as const : hoursSince > check.staleHours ? 'stale' as const : 'healthy' as const,
      lastActivity: run.completed_at,
      message: failed
        ? `Last run failed (${run.error_count} error(s), ${run.duration_ms}ms)`
        : check.formatMessage(run, hoursSince),
      ...cronMeta(check.key),
    }
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
