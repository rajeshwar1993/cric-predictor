import Image from 'next/image'
import type { FixtureTeam, FixtureWithTeams } from '@/lib/dal/fixtures'
import { MatchTime } from '@/components/matches/match-time'
import { MatchDeadline } from '@/components/matches/match-deadline'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictPageHeaderProps {
  /** The fixture with team data */
  fixture: FixtureWithTeams
  /** Minutes before match start when predictions lock */
  predictionDeadlineMins: number
  /** Whether the prediction window is currently open */
  isWindowOpen: boolean
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
 * PredictPageHeader — displays match info at the top of the predict page.
 *
 * Shows match number, team badges with colors, date/time, venue,
 * prediction deadline or locked status, and last submitted timestamp.
 *
 * @see docs/stories/PRED-001-predict-page.md
 */
export function PredictPageHeader({
  fixture,
  predictionDeadlineMins,
  isWindowOpen,
}: PredictPageHeaderProps) {
  const deadlineTime = new Date(
    new Date(fixture.startDatetime).getTime() -
      predictionDeadlineMins * 60 * 1000,
  ).toISOString()

  return (
    <header className="flex flex-col items-center gap-4">
      {/* Match info */}
      <span className="text-caption text-text-muted">
        Match {fixture.matchNumber} &middot; IPL 2026
      </span>

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

      {/* Deadline indicator */}
      {isWindowOpen && (
        <MatchDeadline
          deadline={deadlineTime}
          label="Closes at"
          className="text-body-sm font-medium text-sunburst-yellow"
        />
      )}

    </header>
  )
}

