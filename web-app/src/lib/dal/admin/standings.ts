import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandingsOverview {
  seasonStandingsRows: number
  fixtureStandingsRows: number
}

export interface StandingsHealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  count: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get counts of season standings and fixture standings rows.
 */
export async function getStandingsOverview(): Promise<StandingsOverview> {
  const supabase = createServiceRoleClient()

  const { count: seasonCount, error: seasonError } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id', { count: 'exact', head: true })

  if (seasonError)
    throw new Error(`getStandingsOverview season failed: ${seasonError.message}`)

  const { count: fixtureCount, error: fixtureError } = await supabase
    .from('v2_gang_fixture_standings')
    .select('gang_id', { count: 'exact', head: true })

  if (fixtureError)
    throw new Error(`getStandingsOverview fixture failed: ${fixtureError.message}`)

  return {
    seasonStandingsRows: seasonCount ?? 0,
    fixtureStandingsRows: fixtureCount ?? 0,
  }
}

/**
 * Run health checks on standings data — look for orphaned or missing entries.
 */
export async function runSeasonStandingsChecks(): Promise<StandingsHealthCheck[]> {
  const supabase = createServiceRoleClient()
  const checks: StandingsHealthCheck[] = []

  // Check 1: Season standings with zero matches predicted
  const { data: zeroMatches, error: zeroError } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id')
    .eq('matches_predicted', 0)

  if (zeroError) {
    checks.push({
      name: 'Zero Matches Predicted',
      status: 'fail',
      message: `Query failed: ${zeroError.message}`,
      count: 0,
    })
  } else {
    const count = zeroMatches?.length ?? 0
    checks.push({
      name: 'Zero Matches Predicted',
      status: count > 0 ? 'warn' : 'pass',
      message:
        count > 0
          ? `${count} standings rows with zero matches predicted`
          : 'All standings rows have at least one match predicted',
      count,
    })
  }

  // Check 2: Fixture standings with points but no correct answers
  const { data: pointsNoCorrect, error: pncError } = await supabase
    .from('v2_gang_fixture_standings')
    .select('gang_id')
    .gt('points_earned', 0)
    .eq('correct_count', 0)

  if (pncError) {
    checks.push({
      name: 'Points Without Correct Answers',
      status: 'fail',
      message: `Query failed: ${pncError.message}`,
      count: 0,
    })
  } else {
    const count = pointsNoCorrect?.length ?? 0
    checks.push({
      name: 'Points Without Correct Answers',
      status: count > 0 ? 'warn' : 'pass',
      message:
        count > 0
          ? `${count} fixture standings with points but zero correct answers`
          : 'No inconsistent point/correct answer data',
      count,
    })
  }

  // Check 3: Negative points
  const { data: negPoints, error: negError } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id')
    .lt('total_points', 0)

  if (negError) {
    checks.push({
      name: 'Negative Total Points',
      status: 'fail',
      message: `Query failed: ${negError.message}`,
      count: 0,
    })
  } else {
    const count = negPoints?.length ?? 0
    checks.push({
      name: 'Negative Total Points',
      status: count > 0 ? 'fail' : 'pass',
      message:
        count > 0
          ? `${count} standings rows with negative total points`
          : 'No negative point values found',
      count,
    })
  }

  return checks
}
