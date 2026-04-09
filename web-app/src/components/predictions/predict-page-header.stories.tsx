import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictPageHeader } from './predict-page-header'
import type { FixtureWithTeams } from '@/lib/dal/fixtures'

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

function makeFixture(
  overrides: Partial<FixtureWithTeams> & { hoursFromNow?: number } = {},
): FixtureWithTeams {
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
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/PredictPageHeader',
  component: PredictPageHeader,
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
} satisfies Meta<typeof PredictPageHeader>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default — window open, no previous submission. */
export const Default: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6 }),
    predictionDeadlineMins: 45,
    isWindowOpen: true,
    lastSubmittedAt: null,
  },
}

/** Window open with previous submission. */
export const WithLastSubmitted: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 6 }),
    predictionDeadlineMins: 45,
    isWindowOpen: true,
    lastSubmittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
}

/** Window not yet open — no deadline shown. */
export const WindowNotOpen: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 24 }),
    predictionDeadlineMins: 45,
    isWindowOpen: false,
    lastSubmittedAt: null,
  },
}

/** Window locked — no deadline shown. */
export const Locked: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: -1 }),
    predictionDeadlineMins: 45,
    isWindowOpen: false,
    lastSubmittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
    }),
    predictionDeadlineMins: 30,
    isWindowOpen: true,
    lastSubmittedAt: null,
  },
}

/** Tomorrow's match. */
export const Tomorrow: Story = {
  args: {
    fixture: makeFixture({ hoursFromNow: 30, matchNumber: 3 }),
    predictionDeadlineMins: 45,
    isWindowOpen: true,
    lastSubmittedAt: null,
  },
}
