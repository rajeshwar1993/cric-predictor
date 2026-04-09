import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type ProfileRow = Pick<
  Database['public']['Tables']['v2_profiles']['Row'],
  'display_name' | 'avatar_url'
>

/**
 * Shape returned by `getGangSeasonStandings` — one entry per member in the standings.
 */
export interface GangStandingEntry {
  userId: string
  totalPoints: number
  matchesPredicted: number
  accuracyPct: number
  rank: number | null
  displayName: string | null
  avatarUrl: string | null
}

/**
 * Shape returned by `getGangActiveSeason`.
 */
export interface GangActiveSeason {
  seasonId: string
  leagueId: string
}

// ---------------------------------------------------------------------------
// getGangSeasonStandings
// ---------------------------------------------------------------------------

/**
 * Fetch season standings for a gang, joined with profile data.
 *
 * Ordered by rank ascending (nulls last — unranked members at the bottom).
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangSeasonStandings(
  gangId: string,
  seasonId: string,
): Promise<GangStandingEntry[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_season_standings')
    .select(
      `
      user_id, total_points, matches_predicted, accuracy_pct, rank,
      v2_profiles (display_name, avatar_url)
    `,
    )
    .eq('gang_id', gangId)
    .eq('season_id', seasonId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) throw error
  if (!data || data.length === 0) return []

  return data.map((row) => {
    const profile = row.v2_profiles as unknown as ProfileRow | null

    return {
      userId: row.user_id,
      totalPoints: row.total_points,
      matchesPredicted: row.matches_predicted,
      accuracyPct: row.accuracy_pct,
      rank: row.rank,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// getGangActiveSeason
// ---------------------------------------------------------------------------

/**
 * Get the active season for a gang from `v2_gang_league_seasons`.
 *
 * Returns the first active enrollment found, or null if none exists.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangActiveSeason(
  gangId: string,
): Promise<GangActiveSeason | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_league_seasons')
    .select('season_id, league_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    seasonId: data.season_id,
    leagueId: data.league_id,
  }
}
