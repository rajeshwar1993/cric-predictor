import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { RecentResult } from '@/lib/actions/dal-matches'
import { ResultCard } from './result-card'

const meta = {
  title: 'Matches/ResultCard',
  component: ResultCard,
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
} satisfies Meta<typeof ResultCard>

export default meta
type Story = StoryObj<typeof meta>

const resolvedResult: RecentResult = {
  fixtureId: 'fixture-1',
  matchNumber: 10,
  homeTeamCode: 'CSK',
  awayTeamCode: 'MI',
  startDatetime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'resolved',
  winnerName: 'Chennai Super Kings',
  winnerCode: 'CSK',
  homeScore: 185,
  awayScore: 162,
  userStats: {
    predictedCount: 15,
    correctCount: 9,
    pointsEarned: 42,
  },
  totalScenarios: 19,
}

export const Default: Story = {
  args: {
    gangId: 'gang-1',
    result: resolvedResult,
  },
}

export const Resolved: Story = {
  args: {
    gangId: 'gang-1',
    result: resolvedResult,
  },
}

export const Completed: Story = {
  args: {
    gangId: 'gang-1',
    result: {
      ...resolvedResult,
      status: 'completed',
      winnerName: null,
      winnerCode: null,
      userStats: {
        predictedCount: 19,
        correctCount: 0,
        pointsEarned: 0,
      },
    },
  },
}

export const Abandoned: Story = {
  args: {
    gangId: 'gang-1',
    result: {
      ...resolvedResult,
      status: 'abandoned',
      winnerName: null,
      winnerCode: null,
      homeScore: null,
      awayScore: null,
      userStats: null,
    },
  },
}

export const NoResult: Story = {
  args: {
    gangId: 'gang-1',
    result: {
      ...resolvedResult,
      status: 'no_result',
      winnerName: null,
      winnerCode: null,
      homeScore: null,
      awayScore: null,
      userStats: null,
    },
  },
}

export const NoUserStats: Story = {
  args: {
    gangId: 'gang-1',
    result: {
      ...resolvedResult,
      userStats: null,
    },
  },
}

export const PerfectScore: Story = {
  args: {
    gangId: 'gang-1',
    result: {
      ...resolvedResult,
      userStats: {
        predictedCount: 19,
        correctCount: 19,
        pointsEarned: 95,
      },
    },
  },
}
