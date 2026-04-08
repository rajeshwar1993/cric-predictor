import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LiveScorecard, type LiveScoreData, type TeamInfo } from './live-scorecard'

const homeTeam: TeamInfo = {
  teamId: 'team-home-1',
  code: 'CSK',
  name: 'Chennai Super Kings',
}

const awayTeam: TeamInfo = {
  teamId: 'team-away-1',
  code: 'MI',
  name: 'Mumbai Indians',
}

const fullScoreData: LiveScoreData = {
  homeTeamScore: '185/4',
  awayTeamScore: '92/3',
  homeTeamOvers: 20,
  awayTeamOvers: 10.3,
  battingTeamId: 'team-away-1',
  currentRunRate: 8.76,
  last6Balls: '1,4,W,0,6,2',
  strikerName: 'R Sharma',
  strikerScore: '42 (28)',
  nonStrikerName: 'S Iyer',
  nonStrikerScore: '18 (15)',
  currentBowler: 'D Chahar 2-0-18-1',
  currentPartnership: '38 (24)',
  lastPolledAt: new Date().toISOString(),
}

const meta = {
  title: 'Matches/LiveScorecard',
  component: LiveScorecard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LiveScorecard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    fixtureId: 'fixture-1',
    initialScoreData: fullScoreData,
    homeTeam,
    awayTeam,
  },
}

export const FirstInnings: Story = {
  args: {
    fixtureId: 'fixture-2',
    initialScoreData: {
      homeTeamScore: '142/6',
      awayTeamScore: null,
      homeTeamOvers: 16.2,
      awayTeamOvers: null,
      battingTeamId: 'team-home-1',
      currentRunRate: 8.69,
      last6Balls: '0,0,4,1,6,0',
      strikerName: 'MS Dhoni',
      strikerScore: '35 (18)',
      nonStrikerName: 'R Jadeja',
      nonStrikerScore: '22 (16)',
      currentBowler: 'J Bumrah 3-0-28-2',
      currentPartnership: '52 (30)',
      lastPolledAt: new Date().toISOString(),
    },
    homeTeam,
    awayTeam,
  },
}

export const StaleData: Story = {
  args: {
    fixtureId: 'fixture-3',
    initialScoreData: {
      ...fullScoreData,
      lastPolledAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    },
    homeTeam,
    awayTeam,
  },
}

export const MinimalData: Story = {
  args: {
    fixtureId: 'fixture-4',
    initialScoreData: {
      homeTeamScore: '12/0',
      awayTeamScore: null,
      homeTeamOvers: 1.4,
      awayTeamOvers: null,
      battingTeamId: 'team-home-1',
      currentRunRate: 7.2,
      last6Balls: '1,0,4',
      strikerName: 'R Gaikwad',
      strikerScore: '8 (6)',
      nonStrikerName: null,
      nonStrikerScore: null,
      currentBowler: null,
      currentPartnership: null,
      lastPolledAt: new Date().toISOString(),
    },
    homeTeam,
    awayTeam,
  },
}

export const NoScoreData: Story = {
  args: {
    fixtureId: 'fixture-5',
    initialScoreData: null,
    homeTeam,
    awayTeam,
  },
}

export const AllBallTypes: Story = {
  args: {
    fixtureId: 'fixture-6',
    initialScoreData: {
      ...fullScoreData,
      last6Balls: '0,1,4,6,W,WD',
    },
    homeTeam,
    awayTeam,
  },
}
