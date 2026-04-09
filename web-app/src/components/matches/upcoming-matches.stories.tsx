import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Calendar } from 'lucide-react'
import type { UpcomingFixture } from '@/lib/dal/fixtures'
import { EmptyState } from '@/components/ui/empty-state'
import { MatchCard } from './match-card'

// ---------------------------------------------------------------------------
// Since UpcomingMatches is an async server component that fetches data,
// we create a storybook-only presentational wrapper that accepts
// pre-fetched data. This mirrors the actual rendered output.
// ---------------------------------------------------------------------------

interface UpcomingMatchesStoryProps {
  fixtures: UpcomingFixture[]
  gangId: string
  totalMembers: number
  predictedFixtureIds: string[]
}

function UpcomingMatchesStory({
  fixtures,
  gangId,
  totalMembers,
  predictedFixtureIds,
}: UpcomingMatchesStoryProps) {
  const predictedSet = new Set(predictedFixtureIds)

  if (fixtures.length === 0) {
    return (
      <section className="mt-8" aria-label="Upcoming matches">
        <h2 className="text-caption text-text-muted mb-4">UPCOMING MATCHES</h2>
        <EmptyState
          icon={Calendar}
          headline="No upcoming matches"
          description="Check back later for the next fixtures."
        />
      </section>
    )
  }

  return (
    <section className="mt-8" aria-label="Upcoming matches">
      <h2 className="text-caption text-text-muted mb-4">UPCOMING MATCHES</h2>
      <div className="flex flex-col gap-4">
        {fixtures.map((fixture) => (
          <MatchCard
            key={fixture.id}
            fixture={fixture}
            gangId={gangId}
            hasPredicted={predictedSet.has(fixture.id)}
            totalMembers={totalMembers}
          />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Test data
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

const TEAM_DC = {
  id: 'team-dc',
  name: 'Delhi Capitals',
  code: 'DC',
  color: '#004C93',
  logoUrl: null,
}

const TEAM_SRH = {
  id: 'team-srh',
  name: 'Sunrisers Hyderabad',
  code: 'SRH',
  color: '#FF822A',
  logoUrl: null,
}

function makeFixture(
  overrides: Partial<UpcomingFixture> & { hoursFromNow?: number } = {},
): UpcomingFixture {
  const { hoursFromNow = 6, ...rest } = overrides
  const startTime = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)

  return {
    id: 'fixture-1',
    leagueId: 'league-1',
    seasonId: 'season-1',
    matchNumber: 1,
    startDatetime: startTime.toISOString(),
    venueName: 'Wankhede Stadium, Mumbai',
    status: 'upcoming',
    predictionDeadlineMins: 45,
    predictedCount: 3,
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/UpcomingMatches',
  component: UpcomingMatchesStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpcomingMatchesStory>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default — 3 upcoming matches. */
export const Default: Story = {
  args: {
    fixtures: [
      makeFixture({
        id: 'f-1',
        matchNumber: 1,
        hoursFromNow: 4,
        homeTeam: TEAM_MI,
        awayTeam: TEAM_CSK,
        venueName: 'Wankhede Stadium, Mumbai',
        predictedCount: 5,
      }),
      makeFixture({
        id: 'f-2',
        matchNumber: 2,
        hoursFromNow: 28,
        homeTeam: TEAM_RCB,
        awayTeam: TEAM_KKR,
        venueName: 'M. Chinnaswamy Stadium, Bengaluru',
        predictedCount: 2,
      }),
      makeFixture({
        id: 'f-3',
        matchNumber: 3,
        hoursFromNow: 52,
        homeTeam: TEAM_DC,
        awayTeam: TEAM_SRH,
        venueName: 'Arun Jaitley Stadium, Delhi',
        predictedCount: 0,
      }),
    ],
    gangId: 'gang-1',
    totalMembers: 8,
    predictedFixtureIds: ['f-1'],
  },
}

/** Empty state — no upcoming matches. */
export const Empty: Story = {
  args: {
    fixtures: [],
    gangId: 'gang-1',
    totalMembers: 8,
    predictedFixtureIds: [],
  },
}

/** Single match. */
export const OneMatch: Story = {
  args: {
    fixtures: [
      makeFixture({
        id: 'f-1',
        matchNumber: 7,
        hoursFromNow: 6,
        homeTeam: TEAM_RCB,
        awayTeam: TEAM_MI,
        venueName: 'M. Chinnaswamy Stadium, Bengaluru',
        predictedCount: 4,
      }),
    ],
    gangId: 'gang-1',
    totalMembers: 10,
    predictedFixtureIds: [],
  },
}
