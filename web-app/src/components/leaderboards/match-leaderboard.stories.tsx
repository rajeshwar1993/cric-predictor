import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchLeaderboard } from './match-leaderboard'
import type { MatchLeaderboardEntry } from '@/lib/dal/leaderboards'

const meta = {
  title: 'Leaderboards/MatchLeaderboard',
  component: MatchLeaderboard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatchLeaderboard>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<MatchLeaderboardEntry> & { userId: string }): MatchLeaderboardEntry {
  return {
    predictedCount: 8,
    resolvedCount: 6,
    correctCount: 4,
    pointsEarned: 30,
    rank: 1,
    lastSubmittedAt: '2026-04-10T10:00:00Z',
    displayName: 'Player',
    avatarUrl: null,
    memberStatus: 'approved',
    ...overrides,
  }
}

const CURRENT_USER_ID = 'user-4'

const eightMembers: MatchLeaderboardEntry[] = [
  makeEntry({ userId: 'user-1', rank: 1, displayName: 'Rajesh K', correctCount: 6, pointsEarned: 48 }),
  makeEntry({ userId: 'user-2', rank: 2, displayName: 'Virat K', correctCount: 5, pointsEarned: 42 }),
  makeEntry({ userId: 'user-3', rank: 3, displayName: 'MS Dhoni', correctCount: 5, pointsEarned: 38 }),
  makeEntry({ userId: CURRENT_USER_ID, rank: 4, displayName: 'You', correctCount: 4, pointsEarned: 32 }),
  makeEntry({ userId: 'user-5', rank: 5, displayName: 'Rohit S', correctCount: 3, pointsEarned: 28 }),
  makeEntry({ userId: 'user-6', rank: 6, displayName: 'Jasprit B', correctCount: 3, pointsEarned: 24 }),
  makeEntry({ userId: 'user-7', rank: 7, displayName: 'KL Rahul', correctCount: 2, pointsEarned: 18 }),
  makeEntry({ userId: 'user-8', rank: 8, displayName: 'Hardik P', correctCount: 1, pointsEarned: 12 }),
]

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

/** Default — 8 members ranked */
export const Default: Story = {
  args: {
    entries: eightMembers,
    currentUserId: CURRENT_USER_ID,
  },
}

/** Two members sharing rank 2 */
export const WithTies: Story = {
  args: {
    entries: [
      makeEntry({ userId: 'user-1', rank: 1, displayName: 'Rajesh K', correctCount: 6, pointsEarned: 48 }),
      makeEntry({ userId: 'user-2', rank: 2, displayName: 'Virat K', correctCount: 5, pointsEarned: 42 }),
      makeEntry({ userId: 'user-3', rank: 2, displayName: 'MS Dhoni', correctCount: 5, pointsEarned: 42 }),
      makeEntry({ userId: CURRENT_USER_ID, rank: 4, displayName: 'You', correctCount: 4, pointsEarned: 32 }),
      makeEntry({ userId: 'user-5', rank: 5, displayName: 'Rohit S', correctCount: 3, pointsEarned: 28 }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Current user is #1 */
export const CurrentUserFirst: Story = {
  args: {
    entries: [
      makeEntry({ userId: CURRENT_USER_ID, rank: 1, displayName: 'You', correctCount: 6, pointsEarned: 48 }),
      makeEntry({ userId: 'user-2', rank: 2, displayName: 'Virat K', correctCount: 5, pointsEarned: 42 }),
      makeEntry({ userId: 'user-3', rank: 3, displayName: 'MS Dhoni', correctCount: 4, pointsEarned: 36 }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Current user is #4 */
export const CurrentUserMiddle: Story = {
  args: {
    entries: eightMembers,
    currentUserId: CURRENT_USER_ID,
  },
}

/** Grayed out departed members at bottom */
export const DepartedMembers: Story = {
  args: {
    entries: [
      makeEntry({ userId: 'user-1', rank: 1, displayName: 'Rajesh K', correctCount: 6, pointsEarned: 48 }),
      makeEntry({ userId: CURRENT_USER_ID, rank: 2, displayName: 'You', correctCount: 5, pointsEarned: 42 }),
      makeEntry({ userId: 'user-3', rank: 3, displayName: 'MS Dhoni', correctCount: 4, pointsEarned: 36 }),
      makeEntry({
        userId: 'user-left',
        rank: 4,
        displayName: 'Left Player',
        correctCount: 3,
        pointsEarned: 20,
        memberStatus: 'left',
      }),
      makeEntry({
        userId: 'user-removed',
        rank: 5,
        displayName: 'Removed Player',
        correctCount: 2,
        pointsEarned: 15,
        memberStatus: 'removed',
      }),
    ],
    currentUserId: CURRENT_USER_ID,
  },
}

/** Empty state — no predictions for this match */
export const Empty: Story = {
  args: {
    entries: [],
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

/* ------------------------------------------------------------------ */
/* Share button stories                                                */
/* ------------------------------------------------------------------ */

const shareProps = {
  fixtureStatus: 'resolved' as const,
  gangName: 'The Dugout',
  memberCount: 8,
  gangId: 'gang-123',
  fixtureId: 'fixture-456',
  matchTitle: 'MI vs CSK',
  matchNumber: 32,
}

/** Resolved fixture — share button visible on current user's row */
export const WithShareButtonResolved: Story = {
  args: {
    entries: eightMembers,
    currentUserId: CURRENT_USER_ID,
    ...shareProps,
  },
}

/** Current user is #1 with share button */
export const ShareButtonRank1: Story = {
  args: {
    entries: [
      makeEntry({ userId: CURRENT_USER_ID, rank: 1, displayName: 'You', correctCount: 6, pointsEarned: 48 }),
      makeEntry({ userId: 'user-2', rank: 2, displayName: 'Virat K', correctCount: 5, pointsEarned: 42 }),
      makeEntry({ userId: 'user-3', rank: 3, displayName: 'MS Dhoni', correctCount: 4, pointsEarned: 36 }),
    ],
    currentUserId: CURRENT_USER_ID,
    ...shareProps,
  },
}

/** Live fixture — share button disabled */
export const ShareButtonDisabledLive: Story = {
  args: {
    entries: eightMembers,
    currentUserId: CURRENT_USER_ID,
    ...shareProps,
    fixtureStatus: 'live',
  },
}

/** Completed fixture (not yet resolved) — share button disabled */
export const ShareButtonDisabledCompleted: Story = {
  args: {
    entries: eightMembers,
    currentUserId: CURRENT_USER_ID,
    ...shareProps,
    fixtureStatus: 'completed',
  },
}

/** Departed members don't get share button, even if they are current user */
export const DepartedCurrentUser: Story = {
  args: {
    entries: [
      makeEntry({ userId: 'user-1', rank: 1, displayName: 'Rajesh K', correctCount: 6, pointsEarned: 48 }),
      makeEntry({
        userId: CURRENT_USER_ID,
        rank: 2,
        displayName: 'You',
        correctCount: 5,
        pointsEarned: 42,
        memberStatus: 'left',
      }),
    ],
    currentUserId: CURRENT_USER_ID,
    ...shareProps,
  },
}
