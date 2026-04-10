import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * Aggregated profile stats returned by `getProfileStats`.
 *
 * All values are counted across every gang the user is an approved member
 * of. `accuracy` is a percentage (0–100) computed from the sum of
 * `total_correct` divided by the sum of `total_resolved`. If the user has
 * no resolved predictions yet, `accuracy` is 0.
 */
export interface ProfileStats {
  /** Count of approved gang memberships */
  gangsCount: number
  /** Total matches the user has made predictions for (sum across gangs) */
  totalPredicted: number
  /** Accuracy percentage (0–100); 0 when no resolved predictions */
  accuracy: number
  /** Total points scored across every gang */
  totalPoints: number
}

// ---------------------------------------------------------------------------
// getProfileStats
// ---------------------------------------------------------------------------

/**
 * Fetch aggregated profile stats for a user across every gang they belong to.
 *
 * Uses two queries:
 *   1. Count of approved `v2_gang_members` rows for the user.
 *   2. Season standings rows for the user (all gangs) to sum up the
 *      prediction / points aggregates.
 *
 * Handles the zero-resolved-predictions edge case by returning `accuracy: 0`
 * instead of dividing by zero.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 *
 * @see docs/stories/PRF-001-profile-page.md
 */
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await createServerClient()

  // Query 1: count of approved gang memberships
  const { count: gangsCount, error: gangsError } = await supabase
    .from('v2_gang_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved')

  if (gangsError) {
    throw new Error(`getProfileStats: ${gangsError.message}`, {
      cause: gangsError,
    })
  }

  // Query 2: aggregate season standings across every gang
  const { data: standings, error: standingsError } = await supabase
    .from('v2_gang_season_standings')
    .select('total_points, matches_predicted, total_correct, total_resolved')
    .eq('user_id', userId)

  if (standingsError) {
    throw new Error(`getProfileStats: ${standingsError.message}`, {
      cause: standingsError,
    })
  }

  const rows = standings ?? []

  const totalPoints = rows.reduce((sum, s) => sum + (s.total_points ?? 0), 0)
  const totalPredicted = rows.reduce(
    (sum, s) => sum + (s.matches_predicted ?? 0),
    0,
  )
  const totalCorrect = rows.reduce((sum, s) => sum + (s.total_correct ?? 0), 0)
  const totalResolved = rows.reduce(
    (sum, s) => sum + (s.total_resolved ?? 0),
    0,
  )
  const accuracy = totalResolved > 0 ? (totalCorrect / totalResolved) * 100 : 0

  return {
    gangsCount: gangsCount ?? 0,
    totalPredicted,
    accuracy,
    totalPoints,
  }
}
