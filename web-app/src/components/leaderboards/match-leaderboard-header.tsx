import Image from 'next/image'
import type { FixtureTeam, FixtureWithTeams } from '@/lib/dal/fixtures'
import { MatchTime } from '@/components/matches/match-time'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MatchLeaderboardHeaderProps {
  /** The fixture with team data */
  fixture: FixtureWithTeams
  /** Whether the fixture is currently live */
  isLive: boolean
  /** Season label displayed next to the match number (e.g., "IPL 2026") */
  seasonLabel?: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TeamBadge({ team }: { team: FixtureTeam }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {team.logoUrl ? (
        <Image
          src={team.logoUrl}
          alt={`${team.name} logo`}
          width={56}
          height={56}
          className="size-14 rounded-full object-contain"
        />
      ) : (
        <div
          className="flex size-14 items-center justify-center rounded-full font-display text-lg font-bold text-text-on-primary"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        >
          {team.code.slice(0, 3)}
        </div>
      )}
      <div className="flex flex-col items-center">
        <span
          className="font-display text-h3 font-semibold"
          style={{ color: team.color }}
        >
          {team.code}
        </span>
        <span className="text-center text-caption text-text-muted">
          {team.name}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * MatchLeaderboardHeader — displays match info at the top of the leaderboard page.
 *
 * Shows match number, team badges with colors, date/time, venue, and a LIVE badge
 * when the fixture is live.
 *
 * @see docs/stories/LDB-001-match-leaderboard.md
 */
export function MatchLeaderboardHeader({
  fixture,
  isLive,
  seasonLabel = 'IPL 2026',
}: MatchLeaderboardHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4">
      {/* Match info + LIVE badge */}
      <div className="flex items-center gap-2">
        <span className="text-caption text-text-muted">
          Match {fixture.matchNumber} &middot; {seasonLabel}
        </span>
        {isLive && (
          <Badge variant="lime" className="gap-1.5">
            <span
              className="inline-block size-2 motion-safe:animate-pulse rounded-full bg-success"
              aria-hidden="true"
            />
            LIVE
          </Badge>
        )}
      </div>

      {/* Teams */}
      <div className="flex w-full items-center justify-center gap-6">
        <TeamBadge team={fixture.homeTeam} />
        <span className="font-display text-h3 font-bold text-text-muted">
          vs
        </span>
        <TeamBadge team={fixture.awayTeam} />
      </div>

      {/* Date/time + venue */}
      <div className="flex flex-col items-center gap-1">
        <MatchTime
          datetime={fixture.startDatetime}
          className="text-body-sm text-text-secondary"
        />
        <span className="text-caption text-text-muted">{fixture.venueName}</span>
      </div>
    </header>
  )
}
