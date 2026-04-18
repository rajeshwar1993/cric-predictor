import Link from 'next/link'
import Image from 'next/image'
import type { FixtureTeam, UpcomingFixture } from '@/lib/dal/fixtures'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PredictionStatusBadge,
  getPredictionStatus,
  type PredictionStatus,
} from './prediction-status-badge'
import { PredictionAvatars } from './prediction-avatars'
import { MatchTime } from './match-time'
import { MatchDeadline } from './match-deadline'
import { PREDICTION_WINDOW_MS } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MatchCardProps {
  /** The fixture data with team info */
  fixture: UpcomingFixture
  /** The gang/group ID for link generation */
  gangId: string
  /** Whether the current user has submitted predictions */
  hasPredicted: boolean
  /** Total approved members in the gang (denominator for "X/Y predicted") */
  totalMembers: number
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TeamDisplay({ team, align }: { team: FixtureTeam; align: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      {team.logoUrl ? (
        <Image
          src={team.logoUrl}
          alt={`${team.name} logo`}
          width={40}
          height={40}
          className="size-10 rounded-full object-contain"
        />
      ) : (
        <div
          className="flex size-10 items-center justify-center rounded-full text-caption font-bold text-text-on-primary"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        >
          {team.code.slice(0, 2)}
        </div>
      )}
      <div className={cn('flex flex-col', align === 'right' && 'items-end')}>
        <span
          className="text-h4 font-semibold text-text-primary"
          style={{ color: team.color }}
        >
          {team.code}
        </span>
        <span className="text-caption text-text-muted">{team.name}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * MatchCard — displays an upcoming/live fixture with team info,
 * timing, prediction status, and a CTA.
 *
 * The entire card is clickable:
 * - If prediction window is open → links to predict page
 * - If locked/live → links to match leaderboard
 *
 * @see docs/stories/MTCH-001-upcoming-matches.md
 */
export function MatchCard({
  fixture,
  gangId,
  hasPredicted,
  totalMembers,
}: MatchCardProps) {
  const status = getPredictionStatus(
    fixture.status,
    fixture.startDatetime,
    fixture.predictionDeadlineMins,
    hasPredicted,
  )

  // Compute deadline ISO string for display
  const deadlineTime = new Date(
    new Date(fixture.startDatetime).getTime() -
      fixture.predictionDeadlineMins * 60 * 1000,
  ).toISOString()

  // Card links to predict page if window is open, match leaderboard otherwise
  const isPredictable = status === 'predict' || status === 'predicted'
  const href = isPredictable
    ? `/group/${gangId}/predict/${fixture.id}`
    : `/group/${gangId}/match/${fixture.id}`

  return (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bragg-lime focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-black rounded-lg"
      aria-label={`${fixture.homeTeam.code} vs ${fixture.awayTeam.code} — Match ${fixture.matchNumber}`}
    >
      <Card className="cursor-pointer gap-4 rounded-lg">
        {/* Header: Match info + status badge */}
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-muted">
            Match {fixture.matchNumber} &middot; IPL 2026
          </span>
          <PredictionStatusBadge status={status} />
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-2">
          <TeamDisplay team={fixture.homeTeam} align="left" />
          <span className="text-body-sm font-bold text-text-muted">vs</span>
          <TeamDisplay team={fixture.awayTeam} align="right" />
        </div>

        {/* Date/time + venue */}
        <div className="flex flex-col gap-1">
          <MatchTime
            datetime={fixture.startDatetime}
            className="text-body-sm text-text-secondary"
          />
          <span className="text-caption text-text-muted">
            {fixture.venueName}
          </span>
        </div>

        {/* Footer: Deadline, predicted count, pills, CTA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <DeadlineDisplay status={status} deadline={deadlineTime} startDatetime={fixture.startDatetime} />
            <span className="text-caption text-text-muted">
              {fixture.predictedMembers.length}/{totalMembers} predicted
            </span>
            <PredictionAvatars members={fixture.predictedMembers} />
          </div>
          <MatchCardCTA status={status} />
        </div>
      </Card>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Sub-components (internal)
// ---------------------------------------------------------------------------

function DeadlineDisplay({
  status,
  deadline,
  startDatetime,
}: {
  status: PredictionStatus
  deadline: string
  startDatetime: string
}) {
  if (status === 'live' || status === 'locked') {
    return null
  }

  if (status === 'not_open') {
    // Window opens 12 hours before start
    const windowOpens = new Date(
      new Date(startDatetime).getTime() - PREDICTION_WINDOW_MS,
    ).toISOString()
    return (
      <MatchDeadline
        deadline={windowOpens}
        label="Opens at"
        className="text-caption text-text-muted"
      />
    )
  }

  // status === 'predict' or 'predicted' — window is open, show close time
  return (
    <MatchDeadline
      deadline={deadline}
      label="Closes at"
      className="text-caption text-text-muted"
    />
  )
}

function MatchCardCTA({ status }: { status: PredictionStatus }) {
  switch (status) {
    case 'predict':
      return (
        <Button size="sm" tabIndex={-1} aria-hidden="true">
          Predict
        </Button>
      )
    case 'predicted':
      return (
        <Button size="sm" variant="secondary" tabIndex={-1} aria-hidden="true">
          Edit
        </Button>
      )
    case 'live':
      return (
        <Button size="sm" variant="secondary" tabIndex={-1} aria-hidden="true">
          View
        </Button>
      )
    case 'locked':
      return (
        <Button size="sm" variant="secondary" tabIndex={-1} aria-hidden="true">
          View
        </Button>
      )
    case 'not_open':
      return (
        <Button size="sm" variant="ghost" disabled tabIndex={-1} aria-hidden="true">
          Coming soon
        </Button>
      )
  }
}
