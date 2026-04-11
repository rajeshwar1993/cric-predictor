import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getGangDetails, getMembershipStatus } from '@/lib/dal/gangs'
import {
  getGangActiveSeason,
  getGangSeasonStandings,
} from '@/lib/dal/leaderboards'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { SeasonStandingsTable } from '@/components/leaderboards/season-standings-table'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StandingsPageProps {
  params: Promise<{ groupId: string }>
}

// Dedupe the gang fetch between generateMetadata and the render path.
const getCachedGangDetails = cache(getGangDetails)

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: StandingsPageProps): Promise<Metadata> {
  const { groupId } = await params
  const gang = await getCachedGangDetails(groupId)

  return {
    title: gang ? `Standings — ${gang.name}` : 'Standings',
    description: gang
      ? `Cumulative season leaderboard for ${gang.name}`
      : 'Cumulative season leaderboard across all matches',
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * SeasonStandingsPage — shows the gang's cumulative season standings.
 *
 * Server Component that:
 * 1. Verifies auth and gang membership
 * 2. Resolves the active season for the gang
 * 3. Fetches season standings data
 * 4. Renders the standings table
 *
 * @see docs/stories/LDB-003-season-standings.md
 */
export default async function SeasonStandingsPage({
  params,
}: StandingsPageProps) {
  const { groupId } = await params

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ---------------------------------------------------------------------------
  // Membership gate — user must be approved member of this gang
  // ---------------------------------------------------------------------------
  const membership = await getMembershipStatus(groupId, user.id)

  if (!membership || membership.status !== 'approved') {
    redirect('/dashboard')
  }

  // ---------------------------------------------------------------------------
  // Active season — defaults to current active season
  // ---------------------------------------------------------------------------
  const activeSeason = await getGangActiveSeason(groupId)

  if (!activeSeason) {
    notFound()
  }

  // ---------------------------------------------------------------------------
  // Fetch season standings
  // ---------------------------------------------------------------------------
  const standings = await getGangSeasonStandings(
    groupId,
    activeSeason.seasonId,
  )

  return (
    <PageWrapper className="py-8">
      <h1 className="mb-6 font-display text-h1 font-bold uppercase tracking-tight text-text-primary">
        Season Standings — IPL 2026
      </h1>

      <SeasonStandingsTable entries={standings} currentUserId={user.id} />
    </PageWrapper>
  )
}
