import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ResultCard } from './result-card'
import type { RecentResultFixture, FixtureTeam } from '@/lib/dal/fixtures'

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

function makeFixture(overrides: Partial<RecentResultFixture> = {}): RecentResultFixture {
  return {
    id: 'fixture-1',
    leagueId: 'league-1',
    seasonId: 'season-1',
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
  title: 'Matches/ResultCard',
  component: ResultCard,
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
} satisfies Meta<typeof ResultCard>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Resolved — full results with winner, scores, and prediction summary. */
export const Resolved: Story = {
  args: {
    fixture: makeFixture(),
    gangId: 'gang-1',
  },
}

/** Completed — match done but scenarios not fully resolved. */
export const Completed: Story = {
  args: {
    fixture: makeFixture({
      status: 'completed',
      userStanding: {
        predictedCount: 5,
        correctCount: 0,
        resolvedCount: 0,
        pointsEarned: 0,
      },
    }),
    gangId: 'gang-1',
  },
}

/** Abandoned — match voided, no scores shown. */
export const Abandoned: Story = {
  args: {
    fixture: makeFixture({
      status: 'abandoned',
      matchWinnerId: null,
      homeTeamScore: null,
      awayTeamScore: null,
      userStanding: null,
    }),
    gangId: 'gang-1',
  },
}

/** NoResult — match voided (no result), no scores shown. */
export const NoResult: Story = {
  args: {
    fixture: makeFixture({
      status: 'no_result',
      matchWinnerId: null,
      homeTeamScore: null,
      awayTeamScore: null,
      userStanding: {
        predictedCount: 3,
        correctCount: 0,
        resolvedCount: 0,
        pointsEarned: 0,
      },
    }),
    gangId: 'gang-1',
  },
}

/** NotPredicted — user did not predict for this match. */
export const NotPredicted: Story = {
  args: {
    fixture: makeFixture({
      userStanding: null,
    }),
    gangId: 'gang-1',
  },
}

/** PerfectScore — all predictions correct. */
export const PerfectScore: Story = {
  args: {
    fixture: makeFixture({
      homeTeam: TEAM_RCB,
      awayTeam: TEAM_KKR,
      matchWinnerId: 'team-rcb',
      homeTeamScore: '212/3',
      awayTeamScore: '178/9',
      userStanding: {
        predictedCount: 5,
        correctCount: 5,
        resolvedCount: 5,
        pointsEarned: 25,
      },
    }),
    gangId: 'gang-1',
  },
}
