import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MemberList } from './member-list'
import type { GangDetailMember } from '@/lib/dal/gangs'
import type { GangStandingEntry } from '@/lib/dal/leaderboards'

// ---------------------------------------------------------------------------
// Story helpers
// ---------------------------------------------------------------------------

function makeMember(
  overrides: Partial<GangDetailMember> & { userId: string },
): GangDetailMember {
  return {
    displayName: 'Member',
    email: 'member@test.com',
    role: 'member',
    status: 'approved',
    isBlocked: false,
    ...overrides,
  }
}

function makeStanding(
  overrides: Partial<GangStandingEntry> & { userId: string },
): GangStandingEntry {
  return {
    totalPoints: 0,
    matchesPredicted: 0,
    accuracyPct: 0,
    pointsPerMatch: 0,
    rank: null,
    displayName: null,
    avatarUrl: null,
    memberStatus: 'approved',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Gangs/MemberList',
  component: MemberList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberList>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Default — 6 members with varied ranks and points
// ---------------------------------------------------------------------------

const defaultMembers: GangDetailMember[] = [
  makeMember({ userId: 'user-1', displayName: 'Rajesh K', email: 'raj@test.com', role: 'admin' }),
  makeMember({ userId: 'user-2', displayName: 'Virat K', email: 'virat@test.com' }),
  makeMember({ userId: 'user-3', displayName: 'MS Dhoni', email: 'dhoni@test.com' }),
  makeMember({ userId: 'user-4', displayName: 'Rohit S', email: 'rohit@test.com' }),
  makeMember({ userId: 'user-5', displayName: 'Jasprit B', email: 'jasprit@test.com' }),
  makeMember({ userId: 'user-6', displayName: 'KL Rahul', email: 'kl@test.com' }),
]

const defaultStandings: GangStandingEntry[] = [
  makeStanding({ userId: 'user-1', totalPoints: 142, matchesPredicted: 18, accuracyPct: 85.5, rank: 1, displayName: 'Rajesh K' }),
  makeStanding({ userId: 'user-2', totalPoints: 138, matchesPredicted: 17, accuracyPct: 82.3, rank: 2, displayName: 'Virat K' }),
  makeStanding({ userId: 'user-3', totalPoints: 126, matchesPredicted: 15, accuracyPct: 78.9, rank: 3, displayName: 'MS Dhoni' }),
  makeStanding({ userId: 'user-4', totalPoints: 110, matchesPredicted: 14, accuracyPct: 73.7, rank: 4, displayName: 'Rohit S' }),
  makeStanding({ userId: 'user-5', totalPoints: 98, matchesPredicted: 12, accuracyPct: 66.7, rank: 5, displayName: 'Jasprit B' }),
  makeStanding({ userId: 'user-6', totalPoints: 87, matchesPredicted: 10, accuracyPct: 60.0, rank: 6, displayName: 'KL Rahul' }),
]

export const Default: Story = {
  args: {
    members: defaultMembers,
    standings: defaultStandings,
    currentUserId: 'user-1',
  },
}

// ---------------------------------------------------------------------------
// CurrentUserHighlighted — user at rank #3
// ---------------------------------------------------------------------------

export const CurrentUserHighlighted: Story = {
  args: {
    members: defaultMembers,
    standings: defaultStandings,
    currentUserId: 'user-3',
  },
}

// ---------------------------------------------------------------------------
// WithDepartedMembers — 2 grayed out members at bottom
// ---------------------------------------------------------------------------

const membersWithDeparted: GangDetailMember[] = [
  makeMember({ userId: 'user-1', displayName: 'Rajesh K', email: 'raj@test.com', role: 'admin' }),
  makeMember({ userId: 'user-2', displayName: 'Virat K', email: 'virat@test.com' }),
  makeMember({ userId: 'user-3', displayName: 'MS Dhoni', email: 'dhoni@test.com' }),
  makeMember({ userId: 'user-4', displayName: 'Rohit S', email: 'rohit@test.com' }),
  makeMember({ userId: 'user-5', displayName: 'Former Player 1', email: 'former1@test.com', status: 'left' }),
  makeMember({ userId: 'user-6', displayName: 'Former Player 2', email: 'former2@test.com', status: 'removed' }),
]

const standingsWithDeparted: GangStandingEntry[] = [
  makeStanding({ userId: 'user-1', totalPoints: 142, matchesPredicted: 18, accuracyPct: 85.5, rank: 1, displayName: 'Rajesh K' }),
  makeStanding({ userId: 'user-2', totalPoints: 138, matchesPredicted: 17, accuracyPct: 82.3, rank: 2, displayName: 'Virat K' }),
  makeStanding({ userId: 'user-3', totalPoints: 126, matchesPredicted: 15, accuracyPct: 78.9, rank: 3, displayName: 'MS Dhoni' }),
  makeStanding({ userId: 'user-4', totalPoints: 110, matchesPredicted: 14, accuracyPct: 73.7, rank: 4, displayName: 'Rohit S' }),
  makeStanding({ userId: 'user-5', totalPoints: 45, matchesPredicted: 6, accuracyPct: 50.0, rank: 5, displayName: 'Former Player 1' }),
  makeStanding({ userId: 'user-6', totalPoints: 30, matchesPredicted: 4, accuracyPct: 40.0, rank: 6, displayName: 'Former Player 2' }),
]

export const WithDepartedMembers: Story = {
  args: {
    members: membersWithDeparted,
    standings: standingsWithDeparted,
    currentUserId: 'user-1',
  },
}

// ---------------------------------------------------------------------------
// SingleMember — just the admin (new gang)
// ---------------------------------------------------------------------------

export const SingleMember: Story = {
  args: {
    members: [
      makeMember({ userId: 'user-1', displayName: 'Rajesh K', email: 'raj@test.com', role: 'admin' }),
    ],
    standings: [],
    currentUserId: 'user-1',
  },
}

// ---------------------------------------------------------------------------
// MixedRankedAndUnranked — some members ranked, some unranked (dash), departed with dash
// ---------------------------------------------------------------------------

const mixedMembers: GangDetailMember[] = [
  makeMember({ userId: 'user-1', displayName: 'Rajesh K', email: 'raj@test.com', role: 'admin' }),
  makeMember({ userId: 'user-2', displayName: 'Virat K', email: 'virat@test.com' }),
  makeMember({ userId: 'user-3', displayName: 'MS Dhoni', email: 'dhoni@test.com' }),
  makeMember({ userId: 'user-4', displayName: 'New Joiner', email: 'new@test.com' }),
  makeMember({ userId: 'user-5', displayName: 'Former Player', email: 'former@test.com', status: 'left' }),
]

const mixedStandings: GangStandingEntry[] = [
  makeStanding({ userId: 'user-1', totalPoints: 142, matchesPredicted: 18, accuracyPct: 85.5, rank: 1, displayName: 'Rajesh K' }),
  makeStanding({ userId: 'user-2', totalPoints: 138, matchesPredicted: 17, accuracyPct: 82.3, rank: 2, displayName: 'Virat K' }),
  makeStanding({ userId: 'user-3', totalPoints: 126, matchesPredicted: 15, accuracyPct: 78.9, rank: 3, displayName: 'MS Dhoni' }),
  // user-4 and user-5 have no standings — will show "—" for rank
]

export const MixedRankedAndUnranked: Story = {
  args: {
    members: mixedMembers,
    standings: mixedStandings,
    currentUserId: 'user-1',
  },
}

// ---------------------------------------------------------------------------
// NoStandings — all members show 0 points and dash for rank
// ---------------------------------------------------------------------------

export const NoStandings: Story = {
  args: {
    members: defaultMembers,
    standings: [],
    currentUserId: 'user-1',
  },
}
