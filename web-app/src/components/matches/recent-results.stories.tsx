import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Trophy } from 'lucide-react'
import type { RecentResultFixture, FixtureTeam } from '@/lib/dal/fixtures'
import { EmptyState } from '@/components/ui/empty-state'
import { ResultCard } from './result-card'

// ---------------------------------------------------------------------------
// Since RecentResults is an async server component that fetches data,
// we create a storybook-only presentational wrapper that accepts
// pre-fetched data. This mirrors the actual rendered output.
// ---------------------------------------------------------------------------

interface RecentResultsStoryProps {
  fixtures: RecentResultFixture[]
  gangId: string
}

function RecentResultsStory({ fixtures, gangId }: RecentResultsStoryProps) {
  if (fixtures.length === 0) {
    return (
      <section className="mt-8" aria-label="Recent results">
        <h2 className="text-caption text-text-muted mb-4">RECENT RESULTS</h2>
        <EmptyState
          icon={Trophy}
          headline="No results yet"
          description="Completed matches and your predictions will show up here."
        />
      </section>
    )
  }

  return (
    <section className="mt-8" aria-label="Recent results">
      <h2 className="text-caption text-text-muted mb-4">RECENT RESULTS</h2>
      <div className="flex flex-col gap-4">
        {fixtures.map((fixture) => (
          <ResultCard
            key={fixture.id}
            fixture={fixture}
            gangId={gangId}
          />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const TEAM_MI: FixtureTeam = {
  id: 'team-mi',
  name: 'Mumbai Indians',
  code: 'MI',
  color: '#004BA0',
  logoUrl: null,
}

const TEAM_CSK: FixtureTeam = {
  id: 'team-csk',
  name: 'Chennai Super Kings',
  code: 'CSK',
  color: '#FDB913',
  logoUrl: null,
}

const TEAM_RCB: FixtureTeam = {
  id: 'team-rcb',
  name: 'Royal Challengers Bengaluru',
  code: 'RCB',
  color: '#D4213D',
  logoUrl: null,
}

const TEAM_KKR: FixtureTeam = {
  id: 'team-kkr',
  name: 'Kolkata Knight Riders',
  code: 'KKR',
  color: '#3A225D',
  logoUrl: null,
}

const TEAM_DC: FixtureTeam = {
  id: 'team-dc',
  name: 'Delhi Capitals',
  code: 'DC',
  color: '#004C93',
  logoUrl: null,
}

const TEAM_SRH: FixtureTeam = {
  id: 'team-srh',
  name: 'Sunrisers Hyderabad',
  code: 'SRH',
  color: '#FF822A',
  logoUrl: null,
}

function makeFixture(overrides: Partial<RecentResultFixture> = {}): RecentResultFixture {
  return {
    id: 'fixture-1',
    matchNumber: 5,
    startDatetime: '2026-04-08T19:30:00Z',
    venueName: 'Wankhede Stadium, Mumbai',
    status: 'resolved',
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    matchWinnerId: 'team-mi',
    homeTeamScore: '186/4',
    awayTeamScore: '183/8',
    userStanding: {
      predictedCount: 5,
      correctCount: 3,
      resolvedCount: 5,
      pointsEarned: 15,
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/RecentResults',
  component: RecentResultsStory,
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
} satisfies Meta<typeof RecentResultsStory>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default — 3 recent result cards with various states. */
export const Default: Story = {
  args: {
    fixtures: [
      makeFixture({
        id: 'f-1',
        matchNumber: 5,
        homeTeam: TEAM_MI,
        awayTeam: TEAM_CSK,
        matchWinnerId: 'team-mi',
        homeTeamScore: '186/4',
        awayTeamScore: '183/8',
        userStanding: {
          predictedCount: 5,
          correctCount: 3,
          resolvedCount: 5,
          pointsEarned: 15,
        },
      }),
      makeFixture({
        id: 'f-2',
        matchNumber: 4,
        homeTeam: TEAM_RCB,
        awayTeam: TEAM_KKR,
        matchWinnerId: 'team-kkr',
        homeTeamScore: '145/10',
        awayTeamScore: '148/3',
        userStanding: {
          predictedCount: 5,
          correctCount: 4,
          resolvedCount: 5,
          pointsEarned: 20,
        },
      }),
      makeFixture({
        id: 'f-3',
        matchNumber: 3,
        homeTeam: TEAM_DC,
        awayTeam: TEAM_SRH,
        matchWinnerId: 'team-srh',
        homeTeamScore: '170/6',
        awayTeamScore: '174/5',
        userStanding: null,
      }),
    ],
    gangId: 'gang-1',
  },
}

/** Empty — no completed matches yet. */
export const Empty: Story = {
  args: {
    fixtures: [],
    gangId: 'gang-1',
  },
}

/** Mixed statuses — resolved, completed, and abandoned. */
export const MixedStatuses: Story = {
  args: {
    fixtures: [
      makeFixture({
        id: 'f-1',
        matchNumber: 8,
        status: 'resolved',
        homeTeam: TEAM_MI,
        awayTeam: TEAM_CSK,
        matchWinnerId: 'team-csk',
        homeTeamScore: '155/9',
        awayTeamScore: '158/4',
        userStanding: {
          predictedCount: 5,
          correctCount: 2,
          resolvedCount: 5,
          pointsEarned: 10,
        },
      }),
      makeFixture({
        id: 'f-2',
        matchNumber: 7,
        status: 'completed',
        homeTeam: TEAM_RCB,
        awayTeam: TEAM_DC,
        matchWinnerId: 'team-rcb',
        homeTeamScore: '200/3',
        awayTeamScore: '165/10',
        userStanding: {
          predictedCount: 5,
          correctCount: 0,
          resolvedCount: 0,
          pointsEarned: 0,
        },
      }),
      makeFixture({
        id: 'f-3',
        matchNumber: 6,
        status: 'abandoned',
        homeTeam: TEAM_KKR,
        awayTeam: TEAM_SRH,
        matchWinnerId: null,
        homeTeamScore: null,
        awayTeamScore: null,
        userStanding: null,
      }),
    ],
    gangId: 'gang-1',
  },
}
