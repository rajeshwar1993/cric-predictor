import { CronExpressionParser } from 'cron-parser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CronInvocationType = 'edge-function' | 'pg-function' | 'pg-sql'

export interface CronJobDefinition {
  /** Unique key used to identify the job in server actions */
  key: string
  /** Display name */
  name: string
  /** Short description of what the job does */
  description: string
  /** Standard cron expression (5-field). null for sub-minute intervals. */
  cronExpression: string | null
  /** Human-readable schedule label */
  scheduleLabel: string
  /** How the job is invoked */
  invocationType: CronInvocationType
  /**
   * For edge-function: the function name passed to `functions.invoke()`.
   * For pg-function: the postgres function name passed to `rpc()`.
   * For pg-sql: not used (inline SQL).
   */
  functionName: string
}

// ---------------------------------------------------------------------------
// Registry — all cron jobs from PRD § "Cron Functions"
// ---------------------------------------------------------------------------

export const CRON_JOBS: CronJobDefinition[] = [
  {
    key: 'sync-fixtures',
    name: 'Fixture Sync',
    description: 'Daily import of match schedule and player rosters from Sportmonks',
    cronExpression: '30 23 * * *',
    scheduleLabel: 'Daily at 5:00 AM IST',
    invocationType: 'edge-function',
    functionName: 'sync-fixtures',
  },
  {
    key: 'sync-fixtures-pre-match',
    name: 'Pre-Match Sync',
    description: 'Catches last-minute fixture timing changes before match start',
    cronExpression: '*/15 * * * *',
    scheduleLabel: 'Every 15 minutes',
    invocationType: 'edge-function',
    functionName: 'sync-fixtures-pre-match',
  },
  {
    key: 'live-poll-resolve-fixtures',
    name: 'Live Poll & Resolve',
    description: 'Live score polling, status transitions, and progressive scenario resolution',
    cronExpression: null, // Sub-minute (15s) — not a standard cron expression
    scheduleLabel: 'Every 15 seconds',
    invocationType: 'edge-function',
    functionName: 'live-poll-resolve-fixtures',
  },
  {
    key: 'seed-scenarios',
    name: 'Seed Scenarios',
    description: 'Seeds fixture scenarios for all eligible gang/fixture pairs within the 14h pre-match window',
    cronExpression: '*/30 * * * *',
    scheduleLabel: 'Every 30 minutes',
    invocationType: 'pg-function',
    functionName: 'run_seed_scenarios_cron',
  },
  {
    key: 'deadline-reminders',
    name: 'Deadline Reminders',
    description: 'Sends notifications to gang members who haven\'t predicted ~1h before deadline',
    cronExpression: '*/15 * * * *',
    scheduleLabel: 'Every 15 minutes',
    invocationType: 'pg-function',
    functionName: 'run_deadline_reminders_cron',
  },
  {
    key: 'cleanup-rate-limits',
    name: 'Rate Limit Cleanup',
    description: 'Deletes rate limit entries older than 24 hours',
    cronExpression: '0 3 * * *',
    scheduleLabel: 'Daily at 3:00 AM UTC',
    invocationType: 'pg-sql',
    functionName: 'cleanup-rate-limits',
  },
]

// ---------------------------------------------------------------------------
// Next-run computation
// ---------------------------------------------------------------------------

/**
 * Compute the next run time for a cron expression.
 * Returns null for sub-minute intervals (no standard cron expression).
 */
export function getNextRun(cronExpression: string | null): Date | null {
  if (!cronExpression) return null

  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: 'UTC',
    })
    return interval.next().toDate()
  } catch {
    return null
  }
}

/**
 * Format a future date as a human-readable relative string.
 * e.g. "in 8 min", "in 2h 15min", "in 14h"
 */
export function formatTimeUntil(target: Date): string {
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) return 'now'

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (totalMinutes === 0) return 'in <1 min'
  if (hours === 0) return `in ${minutes} min`
  if (minutes === 0) return `in ${hours}h`
  return `in ${hours}h ${minutes}min`
}
