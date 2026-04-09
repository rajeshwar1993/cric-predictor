import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchCard } from './match-card'
import type { UpcomingFixture } from '@/lib/dal/fixtures'

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

/**
 * Helper to create a fixture with sensible defaults.
 * The `hoursFromNow` param controls when the match starts.
 */
function makeFixture(overrides: Partial<UpcomingFixture> & { hoursFromNow?: number } = {}): UpcomingFixture {
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
    fixture: makeFixture({ hoursFromNow: 6, predictedCount: 5 }),
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
    fixture: makeFixture({ hoursFromNow: -1, predictedCount: 7 }),
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
      predictedCount: 7,
    }),
    gangId: 'gang-1',
    hasPredicted: true,
    totalMembers: 8,
  },
}

/** Shows prediction count — "5/8 predicted". */
export const WithPredictionCount: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6, predictedCount: 5 }),
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
      predictedCount: 2,
    }),
    gangId: 'gang-1',
    hasPredicted: false,
    totalMembers: 12,
  },
}
