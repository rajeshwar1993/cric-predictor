import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { LiveFixture } from '@/lib/dal/fixtures'
import type { FixtureLiveScore } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreDisplay } from './score-display'
import { Last6Balls } from './last-6-balls'
import { BatsmenInfo } from './batsmen-info'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Since LiveMatchesSection uses `createBrowserClient()` (Supabase) directly,
// and LiveScorecard uses the `useLiveScores` hook which also creates a
// Supabase client, we create storybook-only presentational wrappers that
// accept pre-fetched data. This mirrors the actual rendered output.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Presentational scorecard for stories (no Supabase dependency)
// ---------------------------------------------------------------------------

interface StoryScorecardProps {
  fixture: LiveFixture
  gangId: string
  liveScore: FixtureLiveScore
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

function StoryScorecard({ fixture, liveScore }: StoryScorecardProps) {
  return (
    <Card className="gap-4 rounded-[16px]" role="region" aria-label={`Live score: ${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`}>
      <div className="flex items-center justify-between">
        <ScorecardHeader matchNumber={fixture.matchNumber} />
        <div className="flex items-center gap-2">
          <LiveBadge />
        </div>
      </div>

      <ScoreDisplay
        homeTeam={fixture.homeTeam}
        awayTeam={fixture.awayTeam}
        homeScore={liveScore.home_team_score}
        awayScore={liveScore.away_team_score}
        homeOvers={liveScore.home_team_overs}
        awayOvers={liveScore.away_team_overs}
        battingTeamId={liveScore.batting_team_id}
      />

      {liveScore.current_run_rate != null && (
        <div className="text-body-sm text-text-secondary">
          <span className="font-semibold">CRR:</span>{' '}
          <span className="font-display tabular-nums">
            {liveScore.current_run_rate.toFixed(2)}
          </span>
        </div>
      )}

      {liveScore.last_6_balls && (
        <Last6Balls balls={liveScore.last_6_balls} />
      )}

      <BatsmenInfo
        strikerName={liveScore.striker_name}
        strikerScore={liveScore.striker_score}
        nonStrikerName={liveScore.non_striker_name}
        nonStrikerScore={liveScore.non_striker_score}
      />

      {liveScore.current_bowler && (
        <div className="text-body-sm text-text-secondary">
          <span className="text-text-muted">Bowling:</span>{' '}
          {liveScore.current_bowler}
        </div>
      )}

      {liveScore.current_partnership && (
        <div className="text-body-sm text-text-secondary">
          <span className="text-text-muted">Partnership:</span>{' '}
          <span className="font-display tabular-nums">
            {liveScore.current_partnership}
          </span>
        </div>
      )}

      <div className="mt-1">
        <Button variant="secondary" size="sm" className="w-full">
          View Leaderboard
        </Button>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Presentational section wrapper for stories (no Supabase dependency)
// ---------------------------------------------------------------------------

interface LiveMatchesSectionStoryProps {
  gangId: string
  initialLiveFixtures: LiveFixture[]
  /** Mock live scores keyed by fixture ID */
  liveScores: Record<string, FixtureLiveScore>
}

function LiveMatchesSectionStory({
  gangId,
  initialLiveFixtures,
  liveScores,
}: LiveMatchesSectionStoryProps) {
  if (initialLiveFixtures.length === 0) {
    return null
  }

  return (
    <section className={cn('mt-8')} aria-label="Live matches">
      <h2 className="mb-4 flex items-center gap-2 text-caption text-text-muted">
        <span
          className="inline-block size-2 animate-pulse rounded-full bg-success"
          aria-hidden="true"
        />
        LIVE
      </h2>

      <div className="flex flex-col gap-4">
        {initialLiveFixtures.map((fixture) => (
          <StoryScorecard
            key={fixture.id}
            fixture={fixture}
            gangId={gangId}
            liveScore={liveScores[fixture.id] ?? makeLiveScore({ fixture_id: fixture.id })}
          />
        ))}
      </div>
    </section>
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

const TEAM_RCB = {
  id: 'team-rcb',
  name: 'Royal Challengers Bengaluru',
  code: 'RCB',
  color: '#D4213D',
  logoUrl: null,
}

const TEAM_KKR = {
  id: 'team-kkr',
  name: 'Kolkata Knight Riders',
  code: 'KKR',
  color: '#3A225D',
  logoUrl: null,
}

function makeLiveFixture(overrides: Partial<LiveFixture> = {}): LiveFixture {
  return {
    id: 'fixture-live-1',
    leagueId: 'league-1',
    seasonId: 'season-1',
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
  title: 'Matches/LiveMatchesSection',
  component: LiveMatchesSectionStory,
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
} satisfies Meta<typeof LiveMatchesSectionStory>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Single live match. */
export const OneLiveMatch: Story = {
  args: {
    gangId: 'gang-1',
    initialLiveFixtures: [makeLiveFixture()],
    liveScores: {
      'fixture-live-1': makeLiveScore(),
    },
  },
}

/** Two concurrent live matches (rare double-header). */
export const TwoLiveMatches: Story = {
  args: {
    gangId: 'gang-1',
    initialLiveFixtures: [
      makeLiveFixture(),
      makeLiveFixture({
        id: 'fixture-live-2',
        matchNumber: 13,
        homeTeam: TEAM_RCB,
        awayTeam: TEAM_KKR,
        venueName: 'M. Chinnaswamy Stadium, Bengaluru',
      }),
    ],
    liveScores: {
      'fixture-live-1': makeLiveScore(),
      'fixture-live-2': makeLiveScore({
        fixture_id: 'fixture-live-2',
        home_team_score: '95/2',
        away_team_score: null,
        home_team_overs: 12.3,
        away_team_overs: null,
        batting_team_id: 'team-rcb',
        current_run_rate: 7.6,
        last_6_balls: '0 1 4 1 0 1',
        striker_name: 'Virat Kohli',
        striker_score: '52(38)',
        non_striker_name: 'Glenn Maxwell',
        non_striker_score: '18(14)',
        current_bowler: 'Sunil Narine',
        current_partnership: '70(52)',
      }),
    },
  },
}

/** No live matches — renders nothing. */
export const NoLiveMatches: Story = {
  args: {
    gangId: 'gang-1',
    initialLiveFixtures: [],
    liveScores: {},
  },
}
