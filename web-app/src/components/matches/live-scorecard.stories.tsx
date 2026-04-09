import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Lock } from 'lucide-react'
import type { FixtureWithTeams } from '@/lib/dal/fixtures'
import type { FixtureLiveScore } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreDisplay } from './score-display'
import { Last6Balls } from './last-6-balls'
import { BatsmenInfo } from './batsmen-info'
import { StaleDataBadge } from './stale-data-badge'

// ---------------------------------------------------------------------------
// Since LiveScorecard uses the `useLiveScores` hook (which creates a Supabase
// browser client), we create a storybook-only presentational wrapper that
// accepts pre-fetched data. This mirrors the actual rendered output without
// requiring Supabase env vars.
// ---------------------------------------------------------------------------

interface LiveScorecardStoryProps {
  fixture: FixtureWithTeams
  gangId: string
  /** Mock live score data — null to show no-data state */
  liveScore: FixtureLiveScore | null
  /** Whether to show the loading skeleton */
  isLoading: boolean
  /** Whether to show the stale data badge */
  isStale: boolean
  /** Error message — when set and liveScore is null, shows error state */
  error: string | null
}

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
        className="inline-block size-2 animate-pulse rounded-full bg-success"
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

function LiveScorecardStory({
  fixture,
  gangId: _gangId,
  liveScore,
  isLoading,
  isStale,
  error,
}: LiveScorecardStoryProps) {
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
      <div className="mt-1">
        <Button variant="secondary" size="sm" className="w-full">
          View Leaderboard
        </Button>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const TEAM_MI = {
  id: 'team-mi',
  name: 'Mumbai Indians',
  code: 'MI',
  color: '#004BA0',
  logoUrl: null,
}

const TEAM_CSK = {
  id: 'team-csk',
  name: 'Chennai Super Kings',
  code: 'CSK',
  color: '#FDB913',
  logoUrl: null,
}

function makeFixture(overrides: Partial<FixtureWithTeams> = {}): FixtureWithTeams {
  return {
    id: 'fixture-live-1',
    matchNumber: 12,
    startDatetime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    venueName: 'Wankhede Stadium, Mumbai',
    status: 'live',
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    ...overrides,
  }
}

function makeLiveScore(overrides: Partial<FixtureLiveScore> = {}): FixtureLiveScore {
  return {
    fixture_id: 'fixture-live-1',
    home_team_score: '186/4',
    away_team_score: '142/3',
    home_team_overs: 20,
    away_team_overs: 15.4,
    batting_team_id: 'team-csk',
    current_run_rate: 9.1,
    last_6_balls: '1 4 W 0 6 2',
    striker_name: 'MS Dhoni',
    striker_score: '45(32)',
    non_striker_name: 'Ravindra Jadeja',
    non_striker_score: '23(18)',
    current_bowler: 'Jasprit Bumrah',
    current_partnership: '68(42)',
    raw_scorecard_json: null,
    last_polled_at: new Date().toISOString(),
    home_team_max_overs_seen: 20,
    away_team_max_overs_seen: 15.4,
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/LiveScorecard',
  component: LiveScorecardStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LiveScorecardStory>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** First innings — home team batting, away yet to bat. */
export const FirstInnings: Story = {
  args: {
    fixture: makeFixture(),
    gangId: 'gang-1',
    isLoading: false,
    isStale: false,
    error: null,
    liveScore: makeLiveScore({
      home_team_score: '186/4',
      away_team_score: null,
      home_team_overs: 20,
      away_team_overs: null,
      batting_team_id: 'team-mi',
      current_run_rate: 9.3,
      last_6_balls: '1 4 0 0 6 2',
      striker_name: 'Rohit Sharma',
      striker_score: '78(52)',
      non_striker_name: 'Suryakumar Yadav',
      non_striker_score: '45(30)',
      current_bowler: 'Deepak Chahar',
      current_partnership: '123(82)',
    }),
  },
}

/** Second innings — chase scenario. */
export const SecondInnings: Story = {
  args: {
    fixture: makeFixture({ matchNumber: 15 }),
    gangId: 'gang-1',
    isLoading: false,
    isStale: false,
    error: null,
    liveScore: makeLiveScore({
      fixture_id: 'fixture-live-1',
      home_team_score: '186/4',
      away_team_score: '142/3',
      home_team_overs: 20,
      away_team_overs: 15.4,
      batting_team_id: 'team-csk',
      current_run_rate: 9.1,
      last_6_balls: '1 4 W 0 6 2',
      striker_name: 'MS Dhoni',
      striker_score: '45(32)',
      non_striker_name: 'Ravindra Jadeja',
      non_striker_score: '23(18)',
      current_bowler: 'Jasprit Bumrah',
      current_partnership: '68(42)',
    }),
  },
}

/** Match ending — close finish. */
export const MatchEnding: Story = {
  args: {
    fixture: makeFixture({ matchNumber: 20 }),
    gangId: 'gang-1',
    isLoading: false,
    isStale: false,
    error: null,
    liveScore: makeLiveScore({
      home_team_score: '175/6',
      away_team_score: '170/8',
      home_team_overs: 20,
      away_team_overs: 19.4,
      batting_team_id: 'team-csk',
      current_run_rate: 8.65,
      last_6_balls: '1 0 4 W 2 1',
      striker_name: 'Dwayne Bravo',
      striker_score: '12(8)',
      non_striker_name: 'Deepak Chahar',
      non_striker_score: '3(5)',
      current_bowler: 'Jasprit Bumrah',
      current_partnership: '15(13)',
    }),
  },
}

/** Stale data — last_polled_at > 1 minute ago. */
export const StaleData: Story = {
  args: {
    fixture: makeFixture({ matchNumber: 8 }),
    gangId: 'gang-1',
    isLoading: false,
    isStale: true,
    error: null,
    liveScore: makeLiveScore({
      last_polled_at: new Date(Date.now() - 3 * 60_000).toISOString(),
    }),
  },
}

/** Loading state — skeleton while data loads. */
export const Loading: Story = {
  args: {
    fixture: makeFixture(),
    gangId: 'gang-1',
    isLoading: true,
    isStale: false,
    error: null,
    liveScore: null,
  },
}

/** No data available. */
export const NoData: Story = {
  args: {
    fixture: makeFixture({ id: 'fixture-no-data' }),
    gangId: 'gang-1',
    isLoading: false,
    isStale: false,
    error: 'No live data available',
    liveScore: null,
  },
}
