import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchLeaderboardTable } from './match-leaderboard-table'

const meta = {
  title: 'Leaderboards/MatchLeaderboardTable',
  component: MatchLeaderboardTable,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 480, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatchLeaderboardTable>

export default meta
type Story = StoryObj<typeof meta>

const mockEntries = [
  {
    userId: 'user-1',
    displayName: 'Virat',
    rank: 1,
    predictedCount: 19,
    resolvedCount: 12,
    correctCount: 9,
    pointsEarned: 45,
    memberStatus: 'approved' as const,
  },
  {
    userId: 'user-2',
    displayName: 'Rohit',
    rank: 2,
    predictedCount: 18,
    resolvedCount: 12,
    correctCount: 7,
    pointsEarned: 35,
    memberStatus: 'approved' as const,
  },
  {
    userId: 'user-3',
    displayName: 'Hardik',
    rank: 3,
    predictedCount: 15,
    resolvedCount: 12,
    correctCount: 6,
    pointsEarned: 28,
    memberStatus: 'approved' as const,
  },
  {
    userId: 'user-4',
    displayName: 'Jasprit',
    rank: 4,
    predictedCount: 19,
    resolvedCount: 12,
    correctCount: 5,
    pointsEarned: 22,
    memberStatus: 'approved' as const,
  },
  {
    userId: 'user-5',
    displayName: 'KL Rahul',
    rank: 5,
    predictedCount: 10,
    resolvedCount: 8,
    correctCount: 3,
    pointsEarned: 12,
    memberStatus: 'approved' as const,
  },
]

export const Default: Story = {
  args: {
    entries: mockEntries,
    currentUserId: 'user-2',
  },
}

export const CurrentUserFirst: Story = {
  args: {
    entries: mockEntries,
    currentUserId: 'user-1',
  },
}

export const WithLeftMember: Story = {
  args: {
    entries: [
      ...mockEntries,
      {
        userId: 'user-6',
        displayName: 'Suresh',
        rank: 6,
        predictedCount: 5,
        resolvedCount: 5,
        correctCount: 1,
        pointsEarned: 5,
        memberStatus: 'left' as const,
      },
      {
        userId: 'user-7',
        displayName: 'Amit',
        rank: 7,
        predictedCount: 3,
        resolvedCount: 3,
        correctCount: 0,
        pointsEarned: 0,
        memberStatus: 'removed' as const,
      },
    ],
    currentUserId: 'user-2',
  },
}

export const Empty: Story = {
  args: {
    entries: [],
    currentUserId: 'user-1',
  },
}

const singleEntry = mockEntries[0]

export const SingleEntry: Story = {
  args: {
    entries: singleEntry !== undefined ? [singleEntry] : [],
    currentUserId: 'user-1',
  },
}
