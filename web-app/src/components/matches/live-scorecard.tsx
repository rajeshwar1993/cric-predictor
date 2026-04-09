'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useLiveScores } from '@/hooks/use-live-scores'
import type { FixtureWithTeams } from '@/lib/dal/fixtures'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreDisplay } from './score-display'
import { Last6Balls } from './last-6-balls'
import { BatsmenInfo } from './batsmen-info'
import { StaleDataBadge } from './stale-data-badge'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LiveScorecardProps {
  /** The fixture with team data */
  fixture: FixtureWithTeams
  /** The gang/group ID for link generation */
  gangId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LiveScorecard — displays a detailed live scorecard for a single fixture.
 *
 * Uses the `useLiveScores` hook to poll for score updates every 15s.
 * Shows team scores, batsmen, bowler, partnership, last 6 balls,
 * current run rate, and a stale data warning when needed.
 *
 * @see docs/stories/MTCH-002-live-scorecard.md
 */
export function LiveScorecard({ fixture, gangId }: LiveScorecardProps) {
  const { data: liveScore, isLoading, error, isStale } = useLiveScores(fixture.id)

  // Loading skeleton
  if (isLoading) {
    return <LiveScorecardSkeleton />
  }

  // Error state — show minimal card with error message
  if (error && !liveScore) {
    return (
      <Card className="gap-4 rounded-[16px]">
        <ScorecardHeader matchNumber={fixture.matchNumber} />
        <p className="text-body-sm text-text-muted">
          Unable to load live scores. Retrying...
        </p>
      </Card>
    )
  }

  return (
    <Card className="gap-4 rounded-[16px]" role="region" aria-label={`Live score: ${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`}>
      {/* Header: Match info + LIVE badge + stale warning */}
      <div className="flex items-center justify-between">
        <ScorecardHeader matchNumber={fixture.matchNumber} />
        <div className="flex items-center gap-2">
          {isStale && liveScore?.last_polled_at && (
            <StaleDataBadge lastPolledAt={liveScore.last_polled_at} />
          )}
          <LiveBadge />
        </div>
      </div>

      {/* Team scores */}
      <ScoreDisplay
        homeTeam={fixture.homeTeam}
        awayTeam={fixture.awayTeam}
        homeScore={liveScore?.home_team_score ?? null}
        awayScore={liveScore?.away_team_score ?? null}
        homeOvers={liveScore?.home_team_overs ?? null}
        awayOvers={liveScore?.away_team_overs ?? null}
        battingTeamId={liveScore?.batting_team_id ?? null}
      />

      {/* Current run rate */}
      {liveScore?.current_run_rate != null && (
        <div className="text-body-sm text-text-secondary">
          <span className="font-semibold">CRR:</span>{' '}
          <span className="font-display tabular-nums">
            {liveScore.current_run_rate.toFixed(2)}
          </span>
        </div>
      )}

      {/* Last 6 balls */}
      {liveScore?.last_6_balls && (
        <Last6Balls balls={liveScore.last_6_balls} />
      )}

      {/* Batsmen info */}
      <BatsmenInfo
        strikerName={liveScore?.striker_name ?? null}
        strikerScore={liveScore?.striker_score ?? null}
        nonStrikerName={liveScore?.non_striker_name ?? null}
        nonStrikerScore={liveScore?.non_striker_score ?? null}
      />

      {/* Current bowler */}
      {liveScore?.current_bowler && (
        <div className="text-body-sm text-text-secondary">
          <span className="text-text-muted">Bowling:</span>{' '}
          {liveScore.current_bowler}
        </div>
      )}

      {/* Partnership */}
      {liveScore?.current_partnership && (
        <div className="text-body-sm text-text-secondary">
          <span className="text-text-muted">Partnership:</span>{' '}
          <span className="font-display tabular-nums">
            {liveScore.current_partnership}
          </span>
        </div>
      )}

      {/* Predictions locked indicator */}
      <Badge variant="default" className="w-fit gap-1.5">
        <Lock className="size-3" aria-hidden="true" />
        Predictions Locked
      </Badge>

      {/* CTA: View Leaderboard */}
      <Link href={`/group/${gangId}/match/${fixture.id}`} className="mt-1">
        <Button variant="secondary" size="sm" className="w-full" tabIndex={-1}>
          View Leaderboard
        </Button>
      </Link>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScorecardHeader({ matchNumber }: { matchNumber: number }) {
  return (
    <span className="text-caption text-text-muted">
      Match {matchNumber} &middot; IPL 2026
    </span>
  )
}

function LiveBadge() {
  return (
    <Badge variant="lime" className="gap-1.5">
      <span
        className="inline-block size-2 motion-safe:animate-pulse rounded-full bg-success"
        aria-hidden="true"
      />
      LIVE
    </Badge>
  )
}

function LiveScorecardSkeleton() {
  return (
    <Card className="gap-4 rounded-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-4 w-28" />
        <Skeleton variant="block" className="h-6 w-14 rounded-sm" />
      </div>
      {/* Score rows */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-5 w-10" />
          <Skeleton variant="heading" className="h-6 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-5 w-10" />
          <Skeleton variant="heading" className="h-6 w-20" />
        </div>
      </div>
      {/* CRR */}
      <Skeleton variant="text" className="h-4 w-24" />
      {/* Last 6 balls */}
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} variant="block" className="size-7 rounded-full" />
        ))}
      </div>
      {/* Batsmen */}
      <div className="flex flex-col gap-1">
        <Skeleton variant="text" className="h-4 w-36" />
        <Skeleton variant="text" className="h-4 w-32" />
      </div>
      {/* CTA */}
      <Skeleton variant="block" className="h-9 w-full rounded-md" />
    </Card>
  )
}
