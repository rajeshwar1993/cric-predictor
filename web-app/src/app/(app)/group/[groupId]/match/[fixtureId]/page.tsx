import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getFixtureWithTeams } from '@/lib/dal/fixtures'
import { getMembershipStatus, getGangDetails } from '@/lib/dal/gangs'
import { getGangLeagueSeason, getMatchPredictions } from '@/lib/dal/predictions'
import { getMatchLeaderboard } from '@/lib/dal/leaderboards'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { MatchLeaderboardHeader } from '@/components/leaderboards/match-leaderboard-header'
import { MatchLeaderboardLive } from '@/components/leaderboards/match-leaderboard-live'
import { PredictionRevealLive } from '@/components/leaderboards/prediction-reveal-live'
import { LeaderboardCountdownWithRefresh } from '@/components/leaderboards/leaderboard-countdown-with-refresh'
import { LiveScorecard } from '@/components/matches/live-scorecard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchPageProps {
  params: Promise<{ groupId: string; fixtureId: string }>
}

// ---------------------------------------------------------------------------
// Gating logic
// ---------------------------------------------------------------------------

/**
 * Determine whether predictions are locked for this fixture.
 *
 * Locked means: fixture is not 'upcoming', OR the prediction deadline has passed.
 * When locked, the leaderboard is visible.
 */
function isPredictionsLocked(
  fixtureStatus: string,
  startDatetime: string,
  predictionDeadlineMins: number,
): boolean {
  if (fixtureStatus !== 'upcoming') return true

  const now = new Date()
  const startTime = new Date(startDatetime)
  const deadline = new Date(
    startTime.getTime() - predictionDeadlineMins * 60 * 1000,
  )

  return now >= deadline
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { fixtureId } = await params
  const fixture = await getFixtureWithTeams(fixtureId)

  if (!fixture) {
    return { title: 'Leaderboard' }
  }

  const matchLabel = `${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`

  return {
    title: `Leaderboard — ${matchLabel}`,
    description: `Match leaderboard for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * MatchLeaderboardPage — shows the gang's ranked standings for a specific match.
 *
 * Server Component that:
 * 1. Verifies auth and gang membership
 * 2. Validates the fixture belongs to the gang's active season
 * 3. Determines if predictions are locked
 * 4. Fetches match leaderboard data
 * 5. Renders match header, live scorecard (if live), and gated leaderboard
 *
 * @see docs/stories/LDB-001-match-leaderboard.md
 */
export default async function MatchLeaderboardPage({
  params,
}: MatchPageProps) {
  const { groupId, fixtureId } = await params

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
  // Gang league season — needed for deadline and fixture validation
  // ---------------------------------------------------------------------------
  const gangSeason = await getGangLeagueSeason(groupId)

  if (!gangSeason) {
    notFound()
  }

  // ---------------------------------------------------------------------------
  // Fixture validation — must exist and belong to the gang's active season
  // ---------------------------------------------------------------------------
  const fixture = await getFixtureWithTeams(fixtureId)

  if (!fixture) {
    notFound()
  }

  if (
    fixture.leagueId !== gangSeason.leagueId ||
    fixture.seasonId !== gangSeason.seasonId
  ) {
    notFound()
  }

  // ---------------------------------------------------------------------------
  // Gating logic
  // ---------------------------------------------------------------------------
  const isLive = fixture.status === 'live'
  const locked = isPredictionsLocked(
    fixture.status,
    fixture.startDatetime,
    gangSeason.predictionDeadlineMins,
  )

  // Compute the deadline time for the countdown
  const deadlineTime = new Date(
    new Date(fixture.startDatetime).getTime() -
      gangSeason.predictionDeadlineMins * 60 * 1000,
  ).toISOString()

  // ---------------------------------------------------------------------------
  // Fetch leaderboard + prediction reveal data (only when locked) + gang details
  // ---------------------------------------------------------------------------
  const [leaderboardEntries, revealData, gangDetails] = locked
    ? await Promise.all([
        getMatchLeaderboard(groupId, fixtureId),
        getMatchPredictions(groupId, fixtureId),
        getGangDetails(groupId),
      ])
    : [[], null, null]

  // Derive gang metadata for the share card
  const gangName = gangDetails?.name
  const approvedMemberCount = gangDetails?.members.filter(
    (m) => m.status === 'approved',
  ).length ?? 0
  const matchTitle = `${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`

  return (
    <PageWrapper className="py-8">
      {/* Match header */}
      <MatchLeaderboardHeader fixture={fixture} isLive={isLive} />

      {/* Live scorecard (only during live matches) */}
      {isLive && (
        <div className="mt-6">
          <LiveScorecard fixture={fixture} gangId={groupId} />
        </div>
      )}

      {/* Gated leaderboard */}
      {locked ? (
        <div className="mt-8 flex flex-col gap-8">
          {/* Match leaderboard with live polling wrapper */}
          <MatchLeaderboardLive
            gangId={groupId}
            fixtureId={fixtureId}
            isLive={isLive}
            initialEntries={leaderboardEntries}
            currentUserId={user.id}
            fixtureStatus={fixture.status}
            gangName={gangName}
            memberCount={approvedMemberCount}
            matchTitle={matchTitle}
            matchNumber={fixture.matchNumber}
          />

          {/* Prediction reveal table with live polling wrapper */}
          {revealData && (
            <PredictionRevealLive
              gangId={groupId}
              fixtureId={fixtureId}
              isLive={isLive}
              initialData={revealData}
              currentUserId={user.id}
            />
          )}
        </div>
      ) : (
        <div className="mt-8">
          <LeaderboardCountdownWithRefresh deadline={deadlineTime} />
        </div>
      )}
    </PageWrapper>
  )
}
