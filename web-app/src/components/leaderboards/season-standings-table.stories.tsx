import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SeasonStandingsTable } from './season-standings-table'
import type { GangStandingEntry } from '@/lib/dal/leaderboards'

const meta = {
  title: 'Leaderboards/SeasonStandingsTable',
  component: SeasonStandingsTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[720px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeasonStandingsTable>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<GangStandingEntry> & { userId: string },
): GangStandingEntry {
  return {
    totalPoints: 100,
    matchesPredicted: 12,
    accuracyPct: 70.0,
    pointsPerMatch: 8.3,
    rank: 1,
    displayName: 'Player',
    avatarUrl: null,
    memberStatus: 'approved',
    ...overrides,
  }
}

const CURRENT_USER_ID = 'user-4'

const eightMembers: GangStandingEntry[] = [
  makeEntry({
    userId: 'user-1',
    rank: 1,
    displayName: 'Rajesh K',
    totalPoints: 156,
    matchesPredicted: 18,
    accuracyPct: 85.5,
    pointsPerMatch: 8.7,
  }),
  makeEntry({
    userId: 'user-2',
    rank: 2,
    displayName: 'Virat K',
    totalPoints: 142,
    matchesPredicted: 17,
    accuracyPct: 82.3,
    pointsPerMatch: 8.4,
  }),
  makeEntry({
    userId: 'user-3',
    rank: 3,
    displayName: 'MS Dhoni',
    totalPoints: 138,
    matchesPredicted: 18,
    accuracyPct: 78.2,
    pointsPerMatch: 7.7,
  }),
  makeEntry({
    userId: CURRENT_USER_ID,
    rank: 4,
    displayName: 'You',
    totalPoints: 126,
    matchesPredicted: 16,
    accuracyPct: 74.5,
    pointsPerMatch: 7.9,
  }),
  makeEntry({
    userId: 'user-5',
    rank: 5,
    displayName: 'Rohit S',
    totalPoints: 110,
    matchesPredicted: 15,
    accuracyPct: 68.0,
    pointsPerMatch: 7.3,
  }),
  makeEntry({
    userId: 'user-6',
    rank: 6,
    displayName: 'Jasprit B',
    totalPoints: 98,
    matchesPredicted: 14,
    accuracyPct: 64.2,
    pointsPerMatch: 7.0,
  }),
  makeEntry({
    userId: 'user-7',
    rank: 7,
    displayName: 'KL Rahul',
    totalPoints: 82,
    matchesPredicted: 12,
    accuracyPct: 58.5,
    pointsPerMatch: 6.8,
  }),
  makeEntry({
    userId: 'user-8',
    rank: 8,
    displayName: 'Hardik P',
    totalPoints: 64,
    matchesPredicted: 10,
    accuracyPct: 52.0,
    pointsPerMatch: 6.4,
  }),
]

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

/** Default — 8 members with varied stats */
export const Default: Story = {
  args: {
    entries: eightMembers,
    currentUserId: CURRENT_USER_ID,
  },
}

/** Current user is #1 */
export const TopRanked: Story = {
  args: {
    entries: [
      makeEntry({
        userId: CURRENT_USER_ID,
        rank: 1,
        displayName: 'You',
        totalPoints: 156,
        matchesPredicted: 18,
        accuracyPct: 85.5,
        pointsPerMatch: 8.7,
      }),
      makeEntry({
        userId: 'user-2',
        rank: 2,
        displayName: 'Virat K',
        totalPoints: 142,
        matchesPredicted: 17,
        accuracyPct: 82.3,
        pointsPerMatch: 8.4,
      }),
      makeEntry({
        userId: 'user-3',
        rank: 3,
        displayName: 'MS Dhoni',
        totalPoints: 138,
        matchesPredicted: 18,
        accuracyPct: 78.2,
        pointsPerMatch: 7.7,
      }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Two members sharing rank 2 */
export const WithTies: Story = {
  args: {
    entries: [
      makeEntry({
        userId: 'user-1',
        rank: 1,
        displayName: 'Rajesh K',
        totalPoints: 156,
        matchesPredicted: 18,
        accuracyPct: 85.5,
        pointsPerMatch: 8.7,
      }),
      makeEntry({
        userId: 'user-2',
        rank: 2,
        displayName: 'Virat K',
        totalPoints: 142,
        matchesPredicted: 17,
        accuracyPct: 82.3,
        pointsPerMatch: 8.4,
      }),
      makeEntry({
        userId: 'user-3',
        rank: 2,
        displayName: 'MS Dhoni',
        totalPoints: 142,
        matchesPredicted: 18,
        accuracyPct: 78.2,
        pointsPerMatch: 7.9,
      }),
      makeEntry({
        userId: CURRENT_USER_ID,
        rank: 4,
        displayName: 'You',
        totalPoints: 126,
        matchesPredicted: 16,
        accuracyPct: 74.5,
        pointsPerMatch: 7.9,
      }),
      makeEntry({
        userId: 'user-5',
        rank: 5,
        displayName: 'Rohit S',
        totalPoints: 110,
        matchesPredicted: 15,
        accuracyPct: 68.0,
        pointsPerMatch: 7.3,
      }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Grayed out departed members at bottom */
export const DepartedMembers: Story = {
  args: {
    entries: [
      makeEntry({
        userId: 'user-1',
        rank: 1,
        displayName: 'Rajesh K',
        totalPoints: 156,
        matchesPredicted: 18,
        accuracyPct: 85.5,
        pointsPerMatch: 8.7,
      }),
      makeEntry({
        userId: CURRENT_USER_ID,
        rank: 2,
        displayName: 'You',
        totalPoints: 142,
        matchesPredicted: 17,
        accuracyPct: 82.3,
        pointsPerMatch: 8.4,
      }),
      makeEntry({
        userId: 'user-3',
        rank: 3,
        displayName: 'MS Dhoni',
        totalPoints: 138,
        matchesPredicted: 18,
        accuracyPct: 78.2,
        pointsPerMatch: 7.7,
      }),
      makeEntry({
        userId: 'user-left',
        rank: 4,
        displayName: 'Left Player',
        totalPoints: 90,
        matchesPredicted: 10,
        accuracyPct: 60.0,
        pointsPerMatch: 9.0,
        memberStatus: 'left',
      }),
      makeEntry({
        userId: 'user-removed',
        rank: 5,
        displayName: 'Removed Player',
        totalPoints: 45,
        matchesPredicted: 6,
        accuracyPct: 40.0,
        pointsPerMatch: 7.5,
        memberStatus: 'removed',
      }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Empty state — no predictions yet */
export const Empty: Story = {
  args: {
    entries: [],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Just the admin */
export const SingleMember: Story = {
  args: {
    entries: [
      makeEntry({
        userId: CURRENT_USER_ID,
        rank: 1,
        displayName: 'You',
        totalPoints: 42,
        matchesPredicted: 5,
        accuracyPct: 80.0,
        pointsPerMatch: 8.4,
      }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Loading skeleton state */
export const Loading: Story = {
  args: {
    entries: [],
    currentUserId: CURRENT_USER_ID,
    isLoading: true,
  },
}
