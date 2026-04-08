import Link from 'next/link'
import { getLiveFixturesForGang } from '@/lib/actions/dal-matches'
import { Button } from '@/components/ui/button'
import { LiveScorecard, type LiveScoreData, type TeamInfo } from './live-scorecard'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LiveMatchesSectionProps {
  gangId: string
}

// ---------------------------------------------------------------------------
// Server Component
// ---------------------------------------------------------------------------

export async function LiveMatchesSection({ gangId }: LiveMatchesSectionProps) {
  const liveFixtures = await getLiveFixturesForGang(gangId)

  if (liveFixtures.length === 0) {
    return null
  }

  return (
    <section aria-label="Live matches" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Live Matches
      </h2>

      <div className="flex flex-col gap-[var(--sp-3)]">
        {liveFixtures.map((fixture) => {
          const homeTeam: TeamInfo = {
            teamId: fixture.homeTeamId,
            code: fixture.homeTeamCode,
            name: fixture.homeTeamName,
          }
          const awayTeam: TeamInfo = {
            teamId: fixture.awayTeamId,
            code: fixture.awayTeamCode,
            name: fixture.awayTeamName,
          }

          const initialScoreData: LiveScoreData | null =
            fixture.liveScore !== null
              ? {
                  homeTeamScore: fixture.liveScore.homeTeamScore,
                  awayTeamScore: fixture.liveScore.awayTeamScore,
                  homeTeamOvers: fixture.liveScore.homeTeamOvers,
                  awayTeamOvers: fixture.liveScore.awayTeamOvers,
                  battingTeamId: fixture.liveScore.battingTeamId,
                  currentRunRate: fixture.liveScore.currentRunRate,
                  last6Balls: fixture.liveScore.last6Balls,
                  strikerName: fixture.liveScore.strikerName,
                  strikerScore: fixture.liveScore.strikerScore,
                  nonStrikerName: fixture.liveScore.nonStrikerName,
                  nonStrikerScore: fixture.liveScore.nonStrikerScore,
                  currentBowler: fixture.liveScore.currentBowler,
                  currentPartnership: fixture.liveScore.currentPartnership,
                  lastPolledAt: fixture.liveScore.lastPolledAt,
                }
              : null

          return (
            <div key={fixture.fixtureId} className="flex flex-col gap-[var(--sp-2)]">
              <LiveScorecard
                fixtureId={fixture.fixtureId}
                initialScoreData={initialScoreData}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
              />
              <Link href={`/group/${gangId}/match/${fixture.fixtureId}`} tabIndex={-1}>
                <Button
                  variant="secondary"
                  className="w-full"
                  aria-label={`View match leaderboard for ${fixture.homeTeamCode} vs ${fixture.awayTeamCode}`}
                >
                  View Match Leaderboard
                </Button>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
