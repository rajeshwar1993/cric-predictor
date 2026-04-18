import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchCard } from './match-card'
import type { UpcomingFixture, PredictedMember } from '@/lib/dal/fixtures'

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

// ---------------------------------------------------------------------------
// Predicted members test data
// ---------------------------------------------------------------------------

const MEMBER_NAMES = [
  'Rajesh Kumar',
  'Virat Kohli',
  'MS Dhoni',
  'Rohit Sharma',
  'Jasprit Bumrah',
  'Rishabh Pant',
  'KL Rahul',
  'Hardik Pandya',
]

function makeMembers(count: number): PredictedMember[] {
  return MEMBER_NAMES.slice(0, count).map((name, i) => ({
    userId: `user-${i + 1}`,
    displayName: name,
  }))
}

/**
 * Helper to create a fixture with sensible defaults.
 * The `hoursFromNow` param controls when the match starts.
 * `memberCount` controls how many predictedMembers to generate.
 */
function makeFixture(
  overrides: Partial<UpcomingFixture> & { hoursFromNow?: number; memberCount?: number } = {},
): UpcomingFixture {
  const { hoursFromNow = 6, memberCount = 3, ...rest } = overrides
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
    predictedMembers: makeMembers(memberCount),
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/MatchCard',
  component: MatchCard,
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
} satisfies Meta<typeof MatchCard>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default — prediction window open, not yet predicted. */
export const Upcoming: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6 }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 8,
  },
}

/** User has submitted predictions. */
export const Predicted: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6, memberCount: 5 }),
    gangId: 'gang-1',
    hasPredicted: true,
    totalMembers: 8,
  },
}

/** Window not yet open (>12h before match). */
export const LockedPreDeadline: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 24 }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 8,
  },
}

/** Deadline passed — predictions locked. */
export const Locked: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: -1, memberCount: 7 }),
    gangId: 'gang-1',
    hasPredicted: true,
    totalMembers: 8,
  },
}

/** Match in progress — LIVE badge with pulsing dot. */
export const Live: Story = {
  args: {
    fixture: makeFixture({
      hoursFromNow: -1,
      status: 'live',
      memberCount: 7,
    }),
    gangId: 'gang-1',
    hasPredicted: true,
    totalMembers: 8,
  },
}

/** Shows prediction count and avatar pills — "5/8 predicted" + 4 pills + "+1". */
export const WithPredictionCount: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6, memberCount: 5 }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 8,
  },
}

/** Match scheduled for today. */
export const Today: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 4 }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 10,
  },
}

/** Match scheduled for tomorrow. */
export const Tomorrow: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 30 }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 10,
  },
}

/** Different teams — RCB vs KKR. */
export const DifferentTeams: Story = {
  args: {
    fixture: makeFixture({
      hoursFromNow: 8,
      matchNumber: 5,
      homeTeam: TEAM_RCB,
      awayTeam: TEAM_KKR,
      venueName: 'M. Chinnaswamy Stadium, Bengaluru',
      memberCount: 2,
    }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 12,
  },
}

/** Many predictions — shows 4 avatars + "+4" overflow pill. */
export const WithManyPredictions: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6, memberCount: 8 }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 10,
  },
}
