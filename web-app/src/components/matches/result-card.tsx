import Link from 'next/link'
import Image from 'next/image'
import type { FixtureTeam, RecentResultFixture, FixtureUserStanding } from '@/lib/dal/fixtures'
import type { MatchStatus } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatBlock } from '@/components/ui/stat-block'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ResultCardProps {
  /** The fixture data with result info and user standings */
  fixture: RecentResultFixture
  /** The gang/group ID for link generation */
  gangId: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TeamWithScore({
  team,
  score,
  isWinner,
  align,
  isVoided,
}: {
  team: FixtureTeam
  score: string | null
  isWinner: boolean
  align: 'left' | 'right'
  isVoided: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        align === 'right' && 'items-end',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={`${team.name} logo`}
            width={32}
            height={32}
            className="size-8 rounded-full object-contain"
          />
        ) : (
          <div
            className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-text-on-primary"
            style={{ backgroundColor: team.color }}
            aria-hidden="true"
          >
            {team.code.slice(0, 2)}
          </div>
        )}
        <span
          className={cn(
            'text-h4 font-semibold',
            isWinner ? 'text-text-primary' : 'text-text-muted',
          )}
          style={isWinner ? { color: team.color } : undefined}
        >
          {team.code}
        </span>
        {isWinner && (
          <span className="text-[11px] text-bragg-lime" aria-label="Winner">
            W
          </span>
        )}
      </div>
      {!isVoided && score && (
        <span
          className={cn(
            'text-body-sm font-mono',
            isWinner ? 'text-text-primary' : 'text-text-muted',
          )}
        >
          {score}
        </span>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: MatchStatus }) {
  switch (status) {
    case 'resolved':
      return <Badge variant="lime">Results</Badge>
    case 'completed':
      return <Badge variant="yellow">Results pending</Badge>
    case 'abandoned':
    case 'no_result':
      return <Badge variant="default">Match voided</Badge>
    default:
      return null
  }
}

function PredictionSummary({ standing }: { standing: FixtureUserStanding | null }) {
  if (!standing) {
    return (
      <span className="text-caption text-text-muted">
        You didn&apos;t predict
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-body-sm font-semibold text-text-primary">
          {standing.correctCount}/{standing.resolvedCount} correct
        </span>
        <span className="text-caption text-text-muted">
          You predicted {standing.predictedCount} {standing.predictedCount === 1 ? 'scenario' : 'scenarios'}
        </span>
      </div>
      <StatBlock
        size="sm"
        value={standing.pointsEarned}
        label="PTS"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ResultCard -- displays a completed/resolved/abandoned/no_result fixture
 * with final scores, winner indication, and the user's prediction summary.
 *
 * Links to the match leaderboard page.
 *
 * @see docs/stories/MTCH-003-recent-results.md
 */
export function ResultCard({ fixture, gangId }: ResultCardProps) {
  const isVoided = fixture.status === 'abandoned' || fixture.status === 'no_result'
  const homeIsWinner = fixture.matchWinnerId === fixture.homeTeam.id
  const awayIsWinner = fixture.matchWinnerId === fixture.awayTeam.id

  return (
    <Link
      href={`/group/${gangId}/match/${fixture.id}`}
      className="block rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bragg-lime focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-black"
      aria-label={`${fixture.homeTeam.code} vs ${fixture.awayTeam.code} — Match ${fixture.matchNumber} result`}
    >
      <Card className="cursor-pointer gap-4 rounded-[16px]">
        {/* Header: Match info + status badge */}
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-muted">
            Match {fixture.matchNumber} &middot; IPL 2026
          </span>
          <StatusBadge status={fixture.status} />
        </div>

        {/* Teams with scores */}
        {isVoided ? (
          <div className="flex items-center justify-between gap-2">
            <TeamWithScore
              team={fixture.homeTeam}
              score={null}
              isWinner={false}
              align="left"
              isVoided
            />
            <span className="text-body-sm font-bold text-text-muted">vs</span>
            <TeamWithScore
              team={fixture.awayTeam}
              score={null}
              isWinner={false}
              align="right"
              isVoided
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <TeamWithScore
              team={fixture.homeTeam}
              score={fixture.homeTeamScore}
              isWinner={homeIsWinner}
              align="left"
              isVoided={false}
            />
            <span className="text-body-sm font-bold text-text-muted">vs</span>
            <TeamWithScore
              team={fixture.awayTeam}
              score={fixture.awayTeamScore}
              isWinner={awayIsWinner}
              align="right"
              isVoided={false}
            />
          </div>
        )}

        {/* User's prediction summary */}
        <div className="border-t border-wire pt-3">
          <PredictionSummary standing={fixture.userStanding} />
        </div>
      </Card>
    </Link>
  )
}
