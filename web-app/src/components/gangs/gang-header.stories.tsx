import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GangHeader } from './gang-header'
import type { GangDetails } from '@/lib/dal/gangs'

/**
 * Helper to build a mock GangDetails with sensible defaults.
 */
function mockGang(overrides: Partial<GangDetails> = {}): GangDetails {
  return {
    id: 'gang-001',
    name: 'Mumbai Mavericks',
    inviteCode: 'XK42AB',
    autoAccept: true,
    createdBy: 'user-admin',
    members: [
      {
        userId: 'user-admin',
        role: 'admin',
        status: 'approved',
        isBlocked: false,
        displayName: 'Raj',
        email: 'raj@test.com',
      },
      {
        userId: 'user-2',
        role: 'member',
        status: 'approved',
        isBlocked: false,
        displayName: 'Virat',
        email: 'virat@test.com',
      },
      {
        userId: 'user-3',
        role: 'member',
        status: 'approved',
        isBlocked: false,
        displayName: 'Rohit',
        email: 'rohit@test.com',
      },
      {
        userId: 'user-4',
        role: 'member',
        status: 'pending',
        isBlocked: false,
        displayName: 'Pending User',
        email: 'pending@test.com',
      },
    ],
    ...overrides,
  }
}

const meta = {
  title: 'Gangs/GangHeader',
  component: GangHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GangHeader>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Admin — shows settings link + full header                           */
/* ------------------------------------------------------------------ */

export const Admin: Story = {
  args: {
    gang: mockGang(),
    isAdmin: true,
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviterName: 'Raj',
  },
}

/* ------------------------------------------------------------------ */
/* Member — no settings link                                           */
/* ------------------------------------------------------------------ */

export const Member: Story = {
  args: {
    gang: mockGang(),
    isAdmin: false,
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviterName: 'Virat',
  },
}

/* ------------------------------------------------------------------ */
/* LongName — truncation handling                                      */
/* ------------------------------------------------------------------ */

export const LongName: Story = {
  args: {
    gang: mockGang({
      name: 'The Incredibly Super Duper Long Gang Name That Tests Overflow And Wrapping',
    }),
    isAdmin: true,
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviterName: 'Raj',
  },
}

/* ------------------------------------------------------------------ */
/* FullGang — "20/20 members"                                          */
/* ------------------------------------------------------------------ */

export const FullGang: Story = {
  args: {
    gang: mockGang({
      members: Array.from({ length: 20 }, (_, i) => ({
        userId: `user-${i}`,
        role: i === 0 ? ('admin' as const) : ('member' as const),
        status: 'approved' as const,
        isBlocked: false,
        displayName: `Player ${i + 1}`,
        email: `player${i + 1}@test.com`,
      })),
    }),
    isAdmin: true,
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviterName: 'Player 1',
  },
}
