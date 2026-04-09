import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ScoreDisplay } from './score-display'

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

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/ScoreDisplay',
  component: ScoreDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', width: '100%', padding: '24px', background: '#1A1A1A', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScoreDisplay>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** First innings — home team batting, away score is a dash. */
export const FirstInnings: Story = {
  args: {
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    homeScore: '186/4',
    awayScore: null,
    homeOvers: 20,
    awayOvers: null,
    battingTeamId: 'team-mi',
  },
}

/** Second innings — both teams have scored, away team batting. */
export const SecondInnings: Story = {
  args: {
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    homeScore: '186/4',
    awayScore: '142/3',
    homeOvers: 20,
    awayOvers: 15.4,
    battingTeamId: 'team-csk',
  },
}

/** Both scores null — match just started, neither team has faced a ball. */
export const BothNull: Story = {
  args: {
    homeTeam: TEAM_MI,
    awayTeam: TEAM_CSK,
    homeScore: null,
    awayScore: null,
    homeOvers: null,
    awayOvers: null,
    battingTeamId: null,
  },
}
