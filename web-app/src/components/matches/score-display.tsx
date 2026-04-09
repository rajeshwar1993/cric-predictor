import { cn } from '@/lib/utils'
import type { FixtureTeam } from '@/lib/dal/fixtures'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScoreDisplayProps {
  /** Home team data */
  homeTeam: FixtureTeam
  /** Away team data */
  awayTeam: FixtureTeam
  /** Home team score string, e.g. "186/4" */
  homeScore: string | null
  /** Away team score string, e.g. "142/3" */
  awayScore: string | null
  /** Home team overs, e.g. 18.2 */
  homeOvers: number | null
  /** Away team overs, e.g. 15.4 */
  awayOvers: number | null
  /** ID of the team currently batting */
  battingTeamId: string | null
  /** Optional additional CSS classes */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScoreDisplay — shows both team scores prominently with the batting
 * team highlighted. Scores use Space Grotesk 700, tabular-nums, and
 * animate with a pop effect when they change.
 *
 * @see docs/stories/MTCH-002-live-scorecard.md
 */
export function ScoreDisplay({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeOvers,
  awayOvers,
  battingTeamId,
  className,
}: ScoreDisplayProps) {
  const isHomeBatting = battingTeamId === homeTeam.id

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <TeamScoreRow
        teamCode={homeTeam.code}
        teamColor={homeTeam.color}
        score={homeScore}
        overs={homeOvers}
        isBatting={isHomeBatting}
      />
      <TeamScoreRow
        teamCode={awayTeam.code}
        teamColor={awayTeam.color}
        score={awayScore}
        overs={awayOvers}
        isBatting={!isHomeBatting && battingTeamId === awayTeam.id}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function TeamScoreRow({
  teamCode,
  teamColor,
  score,
  overs,
  isBatting,
}: {
  teamCode: string
  teamColor: string
  score: string | null
  overs: number | null
  isBatting: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        isBatting && 'rounded-sm bg-lime-wash px-2 py-1',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-body-sm font-bold"
          style={{ color: teamColor }}
        >
          {teamCode}
        </span>
        {isBatting && (
          <span
            className="inline-block size-1.5 rounded-full bg-bragg-lime"
            aria-label="Currently batting"
          />
        )}
      </div>

      <div className="flex items-baseline gap-2">
        {score ? (
          <span
            key={score}
            className="font-display text-xl font-bold tabular-nums text-text-primary motion-safe:animate-score-pop"
          >
            {score}
          </span>
        ) : (
          <span className="font-display text-xl font-bold tabular-nums text-text-muted">
            &mdash;
          </span>
        )}
        {overs != null && (
          <span className="text-body-sm tabular-nums text-text-muted">
            ({overs} ov)
          </span>
        )}
      </div>
    </div>
  )
}
